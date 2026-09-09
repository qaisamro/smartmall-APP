import undetected_chromedriver as uc
from bs4 import BeautifulSoup
import pandas as pd
import tkinter as tk
from tkinter import filedialog
import time
import random

def get_product_image_url(asin):
    options = uc.ChromeOptions()
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--window-size=1280,800')
    options.add_argument('--disable-blink-features=AutomationControlled')
    user_agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    ]
    options.add_argument(f'--user-agent={random.choice(user_agents)}')

    driver = uc.Chrome(options=options)
    driver.set_page_load_timeout(30)

    try:
        url = f'https://www.amazon.com/dp/{asin}'
        driver.get(url)
        time.sleep(random.uniform(2, 4))

        soup = BeautifulSoup(driver.page_source, 'lxml')

        image_div = soup.find('div', {'id': 'imgTagWrapperId'})
        if image_div:
            img_tag = image_div.find('img')
            if img_tag and img_tag.get('src'):
                return img_tag['src']

        for img in soup.select('#landingImage, #imgBlkFront, img[data-old-hires]'):
            if img.get('src'):
                return img['src']

        return "error"
    except Exception as e:
        print(f"Error fetching {asin}: {e}")
        return "error"
    finally:
        try:
            driver.quit()
        except:
            pass


def select_file():
    file_path = filedialog.askopenfilename()
    if file_path:
        df = pd.read_excel(file_path)
        elements = df['ASIN'].to_list()
        urls = []
        for element in elements:
            print(f"Processing ASIN: {element}")
            urls.append(get_product_image_url(element))
        df = df.assign(urls=urls)
        df.to_excel('asin+url.xlsx')
        root.destroy()

root = tk.Tk()
root.title("Amazon Image Scraper")
select_file_button = tk.Button(root, text="Select Excel File", command=select_file, padx=20, pady=10)
select_file_button.pack(padx=50, pady=30)
root.mainloop()