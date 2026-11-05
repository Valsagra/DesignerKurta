
<?php

$host = "127.0.0.1";
$dbname = "designerkurta";
$username = "root";
$password = getenv("DB_PASSWORD") ?: "";

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );

} catch (PDOException $e) {
    error_log($e->getMessage());
    http_response_code(500);
    exit("Database connection failed.");
}
