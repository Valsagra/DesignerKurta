
<?php
header('Content-Type: application/json');

try {
    require_once __DIR__ . '/../config/database.php';

    $sql = "
        SELECT
            o.OrderNo,
            o.CustomerID,
            o.OrderDate,
            o.PriceTotal,
            o.Address,
            o.Status,
            CONCAT_WS(' ',
                c.FirstName,
                c.LastName
            ) AS CustomerName,
            c.Email
        FROM Orders o
        LEFT JOIN Customer c
            ON o.CustomerID = c.CustomerID
        WHERE COALESCE(o.IsDeleted, 0) = 0
        ORDER BY o.OrderDate DESC, o.OrderNo DESC
    ";

    $stmt = $pdo->query($sql);

    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));

} catch (PDOException $e) {
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Unable to load orders']);
}
