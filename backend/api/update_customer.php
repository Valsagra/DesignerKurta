
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

    $id = filter_var(
        $data['CustomerID'] ?? null,
        FILTER_VALIDATE_INT
    );

    $firstName = trim($data['FirstName'] ?? '');
    $middleName = trim($data['MiddleName'] ?? '');
    $lastName = trim($data['LastName'] ?? '');
    $email = trim($data['Email'] ?? '');
    $address = trim($data['Address'] ?? '');

    if (
        $id === false || $id === null || $id <= 0 ||
        $firstName === '' ||
        $lastName === '' ||
        $email === '' ||
        !filter_var($email, FILTER_VALIDATE_EMAIL)
    ) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid customer information']);
        exit;
    }

    if (
        strlen($firstName) > 50 ||
        strlen($middleName) > 50 ||
        strlen($lastName) > 50 ||
        strlen($email) > 100 ||
        strlen($address) > 255
    ) {
        http_response_code(400);
        echo json_encode(['error' => 'One or more fields are too long']);
        exit;
    }

    $stmt = $pdo->prepare("
        UPDATE Customer
        SET FirstName = :firstName,
            MiddleName = :middleName,
            LastName = :lastName,
            Address = :address,
            Email = :email
        WHERE CustomerID = :id
          AND COALESCE(IsDeleted, 0) = 0
    ");

    $stmt->execute([
        ':firstName' => $firstName,
        ':middleName' => $middleName ?: null,
        ':lastName' => $lastName,
        ':address' => $address ?: null,
        ':email' => $email,
        ':id' => $id
    ]);

    $check = $pdo->prepare("
        SELECT CustomerID
        FROM Customer
        WHERE CustomerID = :id
          AND COALESCE(IsDeleted, 0) = 0
    ");

    $check->execute([':id' => $id]);

    if (!$check->fetch()) {
        http_response_code(404);
        echo json_encode(['error' => 'Customer not found']);
        exit;
    }

    echo json_encode(['message' => 'Customer updated successfully']);

} catch (PDOException $e) {
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Unable to update customer']);
}

