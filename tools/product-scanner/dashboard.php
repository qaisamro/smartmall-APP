<?php
session_start();
if (!isset($_SESSION['admin_id'])) {
    header('Location: admin.php');
    exit;
}
require_once 'php/db.php';

$conn = getDB();

// ===== حذف مالك =====
if (isset($_GET['delete'])) {
    $owner_id = $_GET['delete'];
    $conn->query("DELETE FROM owners WHERE owner_id = '$owner_id'");
    header('Location: dashboard.php');
    exit;
}

// ===== إضافة مالك جديد =====
$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_owner'])) {
    $owner_name = $_POST['owner_name'];
    $store_name = $_POST['store_name'];
    $phone      = $_POST['phone'];
    $address    = $_POST['address'];
    $owner_id   = 'OWN_' . strtoupper(substr(md5(uniqid()), 0, 8));

    // إنشاء رابط QR
    $site_url = 'http://localhost/product-scanner/';
    $qr_data  = $site_url . '?owner=' . $owner_id;

    $stmt = $conn->prepare("INSERT INTO owners (owner_name, store_name, phone, address, owner_id) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sssss", $owner_name, $store_name, $phone, $address, $owner_id);
    if ($stmt->execute()) {
        $msg = '✅ تم إضافة المالك بنجاح';
    } else {
        $msg = '❌ فشل الإضافة: ' . $conn->error;
    }
    $stmt->close();
}

// ===== جلب جميع المالكين =====
$owners = $conn->query("SELECT * FROM owners ORDER BY created_at DESC");
?>
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>لوحة التحكم - المالكين</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:system-ui; background:#f0f2f5; padding:20px; }
.header { background:#1a1a2e; color:#fff; padding:20px 30px; border-radius:14px; display:flex; justify-content:space-between; align-items:center; margin-bottom:25px; flex-wrap:wrap; gap:10px; }
.header h1 { font-size:22px; }
.header a { color:#fff; text-decoration:none; padding:8px 18px; border-radius:8px; font-size:14px; }
.header .logout { background:#e94560; }

.grid { display:flex; gap:25px; flex-wrap:wrap; }

/* ===== فورم الإضافة ===== */
.add-card { background:#fff; border-radius:14px; padding:25px; width:340px; box-shadow:0 2px 12px rgba(0,0,0,0.06); height:fit-content; }
.add-card h2 { font-size:18px; margin-bottom:15px; color:#1a1a2e; }
.add-card input, .add-card textarea { width:100%; padding:12px; margin-bottom:10px; border:2px solid #eee; border-radius:8px; font-size:15px; text-align:right; }
.add-card textarea { height:60px; resize:none; }
.add-card input:focus, .add-card textarea:focus { border-color:#1a1a2e; outline:none; }
.add-card button { width:100%; padding:12px; background:#1a1a2e; color:#fff; border:none; border-radius:8px; font-size:16px; cursor:pointer; }
.add-card button:hover { background:#16213e; }
.msg { background:#d4edda; color:#155724; padding:10px; border-radius:8px; margin-bottom:12px; font-size:14px; text-align:center; }

/* ===== قائمة المالكين ===== */
.list-card { flex:1; min-width:500px; background:#fff; border-radius:14px; padding:25px; box-shadow:0 2px 12px rgba(0,0,0,0.06); }
.list-card h2 { font-size:18px; margin-bottom:15px; color:#1a1a2e; }
table { width:100%; border-collapse:collapse; font-size:14px; }
th { background:#f8f9fa; padding:12px; text-align:center; border-bottom:2px solid #dee2e6; }
td { padding:12px; text-align:center; border-bottom:1px solid #eee; }
tr:hover { background:#f8f9fa; }
.btn { display:inline-block; padding:6px 14px; border-radius:6px; text-decoration:none; font-size:13px; }
.btn-qr { background:#1a8fe0; color:#fff; }
.btn-print { background:#11998e; color:#fff; }
.btn-del { background:#e94560; color:#fff; }
.empty { color:#999; text-align:center; padding:30px; }
</style>
</head>
<body>

<div class="header">
    <h1>📋 لوحة التحكم — المالكين</h1>
    <div>
        <a href="print-qr.html" style="background:#11998e;margin-left:8px;">🖨️ طباعة QR</a>
        <a href="logout.php" class="logout">🚪 خروج</a>
    </div>
</div>

<?php if ($msg): ?><div class="msg"><?= $msg ?></div><?php endif; ?>

<div class="grid">
    <!-- ===== فورم إضافة مالك ===== -->
    <div class="add-card">
        <h2>➕ إضافة مالك جديد</h2>
        <form method="POST">
            <input type="text" name="owner_name" placeholder="👤 اسم المالك" required>
            <input type="text" name="store_name" placeholder="🏪 اسم المول / السوبرماركت" required>
            <input type="text" name="phone" placeholder="📞 رقم الهاتف" dir="ltr">
            <textarea name="address" placeholder="📍 العنوان"></textarea>
            <input type="hidden" name="add_owner" value="1">
            <button type="submit">✅ إضافة المالك</button>
        </form>
    </div>

    <!-- ===== قائمة المالكين ===== -->
    <div class="list-card">
        <h2>📌 المالكين المسجلين</h2>
        <?php if ($owners && $owners->num_rows > 0): ?>
        <table>
            <tr>
                <th>#</th>
                <th>👤 المالك</th>
                <th>🏪 المتجر</th>
                <th>🔑 الكود</th>
                <th>📱</th>
                <th>📅</th>
                <th>📲 QR</th>
            </tr>
            <?php $i = 1; while ($o = $owners->fetch_assoc()): ?>
            <tr>
                <td><?= $i++ ?></td>
                <td><strong><?= htmlspecialchars($o['owner_name']) ?></strong></td>
                <td><?= htmlspecialchars($o['store_name']) ?></td>
                <td style="direction:ltr;font-size:12px;color:#666;"><?= $o['owner_id'] ?></td>
                <td><?= $o['phone'] ? htmlspecialchars($o['phone']) : '—' ?></td>
                <td style="font-size:12px;color:#888;"><?= date('Y-m-d', strtotime($o['created_at'])) ?></td>
                <td>
                    <a href="generate_qr.php?owner=<?= $o['owner_id'] ?>" class="btn btn-qr" target="_blank">📲 QR</a>
                    <a href="?delete=<?= $o['owner_id'] ?>" class="btn btn-del" onclick="return confirm('حذف <?= htmlspecialchars($o['store_name']) ?>؟')">✕</a>
                </td>
            </tr>
            <?php endwhile; ?>
        </table>
        <?php else: ?>
        <div class="empty">🚫 لا يوجد مالكين بعد. أضف أول مالك من الجهة اليسرى.</div>
        <?php endif; ?>
    </div>
</div>

</body>
</html>