
<?php
header('Content-Type: application/json');

try {
    require_once __DIR__ . '/../config/database.php';

    $sql = "
        SELECT
            CustomerID,
            FirstName,
            MiddleName,
            LastName,
            Address,
            Email
        FROM Customer
        WHERE COALESCE(IsDeleted, 0) = 0
        ORDER BY CustomerID DESC
    ";

    $stmt = $pdo->query($sql);

    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));

} catch (PDOException $e) {
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Unable to load customers']);
}
