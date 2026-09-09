<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

$barcode = $_POST['barcode'] ?? '';
$owner   = $_POST['owner'] ?? '';
if (!$barcode || !$owner || !isset($_FILES['image'])) {
    echo json_encode(['success' => false, 'error' => 'بيانات ناقصة']);
    exit;
}

$file = $_FILES['image'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'error' => 'خطأ في رفع الصورة']);
    exit;
}

$ext = 'jpg';
$filename = $owner . '_' . $barcode . '_' . time() . '.' . $ext;
$dest = UPLOAD_DIR . $filename;

if (!move_uploaded_file($file['tmp_name'], $dest)) {
    echo json_encode(['success' => false, 'error' => 'فشل حفظ الملف']);
    exit;
}

$image_path = 'uploads/' . $filename;
$device = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';

$conn = getDB();
$stmt = $conn->prepare("INSERT INTO products (owner_id, barcode, image_name, image_path, status, device_name)
                        VALUES (?, ?, ?, ?, 'Captured', ?)
                        ON DUPLICATE KEY UPDATE image_path = VALUES(image_path), status = 'Captured'");
$stmt->bind_param("sssss", $owner, $barcode, $filename, $image_path, $device);
$success = $stmt->execute();
$stmt->close();
$conn->close();

if ($success) {
    echo json_encode(['success' => true, 'image_path' => $image_path]);
} else {
    echo json_encode(['success' => false, 'error' => 'فشل حفظ في قاعدة البيانات']);
}