<?php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'product_scanner');
define('UPLOAD_DIR', __DIR__ . '/../uploads/');

function getDB() {
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($conn->connect_error) throw new Exception($conn->connect_error);
        $conn->set_charset("utf8mb4");
        return $conn;
    } catch (Exception $e) {
        error_log("DB: " . $e->getMessage());
        return null;
    }
}