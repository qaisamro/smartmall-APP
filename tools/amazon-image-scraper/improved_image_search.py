"""
Improved image search with Google Custom Search API and multiple engines
"""
import requests
from typing import Optional, List, Tuple, Dict
from urllib.parse import quote, urlparse
import re
from bs4 import BeautifulSoup
import json
import time
from logger import logger
from image_validator import ImageValidator
import random
import base64
import hashlib

class ImprovedImageSearch:
    """Enhanced image search with multiple search engines"""
    
    def __init__(self, config):
        self.config = config
        self.validator = ImageValidator(config)
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
        
        # Google Custom Search API (Free tier: 100 searches/day)
        # Get your API key from: https://developers.google.com/custom-search/v1/introduction
        self.google_api_key = ""  # Leave empty to use scraping
        self.google_cse_id = ""   # Leave empty to use scraping
        
        # Cache
        self.search_cache = {}
        self.image_cache = {}
    
    def find_image(self, barcode: str, product_name: str) -> Tuple[Optional[str], str, float]:
        """
        Find and validate image for a product
        """
        logger.debug(f"Searching: {product_name[:40]}... (Barcode: {barcode})")
        
        candidates = []
        search_queries = self._generate_search_queries(product_name, barcode)
        
        # ===== STRATEGY 1: Open Food Facts (Best for barcodes) =====
        if barcode and len(barcode) >= 8:
            url, score = self._search_barcode_openfoodfacts(barcode)
            if url and score >= 50:
                candidates.append((url, "BARCODE_OPENFOODFACTS", score))
        
        # ===== STRATEGY 2: Google Custom Search API (If configured) =====
        if self.google_api_key and self.google_cse_id:
            for query in search_queries[:3]:
                urls = self._search_google_api(query, max_results=5)
                for url in urls:
                    is_valid, score, reason = self.validator.validate_image(url, product_name, barcode)
                    if is_valid and score >= self.config.min_confidence:
                        candidates.append((url, "GOOGLE_API", score))
                        break
                if any(c[1] == "GOOGLE_API" for c in candidates[-3:]):
                    break
        
        # ===== STRATEGY 3: Direct Image Search (Google via HTML) =====
        for query in search_queries[:3]:
            urls = self._search_google_direct(query, max_results=5)
            for url in urls:
                is_valid, score, reason = self.validator.validate_image(url, product_name, barcode)
                if is_valid and score >= self.config.min_confidence:
                    candidates.append((url, "GOOGLE_DIRECT", score))
                    break
            if any(c[1] == "GOOGLE_DIRECT" for c in candidates[-3:]):
                break
        
        # ===== STRATEGY 4: DuckDuckGo Images =====
        for query in search_queries[:3]:
            urls = self._search_duckduckgo_direct(query, max_results=5)
            for url in urls:
                is_valid, score, reason = self.validator.validate_image(url, product_name, barcode)
                if is_valid and score >= self.config.min_confidence:
                    candidates.append((url, "DUCKDUCKGO", score))
                    break
            if any(c[1] == "DUCKDUCKGO" for c in candidates[-3:]):
                break
        
        # ===== STRATEGY 5: Bing Images =====
        for query in search_queries[:2]:
            urls = self._search_bing_direct(query, max_results=3)
            for url in urls:
                is_valid, score, reason = self.validator.validate_image(url, product_name, barcode)
                if is_valid and score >= self.config.min_confidence:
                    candidates.append((url, "BING", score))
                    break
        
        # ===== Remove duplicates =====
        unique_candidates = {}
        for url, method, score in candidates:
            if url not in unique_candidates or unique_candidates[url][2] < score:
                unique_candidates[url] = (url, method, score)
        
        candidates = list(unique_candidates.values())
        candidates.sort(key=lambda x: x[2], reverse=True)
        
        if candidates:
            best_url, best_method, best_score = candidates[0]
            logger.info(f"Found image with {best_score:.1f}% via {best_method}")
            return best_url, best_method, best_score
        
        logger.warning(f"No image found for: {product_name[:40]}")
        return None, "NOT_FOUND", 0
    
    def _search_google_api(self, query: str, max_results: int = 5) -> List[str]:
        """Search using Google Custom Search API"""
        if not self.google_api_key or not self.google_cse_id:
            return []
        
        cache_key = f"google_api_{query}"
        if cache_key in self.search_cache:
            return self.search_cache[cache_key][:max_results]
        
        urls = []
        try:
            url = f"https://www.googleapis.com/customsearch/v1?q={quote(query)}&cx={self.google_cse_id}&searchType=image&key={self.google_api_key}&num={min(max_results, 10)}"
            response = self.session.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                for item in data.get('items', []):
                    img_url = item.get('link')
                    if img_url:
                        urls.append(img_url)
            
            self.search_cache[cache_key] = urls
            return urls[:max_results]
            
        except Exception as e:
            logger.debug(f"Google API error: {e}")
            return []
    
    def _search_google_direct(self, query: str, max_results: int = 5) -> List[str]:
        """Search Google Images directly (HTML scraping)"""
        cache_key = f"google_direct_{query}"
        if cache_key in self.search_cache:
            return self.search_cache[cache_key][:max_results]
        
        urls = []
        try:
            # Use a different approach - search for images via Google's image search
            search_url = f"https://www.google.com/search?q={quote(query)}&tbm=isch&hl=en"
            
            # Rotate user agent
            user_agents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ]
            self.session.headers.update({'User-Agent': random.choice(user_agents)})
            
            response = self.session.get(search_url, timeout=self.config.search_timeout)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Method 1: Find img tags
                img_tags = soup.find_all('img', {'src': True})
                for img in img_tags[:max_results * 3]:
                    src = img.get('src')
                    if src and src.startswith('http') and not src.startswith('data:'):
                        clean_url = src.split('&')[0]
                        clean_url = clean_url.split('?')[0]
                        if clean_url not in urls:
                            urls.append(clean_url)
                
                # Method 2: Extract from JavaScript
                script_tags = soup.find_all('script')
                for script in script_tags:
                    if script.string and '"image_url"' in script.string:
                        try:
                            matches = re.findall(r'"image_url":"([^"]+)"', script.string)
                            for match in matches[:max_results]:
                                clean_url = match.replace('\\/', '/')
                                if clean_url.startswith('http') and clean_url not in urls:
                                    urls.append(clean_url)
                        except:
                            pass
                
                # Method 3: Try to find image URLs in the page
                # Sometimes images are in the page as JSON
                json_patterns = [
                    r'<img[^>]*src="([^"]+)"',
                    r'data-src="([^"]+)"',
                    r'data-image-url="([^"]+)"'
                ]
                
                for pattern in json_patterns:
                    matches = re.findall(pattern, response.text)
                    for match in matches[:max_results]:
                        if match.startswith('http') and match not in urls:
                            urls.append(match)
            
            self.search_cache[cache_key] = urls
            return urls[:max_results]
            
        except Exception as e:
            logger.debug(f"Google direct error: {e}")
            return []
    
    def _search_duckduckgo_direct(self, query: str, max_results: int = 5) -> List[str]:
        """Search DuckDuckGo Images directly"""
        cache_key = f"duckduckgo_{query}"
        if cache_key in self.search_cache:
            return self.search_cache[cache_key][:max_results]
        
        urls = []
        try:
            search_url = f"https://duckduckgo.com/?q={quote(query)}&iax=images&ia=images"
            
            # Rotate user agent
            user_agents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
            ]
            self.session.headers.update({'User-Agent': random.choice(user_agents)})
            
            response = self.session.get(search_url, timeout=self.config.search_timeout)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Find images
                img_tags = soup.find_all('img', {'src': True})
                for img in img_tags[:max_results * 3]:
                    src = img.get('src')
                    if src and src.startswith('http') and not src.startswith('data:'):
                        clean_url = src.split('&')[0]
                        clean_url = clean_url.split('?')[0]
                        if clean_url not in urls:
                            urls.append(clean_url)
                
                # Also check data-src
                img_tags = soup.find_all('img', {'data-src': True})
                for img in img_tags[:max_results * 2]:
                    src = img.get('data-src')
                    if src and src.startswith('http') and not src.startswith('data:'):
                        clean_url = src.split('&')[0]
                        clean_url = clean_url.split('?')[0]
                        if clean_url not in urls:
                            urls.append(clean_url)
            
            self.search_cache[cache_key] = urls
            return urls[:max_results]
            
        except Exception as e:
            logger.debug(f"DuckDuckGo error: {e}")
            return []
    
    def _search_bing_direct(self, query: str, max_results: int = 3) -> List[str]:
        """Search Bing Images directly"""
        cache_key = f"bing_{query}"
        if cache_key in self.search_cache:
            return self.search_cache[cache_key][:max_results]
        
        urls = []
        try:
            search_url = f"https://www.bing.com/images/search?q={quote(query)}"
            
            user_agents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
            ]
            self.session.headers.update({'User-Agent': random.choice(user_agents)})
            
            response = self.session.get(search_url, timeout=self.config.search_timeout)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                img_tags = soup.find_all('img', {'src': True})
                for img in img_tags[:max_results * 3]:
                    src = img.get('src')
                    if src and src.startswith('http') and not src.startswith('data:'):
                        clean_url = src.split('&')[0]
                        clean_url = clean_url.split('?')[0]
                        if clean_url not in urls:
                            urls.append(clean_url)
            
            self.search_cache[cache_key] = urls
            return urls[:max_results]
            
        except Exception as e:
            logger.debug(f"Bing error: {e}")
            return []
    
    def _search_barcode_openfoodfacts(self, barcode: str) -> Tuple[Optional[str], float]:
        """Search using Open Food Facts API"""
        try:
            url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
            response = self.session.get(url, timeout=self.config.search_timeout)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 1:
                    product = data.get('product', {})
                    
                    # Try different image fields
                    image_fields = [
                        'image_front_url',
                        'image_url',
                        'image_front_small_url',
                        'image_nutrition_url',
                        'image_ingredients_url'
                    ]
                    
                    for field in image_fields:
                        img_url = product.get(field)
                        if img_url:
                            is_valid, reason = self.validator.validate_url(img_url)
                            if is_valid:
                                return img_url, 85.0
            
            return None, 0
            
        except Exception as e:
            logger.debug(f"OpenFoodFacts error: {e}")
            return None, 0
    
    def _generate_search_queries(self, product_name: str, barcode: str) -> List[str]:
        """Generate multiple search queries"""
        queries = []
        
        # Original name
        queries.append(product_name)
        
        # Cleaned name
        cleaned = re.sub(r'[^\w\s]', ' ', product_name)
        cleaned = ' '.join(cleaned.split())
        if cleaned != product_name:
            queries.append(cleaned)
        
        # Remove weight/size
        no_size = re.sub(r'\d+\s*(kg|gm|ml|l|g|mg|كغم|غم|لتر|مل)', '', product_name, flags=re.IGNORECASE)
        no_size = ' '.join(no_size.split())
        if no_size != product_name and len(no_size) > 5:
            queries.append(no_size)
        
        # First 3 words
        words = product_name.split()
        if len(words) > 3:
            queries.append(' '.join(words[:3]))
        
        # Name with barcode
        if barcode and len(barcode) >= 8:
            queries.append(f"{product_name} {barcode}")
            queries.append(f"{barcode}")
        
        # Simplified name
        simplified = self._simplify_product_name(product_name)
        if simplified and simplified != product_name:
            queries.append(simplified)
        
        # Remove duplicates
        seen = set()
        unique_queries = []
        for q in queries:
            if q not in seen and len(q) > 3:
                seen.add(q)
                unique_queries.append(q)
        
        return unique_queries[:8]
    
    def _simplify_product_name(self, name: str) -> str:
        """Simplify product name"""
        stop_words = [
            'pack', 'box', 'set', 'bundle', 'kit', 'unit', 'card',
            'gift', 'bag', 'case', 'kg', 'gm', 'ml', 'liter', 'لتر',
            'غم', 'كغم', 'غرام', 'جرام', 'علبة', 'حزمة', 'كيس',
            'قطعة', 'حبة', 'زجاجة', 'عبوة', 'صندوق'
            
        ]
        
        simplified = re.sub(r'[^\w\s]', ' ', name)
        simplified = re.sub(r'\d+', '', simplified)
        
        words = simplified.split()
        filtered = [w for w in words if w.lower() not in stop_words and len(w) > 2]
        
        if filtered:
            return ' '.join(filtered[:4])
        return name
    
    def clear_cache(self):
        """Clear search cache"""
        self.search_cache.clear()
        logger.debug("Search cache cleared")