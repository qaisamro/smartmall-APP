import requests
from pathlib import Path
from typing import Optional
from logger import logger


class ImageDownloader:
    def __init__(self, config):
        self.config = config
        self.output_dir = Path("downloads")
        self.output_dir.mkdir(exist_ok=True)

    def download(self, url: str, barcode: str, name: str) -> Optional[str]:
        try:
            safe_name = "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).rstrip()
            filename = f"{barcode}_{safe_name[:50]}.jpg"
            filepath = self.output_dir / filename

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, timeout=30, headers=headers)
            if response.status_code == 200:
                filepath.write_bytes(response.content)
                logger.info(f"Downloaded: {filepath}")
                return str(filepath)
        except Exception as e:
            logger.error(f"Download error: {e}")
        return None