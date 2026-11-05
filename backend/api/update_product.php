
<?php

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    require_once __DIR__ . '/../config/database.php';

    $data = json_decode(
        file_get_contents('php://input'),
        true
    );

    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
        exit;
    }

    $id = filter_var(
        $data['ListingID'] ?? null,
        FILTER_VALIDATE_INT
    );

    $title = trim($data['Title'] ?? '');
    $description = trim($data['Description'] ?? '');
    $size = trim($data['Size'] ?? '');

    $price = filter_var(
        $data['Price'] ?? null,
        FILTER_VALIDATE_FLOAT
    );

    $quantity = filter_var(
        $data['QuantityAvailable'] ?? null,
        FILTER_VALIDATE_INT
    );

    if (
        $id === false || $id === null || $id <= 0 ||
        $title === '' ||
        $size === '' ||
        $price === false || $price === null || $price < 0 ||
        $quantity === false || $quantity === null || $quantity < 0
    ) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Invalid product information'
        ]);
        exit;
    }

    $sql = "UPDATE Listing
            SET Title = :title,
                Description = :description,
                Size = :size,
                Price = :price,
                QuantityAvailable = :quantity
            WHERE ListingID = :id
              AND IsDeleted = 0";

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ':title' => $title,
        ':description' => $description,
        ':size' => $size,
        ':price' => $price,
        ':quantity' => $quantity,
        ':id' => $id
    ]);

    $check = $pdo->prepare(
        "SELECT ListingID
         FROM Listing
         WHERE ListingID = :id
           AND IsDeleted = 0"
    );

    $check->execute([':id' => $id]);

    if (!$check->fetch()) {
        http_response_code(404);
        echo json_encode([
            'error' => 'Product not found'
        ]);
        exit;
    }

    echo json_encode([
        'message' => 'Product updated successfully'
    ]);

} catch (PDOException $e) {
    error_log($e->getMessage());

    http_response_code(500);

    echo json_encode([
        'error' => 'Database operation failed'
    ]);
}
