<?php
session_start();
if (!isset($_SESSION['admin_id'])) {
    header('Location: admin.php');
    exit;
}
require_once 'php/db.php';

$owner_id = $_GET['owner'] ?? '';
if (!$owner_id) { echo 'لا يوجد مالك'; exit; }

$conn = getDB();
$stmt = $conn->prepare("SELECT * FROM owners WHERE owner_id = ?");
$stmt->bind_param("s", $owner_id);
$stmt->execute();
$owner = $stmt->get_result()->fetch_assoc();
if (!$owner) { echo 'المالك غير موجود'; exit; }

$site_url = 'http://localhost/product-scanner/';
$qr_data  = $site_url . '?owner=' . $owner_id;
?>
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>QR - <?= htmlspecialchars($owner['store_name']) ?></title>
<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:system-ui; background:#f0f2f5; display:flex; justify-content:center; align-items:center; min-height:100vh; padding:20px; }
.card { background:#fff; border-radius:16px; padding:35px; text-align:center; box-shadow:0 4px 20px rgba(0,0,0,0.1); max-width:400px; width:100%; }

.barcode-icon { margin:5px auto 10px; width:110px; height:28px; display:flex; align-items:flex-end; justify-content:center; gap:3px; }
.bar { background:#000; width:4px; border-radius:2px 2px 0 0; height:20px; }
.bar:nth-child(odd) { height:26px; width:5px; }
.bar:nth-child(3n) { height:14px; width:3px; }
.bar:nth-child(5n+2) { height:28px; width:6px; }

.qr-wrap { display:flex; justify-content:center; margin:12px 0; }
.qr-wrap canvas { width:200px !important; height:200px !important; }

.store { font-size:22px; font-weight:700; color:#1a1a2e; margin-bottom:3px; }
.owner { font-size:15px; color:#888; margin-bottom:8px; }
.id { font-size:12px; color:#aaa; direction:ltr; margin-bottom:12px; }
.phone { font-size:13px; color:#666; margin-bottom:5px; }
.line { border-top:2px dashed #ddd; margin:12px 0; }

.label { font-size:18px; font-weight:700; color:#1a1a2e; background:#f8f9fa; padding:12px; border-radius:8px; border:2px dashed #0f3460; margin-top:10px; line-height:1.6; }
.instructions { font-size:13px; color:#888; margin-top:10px; line-height:1.5; }

.btn { display:inline-block; margin-top:18px; padding:12px 30px; background:#1a1a2e; color:#fff; border:none; border-radius:8px; font-size:16px; cursor:pointer; text-decoration:none; }
.btn:hover { background:#16213e; }
.btn-back { background:#666; margin-left:6px; }
.toolbar { margin-top:15px; }

@media print {
    body { background:#fff; padding:0; }
    .card { box-shadow:none; border:1px solid #ddd; padding:25px; }
    .toolbar { display:none; }
    .no-print { display:none; }
}
</style>
</head>
<body>

<div class="card">
    <div class="barcode-icon">
        <div class="bar"></div><div class="bar"></div><div class="bar"></div>
        <div class="bar"></div><div class="bar"></div><div class="bar"></div>
        <div class="bar"></div><div class="bar"></div><div class="bar"></div>
        <div class="bar"></div><div class="bar"></div><div class="bar"></div>
        <div class="bar"></div><div class="bar"></div><div class="bar"></div>
        <div class="bar"></div><div class="bar"></div><div class="bar"></div>
        <div class="bar"></div><div class="bar"></div>
    </div>

    <div class="store">🏪 <?= htmlspecialchars($owner['store_name']) ?></div>
    <div class="owner">👤 <?= htmlspecialchars($owner['owner_name']) ?></div>
    <?php if ($owner['phone']): ?><div class="phone">📞 <?= htmlspecialchars($owner['phone']) ?></div><?php endif; ?>
    <div class="id"><?= $owner_id ?></div>

    <div class="qr-wrap" id="qrcode"></div>

    <div class="line"></div>

    <div class="label">
        📲 امسح واكد بيعك<br>
        ✅ لمنتجات <?= htmlspecialchars($owner['store_name']) ?>
    </div>

    <div class="instructions">
        1. وجّه الكاميرا للباركود على المنتج<br>
        2. التقط صورة للمنتج<br>
        3. تم الحفظ تلقائياً
    </div>
</div>

<div class="toolbar no-print">
    <a href="dashboard.php" class="btn btn-back">⬅ رجوع</a>
    <button class="btn" onclick="window.print()">🖨️ طباعة</button>
</div>

<script>
new QRCode(document.getElementById('qrcode'), {
    text: '<?= $qr_data ?>',
    width: 200,
    height: 200,
    colorDark: '#1a1a2e',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
});
</script>

</body>
</html>