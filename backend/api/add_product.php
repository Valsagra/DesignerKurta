
<?php

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    require_once __DIR__ . '/../config/database.php';

    $data = json_decode(file_get_contents('php://input'), true);

    if (!is_array($data)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
        exit;
    }

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
        $title === '' ||
        $size === '' ||
        $price === false ||
        $price < 0 ||
        $quantity === false ||
        $quantity < 0
    ) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid product information']);
        exit;
    }

    $sql = "INSERT INTO Listing
            (Title, Description, Size, Price,
             QuantityAvailable, IsDeleted)
            VALUES
            (:title, :description, :size, :price,
             :quantity, 0)";

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        ':title' => $title,
        ':description' => $description,
        ':size' => $size,
        ':price' => $price,
        ':quantity' => $quantity
    ]);

    http_response_code(201);

    echo json_encode([
        'message' => 'Product added successfully',
        'ListingID' => $pdo->lastInsertId()
    ]);

} catch (PDOException $e) {
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database operation failed']);
}
