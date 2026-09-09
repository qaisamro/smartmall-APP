<?php
session_start();
require_once 'php/db.php';

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    $conn = getDB();
    if ($conn) {
        $stmt = $conn->prepare("SELECT id, password FROM admins WHERE username = ?");
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($row = $result->fetch_assoc()) {
            if (password_verify($password, $row['password'])) {
                $_SESSION['admin_id'] = $row['id'];
                $_SESSION['admin_user'] = $username;
                header('Location: dashboard.php');
                exit;
            }
        }
        $error = '❌ اسم المستخدم أو كلمة السر غلط';
    } else {
        $error = '❌ فشل الاتصال بقاعدة البيانات';
    }
}
?>
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>دخول الأدمن</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:system-ui; background:#1a1a2e; display:flex; justify-content:center; align-items:center; min-height:100vh; }
.card { background:#fff; border-radius:16px; padding:40px; width:380px; box-shadow:0 10px 40px rgba(0,0,0,0.3); text-align:center; }
.card h1 { color:#1a1a2e; margin-bottom:5px; font-size:24px; }
.card p { color:#888; margin-bottom:25px; font-size:14px; }
input { width:100%; padding:14px 16px; margin-bottom:12px; border:2px solid #eee; border-radius:10px; font-size:16px; text-align:right; }
input:focus { border-color:#1a1a2e; outline:none; }
button { width:100%; padding:14px; background:#1a1a2e; color:#fff; border:none; border-radius:10px; font-size:18px; cursor:pointer; }
button:hover { background:#16213e; }
.error { color:#e94560; margin-bottom:12px; font-size:14px; }
</style>
</head>
<body>
<div class="card">
    <h1>🔐 لوحة التحكم</h1>
    <p>الدخول لإدارة أصحاب المولات والسوبرماركت</p>
    <?php if ($error): ?><div class="error"><?= $error ?></div><?php endif; ?>
    <form method="POST">
        <input type="text" name="username" placeholder="👤 اسم المستخدم" required>
        <input type="password" name="password" placeholder="🔑 كلمة السر" required>
        <button type="submit">دخول</button>
    </form>
</div>
</body>
</html>