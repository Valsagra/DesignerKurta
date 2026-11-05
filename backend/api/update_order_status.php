
<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
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

    $orderNo = filter_var(
        $data['OrderNo'] ?? null,
        FILTER_VALIDATE_INT
    );

    $status = $data['Status'] ?? null;

    $allowedStatuses = [
        'Pending',
        'Processing',
        'Shipped',
        'In-Transit',
        'Delivered',
        'Cancelled'
    ];

    if (
        $orderNo === false ||
        $orderNo === null ||
        $orderNo <= 0 ||
        !in_array($status, $allowedStatuses, true)
    ) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid order information']);
        exit;
    }

    $stmt = $pdo->prepare("
        UPDATE Orders
        SET Status = :status
        WHERE OrderNo = :orderNo
          AND COALESCE(IsDeleted, 0) = 0
    ");

    $stmt->execute([
        ':status' => $status,
        ':orderNo' => $orderNo
    ]);

    $check = $pdo->prepare("
        SELECT OrderNo
        FROM Orders
        WHERE OrderNo = :orderNo
          AND COALESCE(IsDeleted, 0) = 0
    ");

    $check->execute([':orderNo' => $orderNo]);

    if (!$check->fetch()) {
        http_response_code(404);
        echo json_encode(['error' => 'Order not found']);
        exit;
    }

    echo json_encode(['message' => 'Order status updated']);

} catch (PDOException $e) {
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Unable to update order']);
}
