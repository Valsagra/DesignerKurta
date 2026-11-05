
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

    $firstName = trim($data['FirstName'] ?? '');
    $middleName = trim($data['MiddleName'] ?? '');
    $lastName = trim($data['LastName'] ?? '');
    $email = trim($data['Email'] ?? '');
    $address = trim($data['Address'] ?? '');

    if (
        $firstName === '' ||
        $lastName === '' ||
        $email === '' ||
        !filter_var($email, FILTER_VALIDATE_EMAIL)
    ) {
        http_response_code(400);
        echo json_encode(['error' => 'Valid first name, last name and email are required']);
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
        INSERT INTO Customer
        (FirstName, MiddleName, LastName, Address, Email, IsDeleted)
        VALUES
        (:firstName, :middleName, :lastName, :address, :email, 0)
    ");

    $stmt->execute([
        ':firstName' => $firstName,
        ':middleName' => $middleName ?: null,
        ':lastName' => $lastName,
        ':address' => $address ?: null,
        ':email' => $email
    ]);

    http_response_code(201);

    echo json_encode([
        'message' => 'Customer added successfully',
        'CustomerID' => $pdo->lastInsertId()
    ]);

} catch (PDOException $e) {
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Unable to add customer']);
}
