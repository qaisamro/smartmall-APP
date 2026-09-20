<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

$barcode = $_GET['barcode'] ?? '';
$owner   = $_GET['owner'] ?? '';
if (!$barcode || !$owner) {
    echo json_encode(['exists' => false, 'error' => 'البيانات ناقصة']);
    exit;
}

$conn = getDB();
if (!$conn) {
    echo json_encode(['exists' => false, 'error' => 'فشل الاتصال']);
    exit;
}

// تحقق هل المنتج مسجل لهذا المالك
$stmt = $conn->prepare("SELECT id, image_path FROM products WHERE barcode = ? AND owner_id = ?");
$stmt->bind_param("ss", $barcode, $owner);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    echo json_encode([
        'exists' => true,
        'id' => $row['id'],
        'image_path' => $row['image_path']
    ]);
} else {
    echo json_encode(['exists' => false]);
}

$stmt->close();
$conn->close();