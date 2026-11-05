
<?php

// Return JSON to the React frontend.
header('Content-Type: application/json; charset=utf-8');

// Prevent PHP warnings from corrupting JSON responses.
// Errors are logged on the PHP server instead.
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// Only allow POST requests.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);

    echo json_encode([
        'error' => 'Method not allowed'
    ]);

    exit;
}

try {

    // Connect to the DesignerKurta database.
    require_once __DIR__ . '/../config/database.php';

    // Read JSON sent by React.
    $data = json_decode(
        file_get_contents('php://input'),
        true
    );

    if (!is_array($data)) {
        http_response_code(400);

        echo json_encode([
            'error' => 'Invalid JSON request'
        ]);

        exit;
    }

    // Get the selected customer.
    $customerId = filter_var(
        $data['CustomerID'] ?? null,
        FILTER_VALIDATE_INT
    );

    // Get the ordered products.
    $items = $data['Items'] ?? null;

    if (
        $customerId === false ||
        $customerId === null ||
        $customerId <= 0 ||
        !is_array($items) ||
        count($items) === 0
    ) {
        http_response_code(400);

        echo json_encode([
            'error' => 'Select a customer and at least one product'
        ]);

        exit;
    }

    // Validate and combine quantities for duplicate products.
    $quantities = [];

    foreach ($items as $item) {

        if (!is_array($item)) {
            throw new DomainException('Invalid order item');
        }

        $listingId = filter_var(
            $item['ListingID'] ?? null,
            FILTER_VALIDATE_INT
        );

        $quantity = filter_var(
            $item['Quantity'] ?? null,
            FILTER_VALIDATE_INT
        );

        if (
            $listingId === false ||
            $listingId === null ||
            $listingId <= 0 ||
            $quantity === false ||
            $quantity === null ||
            $quantity <= 0
        ) {
            throw new DomainException(
                'Each product must have a valid ID and quantity'
            );
        }

        if (!isset($quantities[$listingId])) {
            $quantities[$listingId] = 0;
        }

        $quantities[$listingId] += $quantity;
    }

    // Use a consistent product locking order.
    ksort($quantities, SORT_NUMERIC);

    // Start transaction.
    $pdo->beginTransaction();

    // Verify that the customer exists.
    $customerStmt = $pdo->prepare("
        SELECT CustomerID, Address
        FROM Customer
        WHERE CustomerID = ?
          AND COALESCE(IsDeleted, 0) = 0
        FOR UPDATE
    ");

    $customerStmt->execute([$customerId]);

    $customer = $customerStmt->fetch(PDO::FETCH_ASSOC);

    if (!$customer) {
        throw new DomainException('Customer not found');
    }

    // Prepare product lookup.
    $productStmt = $pdo->prepare("
        SELECT
            ListingID,
            Title,
            Price,
            QuantityAvailable
        FROM Listing
        WHERE ListingID = ?
          AND COALESCE(IsDeleted, 0) = 0
        FOR UPDATE
    ");

    $orderItems = [];

    // Calculate totals in cents to avoid floating-point drift.
    $totalCents = 0;

    foreach ($quantities as $listingId => $quantity) {

        $productStmt->execute([$listingId]);

        $product = $productStmt->fetch(PDO::FETCH_ASSOC);

        if (!$product) {
            throw new DomainException(
                "Product #$listingId was not found"
            );
        }

        $available = (int)$product['QuantityAvailable'];

        if ($quantity > $available) {
            throw new DomainException(
                "Insufficient stock for {$product['Title']}. " .
                "Available: $available, Requested: $quantity"
            );
        }

        $price = (string)$product['Price'];

        if (!preg_match('/^\d+(\.\d{1,2})?$/', $price)) {
            throw new RuntimeException('Invalid product price');
        }

        $priceParts = explode('.', $price);
        $priceCents =
            ((int)$priceParts[0] * 100) +
            (int)str_pad($priceParts[1] ?? '0', 2, '0');

        $totalCents += $priceCents * $quantity;

        $orderItems[] = [
            'ListingID' => (int)$listingId,
            'Quantity' => (int)$quantity,
            'Price' => $price
        ];
    }

    $total = number_format(
        $totalCents / 100,
        2,
        '.',
        ''
    );

    // Create the order.
    $orderStmt = $pdo->prepare("
        INSERT INTO Orders (
            CustomerID,
            OrderDate,
            PriceTotal,
            Address,
            Status,
            IsDeleted
        )
        VALUES (
            ?,
            CURDATE(),
            ?,
            ?,
            'Pending',
            0
        )
    ");

    $orderStmt->execute([
        $customerId,
        $total,
        $customer['Address']
    ]);

    // Get the new order number.
    $orderNo = (int)$pdo->lastInsertId();

    // Prepare the order item INSERT statement.
    $itemStmt = $pdo->prepare("
        INSERT INTO OrderItem (
            OrderNo,
            ListingID,
            Quantity,
            Price
        )
        VALUES (?, ?, ?, ?)
    ");

    // IMPORTANT:
    // Prepare the inventory UPDATE statement before the loop.
    // This fixes the undefined $stockStmt error.
    $stockStmt = $pdo->prepare("
        UPDATE Listing
        SET QuantityAvailable = QuantityAvailable - ?
        WHERE ListingID = ?
          AND COALESCE(IsDeleted, 0) = 0
          AND QuantityAvailable >= ?
    ");

    // Save items and deduct stock.
    foreach ($orderItems as $item) {

        // Insert purchased product into OrderItem.
        $itemStmt->execute([
            $orderNo,
            $item['ListingID'],
            $item['Quantity'],
            $item['Price']
        ]);

        // Deduct purchased quantity from inventory.
        $stockStmt->execute([
            $item['Quantity'],
            $item['ListingID'],
            $item['Quantity']
        ]);

        // Ensure inventory was actually updated.
        if ($stockStmt->rowCount() !== 1) {
            throw new RuntimeException(
                'Inventory update failed for product #' .
                $item['ListingID']
            );
        }

        // Log inventory changes on the PHP server.
        error_log(
            'DesignerKurta order #' . $orderNo .
            ': deducted ' . $item['Quantity'] .
            ' units from product #' . $item['ListingID']
        );
    }

    // Save everything together.
    $pdo->commit();

    // Send success response to React.
    http_response_code(201);

    echo json_encode([
        'message' => 'Order created successfully',
        'OrderNo' => $orderNo,
        'PriceTotal' => $total
    ]);

} catch (DomainException $e) {

    // Undo changes if validation fails.
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(400);

    echo json_encode([
        'error' => $e->getMessage()
    ]);

} catch (Throwable $e) {

    // Undo order and inventory changes if anything fails.
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    // Log technical details without exposing them to users.
    error_log(
        'DesignerKurta create_order.php error: ' .
        $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        'error' => 'Unable to create order'
    ]);
}
