"""
Google Custom Search API - Image Search
"""
import requests
from typing import List, Optional, Dict
from urllib.parse import quote
import time
import json
from logger import logger

class GoogleAPISearch:
    """Search for images using Google Custom Search JSON API"""
    
    def __init__(self, api_key: str, cse_id: str):
        self.api_key = api_key
        self.cse_id = cse_id
        self.base_url = "https://www.googleapis.com/customsearch/v1"
        self.session = requests.Session()
        self.session.headers.update({
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        })
        
        self.search_count = 0
        self.daily_limit = 100
        self.total_results = 0
        self.found_results = 0
        
        # Test connection
        self._test_connection()
    
    def _test_connection(self):
        """Test API connection"""
        try:
            params = {
                'q': 'test',
                'cx': self.cse_id,
                'key': self.api_key,
                'num': 1
            }
            response = self.session.get(self.base_url, params=params, timeout=10)
            
            if response.status_code == 200:
                logger.info("✅ Google API connection successful")
            elif response.status_code == 403:
                logger.error("❌ Google API authentication failed - Check your API key")
                logger.error(f"Response: {response.text[:200]}")
            else:
                logger.warning(f"Google API test returned: {response.status_code}")
        except Exception as e:
            logger.error(f"Google API test failed: {e}")
    
    def search(self, query: str, max_results: int = 10) -> List[str]:
        """Search for images using Google API"""
        if not self.api_key or not self.cse_id:
            return []
        
        if self.search_count >= self.daily_limit:
            logger.warning(f"Google API daily limit reached ({self.daily_limit})")
            return []
        
        try:
            params = {
                'q': query,
                'cx': self.cse_id,
                'key': self.api_key,
                'searchType': 'image',
                'num': min(max_results, 10),
                'safe': 'off',
                'imgType': 'photo',
                'imgSize': 'medium',
                'imgColorType': 'color'
            }
            
            response = self.session.get(self.base_url, params=params, timeout=20)
            self.search_count += 1
            
            if response.status_code == 200:
                data = response.json()
                urls = []
                
                for item in data.get('items', []):
                    link = item.get('link')
                    if link:
                        urls.append(link)
                
                self.found_results += len(urls)
                logger.debug(f"Google API found {len(urls)} images for: {query[:30]}")
                return urls
                
            elif response.status_code == 403:
                logger.error("Google API quota exceeded or invalid key")
                return []
            elif response.status_code == 429:
                logger.warning("Rate limit exceeded, waiting...")
                time.sleep(5)
                return self.search(query, max_results)
            else:
                logger.debug(f"Google API error: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Google API error: {e}")
            return []
    
    def search_with_retry(self, query: str, max_results: int = 10, retries: int = 3) -> List[str]:
        """Search with retry"""
        for attempt in range(retries):
            results = self.search(query, max_results)
            if results:
                return results
            time.sleep(2 ** attempt)
        return []
    
    def get_stats(self) -> Dict:
        """Get API statistics"""
        return {
            'api_calls': self.search_count,
            'results_found': self.found_results,
            'remaining_quota': max(0, self.daily_limit - self.search_count),
            'daily_limit': self.daily_limit
        }