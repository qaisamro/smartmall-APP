"""
Image Search Engine using Google Custom Search API
"""
import requests
from typing import Optional, List, Tuple
from urllib.parse import quote
import time
from logger import logger
import json

class GoogleImageSearch:
    """Search for images using Google Custom Search API"""
    
    def __init__(self, api_key: str, cse_id: str):
        self.api_key = api_key
        self.cse_id = cse_id
        self.base_url = "https://www.googleapis.com/customsearch/v1"
        self.session = requests.Session()
        self.search_count = 0
        self.daily_limit = 100  # Free tier limit
        
    def search(self, query: str, max_results: int = 5) -> List[str]:
        """
        Search for images using Google Custom Search API
        
        Args:
            query: Search query
            max_results: Number of results to return (max 10 per request)
            
        Returns:
            List of image URLs
        """
        if not self.api_key or not self.cse_id:
            logger.warning("Google API key or CSE ID not configured")
            return []
        
        # Check daily limit
        if self.search_count >= self.daily_limit:
            logger.warning(f"Google API daily limit reached ({self.daily_limit} searches)")
            return []
        
        try:
            params = {
                'q': query,
                'cx': self.cse_id,
                'key': self.api_key,
                'searchType': 'image',
                'num': min(max_results, 10),  # Max 10 per request
                'safe': 'off'
            }
            
            response = self.session.get(self.base_url, params=params, timeout=20)
            self.search_count += 1
            
            if response.status_code == 200:
                data = response.json()
                urls = []
                
                for item in data.get('items', []):
                    image_url = item.get('link')
                    if image_url:
                        urls.append(image_url)
                
                logger.debug(f"Google API found {len(urls)} images for: {query[:30]}")
                return urls
                
            elif response.status_code == 403:
                logger.error("Google API quota exceeded or invalid key")
                return []
            else:
                logger.debug(f"Google API error: {response.status_code}")
                return []
                
        except Exception as e:
            logger.debug(f"Google API search error: {e}")
            return []
    
    def search_with_retry(self, query: str, max_results: int = 5, retries: int = 3) -> List[str]:
        """Search with automatic retry on failure"""
        for attempt in range(retries):
            results = self.search(query, max_results)
            if results:
                return results
            time.sleep(1 * (attempt + 1))
        return []
    
    def get_remaining_quota(self) -> int:
        """Get remaining daily quota"""
        return max(0, self.daily_limit - self.search_count)