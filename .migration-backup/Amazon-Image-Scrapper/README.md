# Amazon Product Image Scraper

## Overview
This tool automatically finds product images from Amazon using product names, barcodes, or ASINs. It processes Excel files and adds image URLs for thousands of products.

## Features
- ✅ Process 10,000+ products efficiently
- ✅ Multi-search strategies: ASIN, Barcode, Product Name
- ✅ Parallel processing with multiple workers
- ✅ Resume interrupted sessions
- ✅ Auto-save results periodically
- ✅ Download images locally (optional)
- ✅ Detailed logging and progress tracking
- ✅ Excel export with image URLs

## Installation

### Prerequisites
- Python 3.8 or higher
- Chrome browser installed

### Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/Amazon-Image-Scrapper.git
cd Amazon-Image-Scrapper

# Install dependencies
pip install -r requirements.txt

# Run the scraper
python main.py