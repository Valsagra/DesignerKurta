
<?php

header("Content-Type: application/json");

require_once __DIR__ . "/../config/database.php";

try {
    $stmt = $pdo->query(
        "SELECT ListingID, Title, Description,
                Size, Price, QuantityAvailable
         FROM Listing
         WHERE IsDeleted = 0"
    );

    $products = $stmt->fetchAll();

    echo json_encode($products);

} catch (PDOException $e) {
    error_log($e->getMessage());
    http_response_code(500);

    echo json_encode([
        "error" => "Failed to retrieve products"
    ]);
}
