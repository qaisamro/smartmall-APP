"""
Image validation using rule-based filtering with improved URL validation
"""
import re
import requests
from PIL import Image
from io import BytesIO
from typing import Tuple, Optional, List, Dict
import numpy as np
from logger import logger
import cv2
from concurrent.futures import ThreadPoolExecutor

class ImageValidator:
    """Validate product images using multiple techniques"""
    
    def __init__(self, config):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
        # ===== Rejection Patterns =====
        self.logo_patterns = [
            r'logo', r'banner', r'advertisement', r'advert', r'promo',
            r'watermark', r'icon', r'screenshot', r'thumbnail',
            r'placeholder', r'default', r'no-image', r'noimage',
            r'coming-soon', r'not-available', r'out-of-stock',
            r'outofstock', r'sold-out', r'soldout'
        ]
        
        self.vector_patterns = [
            r'\.svg', r'\.eps', r'\.ai', r'vector', r'illustration',
            r'graphic', r'clip-art', r'clipart'
        ]
        
        self.ad_domains = [
            'doubleclick.net', 'googleadservices.com', 'adnxs.com',
            'amazon-adsystem.com', 'googlesyndication.com', 'adsrvr.org',
            'adserver.com', 'adzerk.net', 'adsymptotic.com',
            'facebook.com/ads', 'fbcdn.net/ads', 'google.com/ads'
        ]
        
        # ===== Image Format Blacklist =====
        self.rejected_formats = [
            '.ico', '.svg', '.gif', '.bmp', '.tiff', '.tif',
            '.webp', '.psd', '.ai', '.eps', '.raw'
        ]
        
        # ===== Quality Thresholds =====
        self.min_width = getattr(config, 'min_image_width', 80)
        self.min_height = getattr(config, 'min_image_height', 80)
        self.min_resolution = getattr(config, 'min_image_resolution', 6400)
        self.max_size_mb = getattr(config, 'max_image_size_mb', 15)
        
        # ===== Cache =====
        self.validation_cache = {}
        self.url_validation_cache = {}
    
    def _is_valid_image_format(self, url: str) -> bool:
        """
        Check if URL has a valid image format (not icon, svg, etc.)
        """
        url_lower = url.lower()
        
        # رفض الأيقونات (ICO)
        if '.ico' in url_lower or url_lower.endswith('.ico'):
            return False
        
        # رفض SVG
        if '.svg' in url_lower or url_lower.endswith('.svg'):
            return False
        
        # رفض GIF (غالباً شعارات أو إعلانات)
        if '.gif' in url_lower and not any(x in url_lower for x in ['product', 'item']):
            return False
        
        # قبول فقط الصور ذات الامتدادات الجيدة
        valid_extensions = ['.jpg', '.jpeg', '.png', '.webp']
        has_valid_extension = any(ext in url_lower for ext in valid_extensions)
        
        # إذا لم يكن لها امتداد صورة جيد، نتحقق من CDN
        if not has_valid_extension:
            cdn_patterns = [
                'amazonaws.com', 'cloudfront.net', 'cdn.', 
                'images.', 'media.', 'img.', 'static.',
                'product-image', 'product-img'
            ]
            is_cdn = any(pattern in url_lower for pattern in cdn_patterns)
            
            if not is_cdn:
                return False
        
        return True
    
    def validate_url(self, url: str) -> Tuple[bool, str]:
        """
        Validate image URL - رفض الأيقونات والروابط غير الصحيحة
        
        Returns:
            (is_valid, reason)
        """
        if not url:
            return False, "Empty URL"
        
        # التحقق من الكاش
        if url in self.url_validation_cache:
            return self.url_validation_cache[url]
        
        # ===== 1. التحقق من صيغة الملف =====
        if not self._is_valid_image_format(url):
            result = (False, "Invalid format (ICO/SVG/GIF)")
            self.url_validation_cache[url] = result
            return result
        
        # ===== 2. التحقق من SVG والملفات المتجهة =====
        if self.config.reject_svg:
            for pattern in self.vector_patterns:
                if re.search(pattern, url.lower(), re.IGNORECASE):
                    result = (False, "Vector/SVG format")
                    self.url_validation_cache[url] = result
                    return result
        
        # ===== 3. التحقق من الشعارات =====
        if self.config.reject_logos:
            for pattern in self.logo_patterns:
                if re.search(pattern, url.lower(), re.IGNORECASE):
                    result = (False, "Logo/banner pattern")
                    self.url_validation_cache[url] = result
                    return result
        
        # ===== 4. التحقق من نطاقات الإعلانات =====
        if self.config.reject_ads:
            for domain in self.ad_domains:
                if domain in url.lower():
                    result = (False, "Ad domain")
                    self.url_validation_cache[url] = result
                    return result
        
        # ===== 5. التحقق من الروابط القصيرة جداً =====
        if len(url) < 20:
            result = (False, "Too short URL")
            self.url_validation_cache[url] = result
            return result
        
        result = (True, "Valid")
        self.url_validation_cache[url] = result
        return result
    
    def validate_image(self, image_url: str, product_name: str, barcode: str = "") -> Tuple[bool, float, str]:
        """
        Validate downloaded image against product information
        
        Returns:
            (is_valid, confidence_score, reason)
        """
        try:
            cache_key = f"{image_url}_{product_name[:20]}"
            if cache_key in self.validation_cache:
                return self.validation_cache[cache_key]
            
            # ===== التحقق من الرابط أولاً =====
            is_valid_url, url_reason = self.validate_url(image_url)
            if not is_valid_url:
                result = (False, 0, f"URL rejected: {url_reason}")
                self.validation_cache[cache_key] = result
                return result
            
            # ===== تحميل الصورة =====
            response = self.session.get(image_url, timeout=30, stream=True)
            if response.status_code != 200:
                result = (False, 0, f"Download failed: {response.status_code}")
                self.validation_cache[cache_key] = result
                return result
            
            # ===== التحقق من نوع المحتوى =====
            content_type = response.headers.get('content-type', '')
            
            # رفض SVG
            if 'image/svg' in content_type or 'image/svg+xml' in content_type:
                result = (False, 0, "SVG image rejected")
                self.validation_cache[cache_key] = result
                return result
            
            # رفض ICO
            if 'image/x-icon' in content_type or 'image/vnd.microsoft.icon' in content_type:
                result = (False, 0, "ICO image rejected")
                self.validation_cache[cache_key] = result
                return result
            
            # رفض GIF (غالباً شعارات)
            if 'image/gif' in content_type:
                # التحقق من أن الصورة ليست شعاراً
                if 'logo' in image_url.lower() or 'icon' in image_url.lower():
                    result = (False, 0, "GIF logo rejected")
                    self.validation_cache[cache_key] = result
                    return result
            
            if not content_type.startswith('image/'):
                result = (False, 0, f"Not an image: {content_type}")
                self.validation_cache[cache_key] = result
                return result
            
            # ===== التحقق من الحجم =====
            content_length = response.headers.get('content-length')
            if content_length:
                size_kb = int(content_length) / 1024
                size_mb = size_kb / 1024
                
                if size_mb > self.max_size_mb:
                    result = (False, 0, f"Image too large: {size_mb:.1f}MB")
                    self.validation_cache[cache_key] = result
                    return result
                
                if size_kb < 5:
                    result = (False, 0, f"Image too small: {size_kb:.1f}KB")
                    self.validation_cache[cache_key] = result
                    return result
            
            # ===== التحقق من صحة الصورة =====
            try:
                img_data = response.content
                img = Image.open(BytesIO(img_data))
                img.verify()
                
                # إعادة فتح الصورة للمعالجة
                img = Image.open(BytesIO(img_data))
                width, height = img.size
                
                # ===== التحقق من الأبعاد =====
                if width < self.min_width or height < self.min_height:
                    result = (False, 0, f"Small image: {width}x{height}")
                    self.validation_cache[cache_key] = result
                    return result
                
                if width * height < self.min_resolution:
                    result = (False, 0, f"Low resolution: {width}x{height}")
                    self.validation_cache[cache_key] = result
                    return result
                
                # ===== حساب نسبة الثقة =====
                confidence = 70
                
                # نسبة الأبعاد
                ratio = width / height if height > 0 else 1
                if ratio < 0.3 or ratio > 3.0:
                    confidence = 50
                elif ratio < 0.5 or ratio > 2.0:
                    confidence = 65
                
                # التحقق من الخلفية
                bg_percentage = self._check_background(img)
                if bg_percentage > 0.8:
                    confidence = min(confidence, 50)
                elif bg_percentage > 0.6:
                    confidence = min(confidence, 65)
                
                # التحقق من الوضوح
                blur_score = self._detect_blur(img_data)
                if blur_score > 100:
                    confidence = min(confidence, 45)
                elif blur_score > 50:
                    confidence = min(confidence, 60)
                
                # مقارنة اسم المنتج مع رابط الصورة
                name_match = self._compare_with_product_name(image_url, product_name)
                if name_match < 20:
                    confidence = min(confidence, 30)
                elif name_match < 40:
                    confidence = min(confidence, 50)
                else:
                    confidence = (confidence + name_match) / 2
                
                # التحقق من تطابق الباركود
                if barcode and len(barcode) >= 8:
                    barcode_match = self._check_barcode_match(image_url, barcode)
                    confidence = (confidence + barcode_match) / 2
                
                # نسبة الثقة النهائية
                final_score = min(100, max(0, confidence))
                
                # تحديد ما إذا كانت الصورة مقبولة
                is_valid = final_score >= self.config.min_confidence
                
                if is_valid:
                    result = (True, final_score, f"Valid: {final_score:.1f}%")
                else:
                    result = (False, final_score, f"Low confidence: {final_score:.1f}%")
                
                self.validation_cache[cache_key] = result
                return result
                
            except Exception as e:
                result = (False, 0, f"Invalid image: {str(e)}")
                self.validation_cache[cache_key] = result
                return result
            
        except Exception as e:
            result = (False, 0, f"Error: {str(e)}")
            self.validation_cache[cache_key] = result
            return result
    
    def _check_background(self, img) -> float:
        """Check background/white space percentage"""
        try:
            img_array = np.array(img)
            if len(img_array.shape) == 3:
                gray = np.mean(img_array, axis=2)
            else:
                gray = img_array
            
            threshold = 240
            white_pixels = np.sum(gray > threshold)
            total_pixels = gray.size
            
            return white_pixels / total_pixels
        except Exception:
            return 0.5
    
    def _detect_blur(self, image_data: bytes) -> float:
        """Detect image blur using Laplacian variance"""
        try:
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
            if img is None:
                return 50
            
            laplacian = cv2.Laplacian(img, cv2.CV_64F)
            variance = laplacian.var()
            return variance
        except Exception:
            return 50
    
    def _compare_with_product_name(self, image_url: str, product_name: str) -> float:
        """Compare image URL filename with product name"""
        try:
            filename = image_url.split('/')[-1]
            filename = filename.split('?')[0]
            filename = filename.split('#')[0]
            
            # تنظيف الأسماء
            clean_filename = re.sub(r'[^a-zA-Z0-9\s]', ' ', filename)
            clean_product = re.sub(r'[^a-zA-Z0-9\s]', ' ', product_name.lower())
            
            # استخراج الكلمات المفتاحية
            product_keywords = set(clean_product.split())
            file_keywords = set(clean_filename.lower().split())
            
            if not product_keywords or not file_keywords:
                return 50
            
            # حساب التشابه
            overlap = len(product_keywords & file_keywords) / len(product_keywords)
            
            # زيادة النتيجة إذا كان الباركود موجوداً في اسم الملف
            if any(char.isdigit() for char in filename):
                overlap = min(overlap + 0.1, 1.0)
            
            return overlap * 100
        except Exception:
            return 50
    
    def _check_barcode_match(self, image_url: str, barcode: str) -> float:
        """Check if barcode appears in image URL or filename"""
        try:
            if barcode in image_url:
                return 100
            
            filename = image_url.split('/')[-1]
            if barcode in filename:
                return 90
            
            return 50
        except Exception:
            return 50
    
    def validate_batch(self, urls: List[str], product_name: str, barcode: str = "") -> List[Dict]:
        """Validate multiple images in parallel"""
        results = []
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {
                executor.submit(self.validate_image, url, product_name, barcode): url
                for url in urls
            }
            for future in futures:
                url = futures[future]
                try:
                    is_valid, confidence, reason = future.result(timeout=60)
                    results.append({
                        'url': url,
                        'is_valid': is_valid,
                        'confidence': confidence,
                        'reason': reason
                    })
                except Exception as e:
                    results.append({
                        'url': url,
                        'is_valid': False,
                        'confidence': 0,
                        'reason': f"Timeout: {str(e)}"
                    })
        
        results.sort(key=lambda x: x['confidence'], reverse=True)
        return results
    
    def clear_cache(self):
        """Clear validation cache"""
        self.validation_cache.clear()
        self.url_validation_cache.clear()
        logger.debug("Validation cache cleared")
    
    def get_stats(self) -> Dict:
        """Get validation statistics"""
        return {
            'url_cache_size': len(self.url_validation_cache),
            'image_cache_size': len(self.validation_cache),
            'min_confidence': self.config.min_confidence,
            'min_resolution': self.min_resolution
        }