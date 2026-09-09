"""
Image search using various methods
"""
import requests
from typing import Optional, List, Tuple
from urllib.parse import quote
import time
import re
from logger import logger
from bs4 import BeautifulSoup

class ImageSearch:
    """Search for product images using multiple methods"""
    
    def __init__(self, config):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
        self.search_methods = [
            self._search_google_images,
            self._search_duckduckgo_images,
            self._search_bing_images,
        ]
    
    def find_image(self, barcode: str, product_name: str) -> Tuple[Optional[str], str]:
        """
        Find image for a product using multiple methods
        
        Returns:
            Tuple of (image_url, method_used)
        """
        logger.debug(f"Searching for: {product_name[:30]}... (Barcode: {barcode})")
        
        # Method 1: Try by barcode
        if barcode and len(barcode) >= 8:
            # Try barcode database first
            url = self._search_by_barcode(barcode)
            if url:
                logger.info(f"Found image via barcode: {barcode}")
                return url, "BARCODE"
        
        # Method 2: Search with product name
        search_queries = [
            product_name,
            f"{product_name} product",
            f"{product_name} {barcode}",
        ]
        
        for query in search_queries:
            for method in self.search_methods:
                try:
                    url = method(query)
                    if url:
                        logger.info(f"Found image via {method.__name__}: {query[:30]}...")
                        return url, method.__name__
                except Exception as e:
                    logger.debug(f"Search method failed: {e}")
                    continue
        
        # Method 3: Try with simplified name
        simplified = self._simplify_product_name(product_name)
        if simplified and simplified != product_name:
            for method in self.search_methods:
                try:
                    url = method(simplified)
                    if url:
                        logger.info(f"Found image via simplified name: {simplified[:30]}...")
                        return url, f"{method.__name__}_SIMPLIFIED"
                except Exception as e:
                    continue
        
        logger.warning(f"No image found for: {product_name[:30]}")
        return None, "NOT_FOUND"
    
    def _search_by_barcode(self, barcode: str) -> Optional[str]:
        """Search using barcode via Open Food Facts or similar services"""
        try:
            # Try Open Food Facts
            url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
            response = self.session.get(url, timeout=self.config.search_timeout)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 1:
                    product = data.get('product', {})
                    # Try different image fields
                    for img_field in ['image_front_url', 'image_url', 'image_front_small_url']:
                        img_url = product.get(img_field)
                        if img_url:
                            logger.info(f"Found image via Open Food Facts: {barcode}")
                            return img_url
            
            return None
            
        except Exception as e:
            logger.debug(f"Barcode search failed: {e}")
            return None
    
    def _search_google_images(self, query: str) -> Optional[str]:
        """Search Google Images"""
        try:
            # Google Custom Search API (free tier)
            # You would need to set up Google CSE for this
            # For demo, we'll use a scraping approach
            search_url = f"https://www.google.com/search?q={quote(query)}&tbm=isch"
            response = self.session.get(search_url, timeout=self.config.search_timeout)
            
            if response.status_code == 200:
                # Extract image URLs from the page
                soup = BeautifulSoup(response.text, 'html.parser')
                # Find image elements
                img_tags = soup.find_all('img', {'src': True})
                for img in img_tags:
                    src = img.get('src')
                    if src and src.startswith('http') and not src.startswith('data:'):
                        # Clean the URL
                        if '&' in src:
                            src = src.split('&')[0]
                        return src
            
            return None
            
        except Exception as e:
            logger.debug(f"Google search failed: {e}")
            return None
    
    def _search_duckduckgo_images(self, query: str) -> Optional[str]:
        """Search DuckDuckGo Images"""
        try:
            search_url = f"https://duckduckgo.com/?q={quote(query)}&iax=images&ia=images"
            response = self.session.get(search_url, timeout=self.config.search_timeout)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                # Look for image elements
                img_tags = soup.find_all('img', {'src': True})
                for img in img_tags:
                    src = img.get('src')
                    if src and src.startswith('http') and not src.startswith('data:'):
                        return src
            
            return None
            
        except Exception as e:
            logger.debug(f"DuckDuckGo search failed: {e}")
            return None
    
    def _search_bing_images(self, query: str) -> Optional[str]:
        """Search Bing Images"""
        try:
            search_url = f"https://www.bing.com/images/search?q={quote(query)}"
            response = self.session.get(search_url, timeout=self.config.search_timeout)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                # Find images in the response
                img_tags = soup.find_all('img', {'src': True})
                for img in img_tags:
                    src = img.get('src')
                    if src and src.startswith('http') and not src.startswith('data:'):
                        return src
            
            return None
            
        except Exception as e:
            logger.debug(f"Bing search failed: {e}")
            return None
    
    def _simplify_product_name(self, name: str) -> str:
        """Simplify product name for better search results"""
        # Remove common words that don't help in searches
        stop_words = ['pack', 'box', 'set', 'bundle', 'kit', 'unit', 'card', 
                      'gift', 'bag', 'case', 'kg', 'gm', 'ml', 'liter', 'لتر',
                      'غم', 'كغم', 'غرام', 'جرام']
        
        # Remove special characters and digits
        simplified = re.sub(r'[^\w\s]', ' ', name)
        simplified = re.sub(r'\d+', '', simplified)
        
        # Remove stop words
        words = simplified.split()
        filtered = [w for w in words if w.lower() not in stop_words and len(w) > 2]
        
        # Take first 3 meaningful words
        return ' '.join(filtered[:3])