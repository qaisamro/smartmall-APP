"""
Main entry point for Product Image Finder - مع Playwright
"""
import sys
import time
from pathlib import Path
from tqdm import tqdm
from colorama import init, Fore, Style
import signal
import os
import random

# Fix unicode encode error on windows console
if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

from config import Config
from logger import logger
from excel_handler import ExcelHandler
from product_search import ProductSearch
from downloader import ImageDownloader

# Initialize colorama
init(autoreset=True)

class ProductImageFinder:
    def __init__(self):
        self.config = Config()
        
        try:
            self.config.validate()
        except ValueError as e:
            print(Fore.RED + f"❌ Configuration Error: {e}")
            sys.exit(1)
            
        self.product_search = ProductSearch(self.config)
        self.downloader = ImageDownloader(self.config)
        self.excel_handler = None
        self.start_time = None
        self.processed = 0
        self.found = 0
        self.downloaded = 0
        self.failed = 0
        self.low_confidence = 0
        self.should_stop = False
        self.current_file_idx = 0
        self.total_overall = 0
        self.found_overall = 0
        self.failed_overall = 0
        
        signal.signal(signal.SIGINT, self._signal_handler)
    
    def _signal_handler(self, sig, frame):
        self.should_stop = True
        print("\n" + Fore.YELLOW + "⚠️ Interrupted by user. Saving progress...")
    
    def run(self):
        print(Fore.CYAN + Style.BRIGHT + """
        ╔══════════════════════════════════════════════════════╗
        ║        Product Image Finder AI                       ║
        ║        🔍 Playwright - DuckDuckGo                   ║
        ║        🌐 يفتح المتصفح وينقر على الصورة            ║
        ╚══════════════════════════════════════════════════════╝
        """)
        
        print(Fore.GREEN + "✅ Using:")
        print(Fore.CYAN + "   🦆 DuckDuckGo Images")
        print(Fore.CYAN + "   🖱️  ينقر على أول صورة")
        print(Fore.CYAN + "   📋 ينسخ رابط الصورة")
        print()
        
        files_to_process = self.config.input_files
        print(Fore.YELLOW + f"📂 Total files to process: {len(files_to_process)}")
        for i, f in enumerate(files_to_process, 1):
            print(Fore.CYAN + f"   {i}. {f.name}")
        
        total_pending = 0
        for f in files_to_process:
            eh = ExcelHandler(self.config)
            eh.load_products_from(f)
            total_pending += len(eh.get_products_without_images())
        
        if total_pending == 0:
            print(Fore.GREEN + "✅ All products have images in all files!")
            return
        
        print(Fore.YELLOW + f"\n📦 Total products needing images across all files: {total_pending}")
        response = input(Fore.CYAN + f"🔄 Process all {total_pending} products? (y/n): ")
        if response.lower() != 'y':
            print(Fore.YELLOW + "❌ Operation cancelled")
            return
        
        web_search_resp = input(Fore.CYAN + "🌐 Enable Web Search fallback? (y/n) [n]: ")
        if web_search_resp.lower() == 'y':
            self.config.enable_web_search = True
            print(Fore.GREEN + "✅ Web Search fallback enabled")
        
        self.start_time = time.time()

        try:
            for idx, file_path in enumerate(files_to_process):
                if self.should_stop:
                    break
                self.current_file_idx = idx
                self.config.set_current_file(file_path)
                
                print(Fore.MAGENTA + Style.BRIGHT + f"\n{'='*60}")
                print(Fore.MAGENTA + f"📂 File {idx+1}/{len(files_to_process)}: {file_path.name}")
                print(Fore.MAGENTA + f"{'='*60}")
                
                self.excel_handler = ExcelHandler(self.config)
                self.excel_handler.load_products_from(file_path)
                products = self.excel_handler.get_products_without_images()
                
                if not products:
                    print(Fore.GREEN + f"✅ All products have images in {file_path.name}")
                    continue
                
                self.processed = 0
                self.found = 0
                self.downloaded = 0
                self.failed = 0
                self.low_confidence = 0
                
                self._process_products(products)
                self.excel_handler.save_products()
                
                self.total_overall += self.processed
                self.found_overall += self.found
                self.failed_overall += self.failed
                
                self._show_stats()
                print(Fore.GREEN + f"✅ Saved: {self.config.output_file.name}")
            
            self._show_overall_stats()
            
            stats = self.product_search.get_stats()
            print(Fore.CYAN + f"\n📊 Search Engine Stats:")
            print(Fore.CYAN + f"   🦆 DuckDuckGo Hits: {stats.get('found_images', 0)}")
            print(Fore.CYAN + f"   📈 Success Rate: {stats.get('success_rate', 0):.1f}%")
            print(Fore.CYAN + f"   💾 Cache Size: {stats.get('cache_size', 0)}")
            
        except KeyboardInterrupt:
            self._handle_interrupt()
        except Exception as e:
            logger.error(f"Fatal error: {e}")
            import traceback
            traceback.print_exc()

        print(Fore.GREEN + Style.BRIGHT + "\n✅ All files processed complete!")
        
        for f in files_to_process:
            out = self.config._make_output_path(f)
            print(Fore.CYAN + f"📄 {out.name}")
        
    def _show_overall_stats(self):
        print("\n" + Fore.CYAN + Style.BRIGHT + "="*50)
        print("📊 OVERALL STATISTICS (All Files)")
        print("="*50)
        print(Fore.WHITE + f"Total Processed: {self.total_overall}")
        print(Fore.GREEN + f"✅ Found: {self.found_overall}")
        print(Fore.RED + f"❌ Failed: {self.failed_overall}")
        elapsed = time.time() - self.start_time if self.start_time else 0
        if elapsed > 0:
            print(Fore.CYAN + f"⏱️  Total Time: {elapsed/60:.1f} minutes")
    
    def _process_products(self, products):
        total = len(products)
        
        with tqdm(total=total, desc="Processing", unit="product",
                  bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}]') as pbar:
            
            for product in products:
                if self.should_stop:
                    break
                
                try:
                    image_url, method, confidence = self.product_search.find_image(
                        product['name'],
                        product['barcode']
                    )
                    
                    self.processed += 1
                    
                    if image_url and confidence >= self.config.min_confidence:
                        self.found += 1
                        self.excel_handler.update_image_url(product['index'], image_url)
                        self.excel_handler.update_image_status(product['index'], 'FOUND')
                        self.excel_handler.update_confidence(product['index'], confidence)
                        
                        if self.config.download_images:
                            if '.svg' not in image_url.lower() and '.ico' not in image_url.lower():
                                local_path = self.downloader.download(
                                    image_url,
                                    product['barcode'],
                                    product['name']
                                )
                                if local_path:
                                    self.downloaded += 1
                                    self.excel_handler.update_download_path(product['index'], local_path)
                                    self.excel_handler.update_image_status(product['index'], 'DOWNLOADED')
                    else:
                        if image_url:  # وجد صورة لكن الثقة ضعيفة
                            logger.warning(f"Rejected image due to low confidence ({confidence}%): {image_url[:60]}")
                            self.low_confidence += 1
                        self.failed += 1
                        self.excel_handler.update_image_url(product['index'], '') # اتركها فارغة لعدم تخريب البيانات
                        self.excel_handler.update_image_status(product['index'], 'NOT_FOUND')
                        self.excel_handler.update_confidence(product['index'], confidence if image_url else 0)
                    
                    pbar.update(1)
                    pbar.set_postfix({
                        'Found': self.found,
                        'Failed': self.failed,
                        'Downloaded': self.downloaded
                    })
                    
                    if self.config.save_checkpoint and self.processed % self.config.checkpoint_interval == 0:
                        self.excel_handler.save_checkpoint()
                    
                    if self.config.delay_between_requests:
                            time.sleep(random.uniform(4, 7))                    
                except Exception as e:
                    logger.error(f"Error: {e}")
                    self.failed += 1
                    pbar.update(1)
                    continue
    
    def _show_stats(self):
        stats = self.excel_handler.get_statistics()
        
        print("\n" + "="*50)
        print(Fore.CYAN + Style.BRIGHT + "📊 Processing Statistics")
        print("="*50)
        print(Fore.WHITE + f"Total Products: {stats['total']}")
        print(Fore.GREEN + f"✅ With Images: {stats['with_images']}")
        print(Fore.YELLOW + f"⏳ Without Images: {stats['without_images']}")
        
        if stats['total'] > 0:
            print(Fore.CYAN + f"📈 Progress: {stats['progress']:.1f}%")
        
        elapsed = time.time() - self.start_time if self.start_time else 0
        if elapsed > 0 and self.processed > 0:
            print(Fore.CYAN + f"⏱️  Elapsed Time: {elapsed/60:.1f} minutes")
            print(Fore.CYAN + f"⚡ Speed: {self.processed/(elapsed/60):.1f} products/min")
            print(Fore.GREEN + f"📊 Found: {self.found}")
            print(Fore.YELLOW + f"⚠️  Low Confidence: {self.low_confidence}")
            print(Fore.RED + f"❌ Failed: {self.failed}")
            if self.config.download_images:
                print(Fore.GREEN + f"💾 Downloaded: {self.downloaded}")
    
    def _handle_interrupt(self):
        print("\n" + Fore.YELLOW + "⚠️ Interrupted by user")
        if self.excel_handler:
            self._show_stats()
            self.excel_handler.save_products()
            print(Fore.CYAN + f"💾 Progress saved to: {self.config.output_file.name}")
        print(Fore.GREEN + "You can resume later.")
        sys.exit(0)

def main():
    app = ProductImageFinder()
    app.run()

if __name__ == "__main__":
    main()