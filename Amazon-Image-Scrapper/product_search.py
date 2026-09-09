"""
Product search using Open Food Facts + Browser (Bing Images) — دقة عالية
استراتيجية: الباركود أولاً (فريد = دقيق) ← ثم Bing بالاسم والباركود
"""
import time
import re
import random
import urllib.parse
import requests
from typing import Optional, Tuple
import threading
from logger import logger
from ai_verifier import AIVerifier

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
except ImportError:
    sync_playwright = None
    logger.warning("pip install playwright && playwright install chromium")


# ─── مواقع المنتجات الموثوقة — يُقبل منها أي رابط صورة ─────────────────────
TRUSTED_PRODUCT_DOMAINS = [
    "openfoodfacts.org", "go-upc.com", "buycott.com", "barcodelookup.com",
    "upcitemdb.com", "amazon.com", "m.media-amazon.com", "images-na.ssl-images-amazon.com",
    "amazon.ae", "amazon.sa", "cdn.shopify.com", "myshopify.com",
    "noon.com", "jumia.com", "souq.com",
    "carrefourksa.com", "carrefouruae.com", "carrefour.com.sa",
    "luluhypermarket.com", "danube.com.sa", "panda.com.sa",
    "tamimimarkets.com", "bindawood.com",
    "instacart.com", "walmart.com", "target.com", "kroger.com",
    "tesco.com", "sainsburys.co.uk", "asda.com",
    "zid.store", "salla.sa", "salla.com",
    "deliveryhero.io", "talabat.com",
    "gsone.com", "gs1.org",
    "images.deliveryhero", "media.zid",
]

# ─── مواقع عشوائية / غير منتجات — يُرفض منها الرابط ───────────────────────
BLOCKED_DOMAINS = [
    "targetoptical.com", "bariany.co.il", "zahraa.mr",
    "nettv4u.com", "arynews.tv", "jurnalnews.co.id",
    "kalender-365.eu", "edurev.gumlet.io", "furaj.ba",
    "paintingsbynumberskit.com", "styl.fm", "photobutmore.de",
    "depositphotos.com", "shutterstock.com", "istockphoto.com",
    "gettyimages.com", "dreamstime.com", "alamy.com", "123rf.com",
    "freepik.com", "vecteezy.com", "adobe.com",
    "twitter.com", "x.com", "facebook.com", "instagram.com",
    "pinterest.com", "pinimg.com", "reddit.com", "imgur.com",
    "youtube.com", "yt3.googleusercontent.com", "ytimg.com",
    "wikipedia.org", "wikimedia.org",
    "byjus.com", "edurev", "studylib",
    "thejbt.com", "pngkey.com",
]


class ProductSearch:
    def __init__(self, config):
        self.config = config
        self.ai_verifier = AIVerifier(getattr(config, 'gemini_api_key', ''))
        self.cache = {}
        self.cache_lock = threading.Lock()
        self.stats = {
            'total_searches': 0,
            'found_images': 0,
            'failed_searches': 0,
            'off_hits': 0,
            'ddg_hits': 0,
        }
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None
        self._init_browser()
        logger.info("ProductSearch initialized")

    def _init_browser(self):
        if sync_playwright is None:
            return
        try:
            self.playwright = sync_playwright().start()
            self.browser = self.playwright.chromium.launch(
                headless=False,
                args=[
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                ]
            )
            self.context = self.browser.new_context(
                viewport={'width': 1366, 'height': 768},
                user_agent=(
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                    'AppleWebKit/537.36 (KHTML, like Gecko) '
                    'Chrome/124.0.0.0 Safari/537.36'
                ),
                locale='en-US',
                timezone_id='America/New_York',
            )
            self.page = self.context.new_page()
            self.page.set_default_timeout(30000)
            logger.info("Browser ready")
        except Exception as e:
            logger.error(f"Browser init failed: {e}")
            self._close_browser()

    def _close_browser(self):
        try:
            if self.page:
                self.page.close()
            if self.context:
                self.context.close()
            if self.browser:
                self.browser.close()
            if self.playwright:
                self.playwright.stop()
        except Exception:
            pass

    # ─────────────────────────────────────────────────────────────────────────
    # نقطة الدخول الرئيسية
    # ─────────────────────────────────────────────────────────────────────────
    def find_image(self, product_name: str, barcode: str) -> Tuple[Optional[str], str, float]:
        self.stats['total_searches'] += 1
        cache_key = f"{barcode}_{product_name[:30]}"

        with self.cache_lock:
            if cache_key in self.cache:
                return self.cache[cache_key]

        bc = re.sub(r"[^0-9]", "", barcode or "")
        clean_name = self._clean_product_name(product_name)
        logger.info(f"Searching: {product_name[:40]} {bc}")

        # ── 1. OpenFoodFacts (الأدق — قاعدة بيانات منتجات) ─────────────────
        if bc and len(bc) >= 6:
            url = self._search_openfoodfacts(bc)
            if url:
                self.stats['off_hits'] += 1
                return self._cache_and_return(cache_key, url, "OPENFOODFACTS", 95.0)

        # ── 2. go-upc.com (مواقع باركود — دقيق جداً) ───────────────────────
        if bc and len(bc) >= 6 and self.page:
            url = self._search_go_upc(bc)
            if url:
                return self._cache_and_return(cache_key, url, "GO_UPC", 92.0)

        # ── 3. DuckDuckGo Images ──────────────────────────────────────────
        if self.page:
            url, real_score = self._search_ddg(clean_name, bc, product_name)
            if url:
                self.stats['ddg_hits'] += 1
                return self._cache_and_return(cache_key, url, "DDG", float(real_score))

        # ── 4. Bing Images ────────────────────────────────────────────────
        if self.page:
            url, real_score = self._search_bing_images(clean_name, bc, product_name)
            if url:
                self.stats['ddg_hits'] += 1
                return self._cache_and_return(cache_key, url, "BING", float(real_score))

        # ── 5. DuckDuckGo Web Search (اختياري، يبحث عن روابط المتاجر ويستخرج الصورة) ──
        if getattr(self.config, 'enable_web_search', False) and self.page:
            url = self._search_ddg_web(clean_name, bc, product_name)
            if url:
                self.stats['ddg_hits'] += 1
                return self._cache_and_return(cache_key, url, "WEB_SEARCH", 82.0)

        # ── فشل ──────────────────────────────────────────────────────────────
        self.stats['failed_searches'] += 1
        with self.cache_lock:
            self.cache[cache_key] = (None, "NOT_FOUND", 0.0)
        logger.warning(f"No image found for: {product_name[:40]}")
        return None, "NOT_FOUND", 0.0

    def _cache_and_return(self, key, url, source, confidence):
        self.stats['found_images'] += 1
        with self.cache_lock:
            self.cache[key] = (url, source, confidence)
        logger.info(f"[{source}] {url[:80]}")
        return url, source, confidence

    # ─────────────────────────────────────────────────────────────────────────
    # OpenFoodFacts
    # ─────────────────────────────────────────────────────────────────────────
    def _search_openfoodfacts(self, barcode: str) -> Optional[str]:
        try:
            url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
            r = requests.get(url, timeout=10)
            if r.status_code == 200:
                data = r.json()
                if data.get('status') == 1:
                    p = data.get('product', {})
                    for field in ['image_front_url', 'image_url', 'image_front_small_url']:
                        img = p.get(field)
                        if img and self._is_valid_image_url(img):
                            return img
            return None
        except Exception as e:
            logger.debug(f"OpenFoodFacts error: {e}")
            return None

    # ─────────────────────────────────────────────────────────────────────────
    # go-upc.com — صفحة منتج بالباركود
    # ─────────────────────────────────────────────────────────────────────────
    def _search_go_upc(self, barcode: str) -> Optional[str]:
        """
        يفتح go-upc.com/{barcode} ويستخرج صورة المنتج.
        الموقع متخصص في بحث الباركود → دقيق جداً.
        """
        if not self.page:
            return None
        try:
            self.page.goto(
                f"https://go-upc.com/barcode/{barcode}",
                wait_until="domcontentloaded",
                timeout=20000,
            )
            time.sleep(1.5)

            url = self.page.evaluate("""
                () => {
                    // صورة المنتج الرئيسية في go-upc
                    const selectors = [
                        'img.product-image',
                        '.product-img img',
                        'img[alt*="product"]',
                        '.product-detail img',
                        'main img',
                    ];
                    for (const sel of selectors) {
                        const el = document.querySelector(sel);
                        if (el && el.src && el.src.startsWith('http') &&
                            !el.src.includes('logo') && !el.src.includes('icon') &&
                            el.naturalWidth > 50) {
                            return el.src;
                        }
                    }
                    return null;
                }
            """)
            if url and self._is_valid_image_url(url) and self._is_product_domain(url):
                return url
            return None
        except Exception as e:
            logger.debug(f"go-upc error: {e}")
            return None

    # ─────────────────────────────────────────────────────────────────────────
    # DuckDuckGo Images
    # ─────────────────────────────────────────────────────────────────────────
    def _search_ddg(self, clean_name: str, bc: str, original_name: str) -> Optional[str]:
        if not self.page:
            return None

        # First attempt: Name + Barcode (very specific)
        query = f"{clean_name} {bc}".strip() if bc else clean_name
        
        try:
            encoded = urllib.parse.quote(query)
            search_url = f"https://duckduckgo.com/?q={encoded}&iax=images&ia=images"
            
            logger.info(f"Navigating to DDG Images: {search_url}")
            self.page.goto(search_url, wait_until="domcontentloaded", timeout=25000)
            time.sleep(2.5)

            # انتظر تحميل الصور المصغرة
            self.page.wait_for_selector(".tile--img, .tile__img, img", timeout=10000)

            # استخراج العناوين والروابط للتحقق من الدقة
            tile_data = self.page.evaluate("""
                () => {
                    const results = [];
                    document.querySelectorAll('.tile--img').forEach(tile => {
                        const a = tile.querySelector('a.tile--img__link');
                        const img = tile.querySelector('img.tile__img');
                        const titleEl = tile.querySelector('.tile--img__title');
                        
                        const url = a ? a.href : (img ? (img.src || img.getAttribute('data-src')) : '');
                        const title = titleEl ? titleEl.innerText : (img ? img.alt : '');
                        
                        if (url) results.push({url: url, title: title});
                    });
                    return results;
                }
            """)
            
            best_url = None
            best_score = -1

            for item in tile_data:
                url_raw = item.get('url', '')
                title = item.get('title', '')
                url = self._extract_from_ddg_url(url_raw) or url_raw

                if not url or not self._is_valid_image_url(url) or self._is_blocked_domain(url):
                    continue

                score, reason = self._validate_image_match(original_name, bc, title, url)
                if score > best_score:
                    # AI يُستدعى فقط للحالات غير المؤكدة (75-89%)
                    # الصور المثالية (90%+) تُقبل مباشرة لتوفير حصة API
                    if self.ai_verifier.enabled and 50 <= score < 90:
                        if not self.ai_verifier.verify_image(url, original_name):
                            continue
                    best_score = score
                    best_url = url
                    
                if score >= 90: # Perfect match found
                    logger.info(f"DDG Perfect match ({reason}): {url[:80]}")
                    return url, score

            if best_score >= 50 and best_url:
                logger.info(f"DDG Best match (Score: {best_score}): {best_url[:80]}")
                return best_url, best_score

            # إذا لم نجد تطابق دقيق عبر الروابط المباشرة، نستخدم النقر
            selectors = ['a.tile--img__link', '.tile--img__media img', 'img.tile__img']
            clicked = False
            for sel in selectors:
                thumb = self.page.query_selector(sel)
                if thumb:
                    try:
                        thumb.scroll_into_view_if_needed()
                        thumb.click()
                        clicked = True
                        break
                    except Exception:
                        pass
            
            if clicked:
                time.sleep(2)
                panel_data = self.page.evaluate("""
                    () => {
                        const img = document.querySelector('.detail__media img, .detail__img img, .js-detail-img');
                        const titleEl = document.querySelector('.detail__title, .detail__body-title, .js-detail-title');
                        return {
                            url: img ? img.src : null,
                            title: titleEl ? titleEl.innerText : ''
                        };
                    }
                """)
                
                panel_url = panel_data.get('url')
                panel_title = panel_data.get('title', '')
                
                if panel_url:
                    extracted = self._extract_from_ddg_url(panel_url) or panel_url
                    if self._is_valid_image_url(extracted) and not self._is_blocked_domain(extracted):
                        score, reason = self._validate_image_match(original_name, bc, panel_title, extracted)
                        if score >= 40:
                            logger.info(f"DDG preview image URL (Score {score}): {extracted[:80]}")
                            try: self.page.keyboard.press("Escape")
                            except: pass
                            return extracted, score

                try: self.page.keyboard.press("Escape")
                except: pass

            return None, 0
        except Exception as e:
            logger.debug(f"DuckDuckGo error: {e}")
            try: self.page.keyboard.press("Escape")
            except: pass
            return None, 0

    def _extract_from_ddg_url(self, url: str) -> Optional[str]:
        """يستخرج الرابط الأصلي من روابط DuckDuckGo المفلترة/المؤقتة"""
        if not url:
            return None
        if 'duckduckgo.com/iu/' in url and 'u=' in url:
            try:
                parsed = urllib.parse.urlparse(url)
                params = urllib.parse.parse_qs(parsed.query)
                if 'u' in params:
                    original = urllib.parse.unquote(params['u'][0])
                    return original
            except Exception:
                pass
        return None

    # ─────────────────────────────────────────────────────────────────────────
    # DuckDuckGo Web Search (البحث في الويب العادي للعثور على صفحة المتجر)
    # ─────────────────────────────────────────────────────────────────────────
    def _search_ddg_web(self, clean_name: str, bc: str, original_name: str) -> Optional[str]:
        if not self.page:
            return None
            
        # يفضل البحث بالباركود أولاً لأنه فريد، ثم الاسم
        query = f"{bc} OR {clean_name}" if bc else clean_name
        
        try:
            encoded = urllib.parse.quote(query)
            search_url = f"https://duckduckgo.com/?q={encoded}&ia=web"
            
            logger.info(f"Navigating to DDG Web Search: {search_url}")
            self.page.goto(search_url, wait_until="domcontentloaded", timeout=25000)
            time.sleep(2)
            
            # استخراج روابط نتائج البحث
            links = self.page.evaluate("""
                () => {
                    const results = [];
                    document.querySelectorAll('a[data-testid="result-title-a"]').forEach(a => {
                        if (a.href) results.push(a.href);
                    });
                    return results;
                }
            """)
            
            for link in links:
                if self._is_product_domain(link):
                    logger.info(f"Found trusted store link via Web Search: {link}")
                    try:
                        self.page.goto(link, wait_until="domcontentloaded", timeout=20000)
                        time.sleep(3)
                        
                        img_url = self.page.evaluate("""
                            () => {
                                // 1. Meta tags (غالباً الأكثر دقة لصور المنتجات)
                                const metaSelectors = [
                                    'meta[property="og:image"]',
                                    'meta[itemprop="image"]',
                                    'meta[name="twitter:image"]'
                                ];
                                for (const sel of metaSelectors) {
                                    const meta = document.querySelector(sel);
                                    if (meta && meta.content && meta.content.startsWith('http')) {
                                        return meta.content;
                                    }
                                }
                                
                                // 2. Product image selectors الشائعة
                                const imgSelectors = [
                                    'img#landingImage',
                                    '.product-image-container img',
                                    '[data-testid="product-image"]',
                                    '.product-main-image img',
                                    'img.primary-image'
                                ];
                                for (const sel of imgSelectors) {
                                    const imgs = document.querySelectorAll(sel);
                                    for(const img of imgs) {
                                        if (img.src && img.src.startsWith('http') && img.naturalWidth > 150) {
                                            return img.src;
                                        }
                                    }
                                }
                                return null;
                            }
                        """)
                        
                        if img_url and self._is_valid_image_url(img_url):
                            # لا نحتاج للتحقق من العنوان لأن الرابط من موقع منتجات موثوق وصفحة خاصة بالمنتج
                            logger.info(f"Extracted image from store page: {img_url[:80]}")
                            return img_url
                    except Exception as e:
                        logger.debug(f"Failed to extract from store {link}: {e}")
                        
            return None
        except Exception as e:
            logger.debug(f"DuckDuckGo Web Search error: {e}")
            return None

    # ─────────────────────────────────────────────────────────────────────────
    # Bing Images
    # ─────────────────────────────────────────────────────────────────────────
    def _search_bing_images(self, clean_name: str, bc: str, original_name: str) -> Optional[str]:
        if not self.page:
            return None

        query = f"{clean_name} {bc}".strip() if bc else clean_name
        
        try:
            encoded = urllib.parse.quote(query)
            self.page.goto(
                f"https://www.bing.com/images/search?q={encoded}&safe=strict",
                wait_until="domcontentloaded",
                timeout=25000,
            )
            time.sleep(2)

            all_items = self.page.evaluate("""
                () => {
                    const results = [];
                    document.querySelectorAll('a.iusc').forEach(a => {
                        try {
                            const m = JSON.parse(a.getAttribute('m') || '{}');
                            const t = a.getAttribute('t') || m.t || '';
                            if (m.murl) results.push({url: m.murl, title: t});
                        } catch(e) {}
                    });
                    return results;
                }
            """)

            best_url = None
            best_score = -1

            for item in all_items:
                url = item.get('url', '')
                title = item.get('title', '')
                
                if not url or not self._is_valid_image_url(url) or self._is_blocked_domain(url):
                    continue

                score, reason = self._validate_image_match(original_name, bc, title, url)
                if score > best_score:
                    # AI يُستدعى فقط للحالات غير المؤكدة (75-89%)
                    if self.ai_verifier.enabled and 50 <= score < 90:
                        if not self.ai_verifier.verify_image(url, original_name):
                            continue
                    best_score = score
                    best_url = url

                if score >= 90:
                    logger.info(f"Bing Perfect match ({reason}): {url[:80]}")
                    return url, score

            if best_score >= 50 and best_url:
                logger.info(f"Bing Best match (Score: {best_score}): {best_url[:80]}")
                return best_url, best_score

            # إذا لم يتم العثور على شيء بدقة مقبولة
            first = self.page.query_selector("a.iusc")
            if first:
                first.click()
                time.sleep(2)

                panel_data = self.page.evaluate("""
                    () => {
                        const img = document.querySelector('#mainImageWindow img, .imgContainer img');
                        const titleEl = document.querySelector('.info .title, .info, .sb_tlst');
                        return {
                            url: img ? img.src : null,
                            title: titleEl ? titleEl.innerText : ''
                        };
                    }
                """)
                
                panel_url = panel_data.get('url')
                panel_title = panel_data.get('title', '')
                
                if panel_url and self._is_valid_image_url(panel_url):
                    score, reason = self._validate_image_match(original_name, bc, panel_title, panel_url)
                    if score >= 40:
                        try: self.page.keyboard.press("Escape")
                        except: pass
                        logger.info(f"Bing panel URL (Score {score}): {panel_url[:80]}")
                        return panel_url, score

                try: self.page.keyboard.press("Escape")
                except: pass

            return None, 0

        except Exception as e:
            logger.debug(f"Bing Images error: {e}")
            try: self.page.keyboard.press("Escape")
            except: pass
            return None, 0

    # ─────────────────────────────────────────────────────────────────────────
    # أدوات التحقق
    # ─────────────────────────────────────────────────────────────────────────
    def _is_product_domain(self, url: str) -> bool:
        """هل الرابط من موقع منتجات موثوق؟"""
        u = url.lower()
        for domain in TRUSTED_PRODUCT_DOMAINS:
            if domain in u:
                return True
        return False

    def _is_blocked_domain(self, url: str) -> bool:
        """هل الرابط من موقع مرفوض؟"""
        u = url.lower()
        for domain in BLOCKED_DOMAINS:
            if domain in u:
                return True
        return False

    def _is_valid_image_url(self, url: str) -> bool:
        if not url or not url.startswith("http"):
            return False
        u = url.lower()
        # امتدادات سيئة
        bad = ['.ico', '.svg', '.gif', 'logo', 'icon', 'banner', 'placeholder',
               'favicon', 'avatar', 'data:image', 'blob:', 'javascript:',
               'pixel', 'loading', 'spinner', 'blank', 'empty',
               'duckduckgo.com', 'bing.com/th', 'amazon-adsystem', 'doubleclick']
        for b in bad:
            if b in u:
                return False
        # امتدادات جيدة
        good = ['.jpg', '.jpeg', '.png', '.webp']
        if any(ext in u for ext in good):
            return True
        # CDN patterns
        cdn = ['amazonaws.com', 'cloudfront.net', 'cdn.', 'images.', 'media.',
               'wp-content/uploads', 'img.', 'pics.', 'static.', 'assets.',
               'product', 'catalog', '/p/']
        return any(c in u for c in cdn)

    # ─────────────────────────────────────────────────────────────────────────
    # دقة وتحليل النصوص والصور
    # ─────────────────────────────────────────────────────────────────────────
    def _clean_product_name(self, name: str) -> str:
        """تنظيف اسم المنتج من الكلمات الزائدة مثل الأوزان والكلمات العامة للحصول على اسم الشركة والمنتج الرئيسي"""
        clean = str(name).replace('*', ' ')
        clean = re.sub(r'\b(منتج|كرتون|حبه|حبة|غم|كغم|مل|لتر|جم|كيلو|عبوة|مغلف|كيس)\b', '', clean)
        clean = re.sub(r'\d+', ' ', clean) # إزالة الأرقام لأنها غالباً أوزان أو كميات
        clean = re.sub(r'\s+', ' ', clean).strip()
        return clean

    def _validate_image_match(self, product_name: str, barcode: str, image_title: str, image_url: str) -> Tuple[int, str]:
        """
        تقييم دقة الصورة (0 إلى 100)
        - الباركود في الرابط أو العنوان → 100 (مضمون 100%)
        - تطابق العلامة التجارية + أكثر من كلمة → نقاط عالية
        - تطابق كلمة واحدة فقط → نقاط منخفضة
        """
        score = 0

        # 1. الباركود = ضمان مطلق
        if barcode and len(barcode) >= 5:
            if barcode in image_title or barcode in image_url:
                return 100, "Barcode in Title/URL"

        is_trusted = self._is_product_domain(image_url)

        def extract_words(text):
            text = re.sub(r'[^\w\s\u0600-\u06FF]', ' ', text.lower())
            stop_words = {'منتج','حبه','كرتون','غم','كغم','لتر','مل','جم','كيلو',
                          'عبوة','حبة','x','g','ml','kg','و','في','من','على','1','2','3'}
            return [w for w in text.split() if w not in stop_words and len(w) > 1]

        p_words = extract_words(product_name)
        t_words_list = extract_words(image_title) if image_title else []
        t_words = set(t_words_list)

        # 2. تحليل الكلمات
        if p_words and t_words:
            p_set = set(p_words)
            overlap = p_set.intersection(t_words)
            match_count = len(overlap)
            match_ratio = match_count / len(p_set)

            # العلامة التجارية عادةً في آخر الاسم (بعد *)
            brand = ""
            if '*' in product_name:
                brand = product_name.split('*')[-1].strip().lower()
            elif p_words:
                brand = p_words[-1]  # آخر كلمة

            brand_matched = brand and brand in t_words

            if brand_matched and match_count >= 2:
                # تطابق العلامة التجارية + كلمتين على الأقل = نتيجة جيدة جداً
                score = 90 if is_trusted else 85
                return min(score, 100), "Brand + Keywords Match"

            elif brand_matched and match_count == 1:
                score = 75 if is_trusted else 65
                return min(score, 100), "Brand Match"

            elif match_count >= 3:
                # 3+ كلمات متطابقة بدون علامة تجارية واضحة
                score = 80 if is_trusted else 70
                return min(score, 100), "Strong Keywords Match"

            elif match_count == 2:
                score = 65 if is_trusted else 55
                return min(score, 100), "Keywords Match"

            elif match_count == 1:
                # كلمة واحدة فقط = ضعيف
                score = 45 if is_trusted else 30
                return min(score, 100), "Weak Match"

        # 3. دومين موثوق فقط بدون تطابق نصي
        if is_trusted:
            return 40, "Trusted Domain Only"

        return 10, "No Match"

    def get_stats(self) -> dict:
        t = self.stats['total_searches']
        f = self.stats['found_images']
        return {
            **self.stats,
            'cache_size': len(self.cache),
            'success_rate': (f / t * 100) if t > 0 else 0.0,
        }

    def clear_cache(self):
        with self.cache_lock:
            self.cache.clear()

    def __del__(self):
        self._close_browser()