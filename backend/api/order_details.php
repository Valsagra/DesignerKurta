
<?php
header('Content-Type: application/json');

try {
    require_once __DIR__ . '/../config/database.php';

    $orderNo = filter_var(
        $_GET['orderNo'] ?? null,
        FILTER_VALIDATE_INT
    );

    if ($orderNo === false || $orderNo === null || $orderNo <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid order number']);
        exit;
    }

    $sql = "
        SELECT
            oi.OrderNo,
            oi.ListingID,
            l.Title,
            oi.Quantity,
            oi.Price,
            (oi.Quantity * oi.Price) AS LineTotal
        FROM OrderItem oi
        LEFT JOIN Listing l
            ON oi.ListingID = l.ListingID
        INNER JOIN Orders o
            ON oi.OrderNo = o.OrderNo
        WHERE oi.OrderNo = :orderNo
          AND COALESCE(o.IsDeleted, 0) = 0
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([':orderNo' => $orderNo]);

    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));

} catch (PDOException $e) {
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Unable to load order details']);
}
