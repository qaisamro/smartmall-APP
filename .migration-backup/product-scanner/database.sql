CREATE DATABASE IF NOT EXISTS product_scanner;
USE product_scanner;

-- ===== جدول المدراء (الأدمن) =====
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== جدول أصحاب المولات والسوبرماركت =====
CREATE TABLE IF NOT EXISTS owners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_name VARCHAR(100) NOT NULL,          -- اسم صاحب المحل
    store_name VARCHAR(200) NOT NULL,           -- اسم المول / السوبرماركت
    phone VARCHAR(20) DEFAULT '',               -- رقم الهاتف
    address VARCHAR(500) DEFAULT '',            -- العنوان
    owner_id VARCHAR(50) UNIQUE NOT NULL,       -- كود فريد لكل مالك (مثلاً MALL_001)
    qr_svg TEXT DEFAULT NULL,                   -- SVG الـ QR
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_owner_id (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== جدول المنتجات (مع owner_id) =====
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id VARCHAR(50) NOT NULL,              -- المنتج تابع لأي مالك
    barcode VARCHAR(50) NOT NULL,
    image_name VARCHAR(255) NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    status ENUM('Captured', 'Pending') DEFAULT 'Captured',
    device_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES owners(owner_id) ON DELETE CASCADE,
    UNIQUE KEY unique_product (owner_id, barcode),
    INDEX idx_barcode (barcode),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== جدول سجل النشاط =====
CREATE TABLE IF NOT EXISTS activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id VARCHAR(50),
    barcode VARCHAR(50),
    action VARCHAR(50),
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== إدخال الأدمن الافتراضي (كلمة السر: admin123) =====
INSERT INTO admins (username, password) VALUES ('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');