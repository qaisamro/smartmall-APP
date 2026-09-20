import google.generativeai as genai
import requests
from io import BytesIO
from PIL import Image
from logger import logger
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class AIVerifier:
    def __init__(self, api_key: str):
        self.enabled = bool(api_key and api_key.strip())
        self._last_call_time = 0
        self._min_interval = 4.5  # ثانية بين كل طلب (للبقاء تحت 15 طلب/دقيقة مجاناً)
        if self.enabled:
            genai.configure(api_key=api_key)
            # gemini-2.0-flash: مجاني 1500 طلب/يوم + يدعم الصور
            self.model = genai.GenerativeModel('gemini-2.0-flash')
            logger.info("AI Verifier (Gemini 2.0 Flash) is ENABLED.")
        else:
            logger.info("AI Verifier is DISABLED (No API key).")

    def verify_image(self, image_url: str, product_name: str) -> bool:
        if not self.enabled:
            return True

        # تحكم في معدل الطلبات: انتظر إذا مضى وقت أقل من الفاصل المطلوب
        import time
        elapsed = time.time() - self._last_call_time
        if elapsed < self._min_interval:
            time.sleep(self._min_interval - elapsed)
        self._last_call_time = time.time()

        try:
            # 1. Download the image temporarily in memory
            headers = {'User-Agent': 'Mozilla/5.0'}
            response = requests.get(image_url, headers=headers, timeout=15, verify=False)
            if response.status_code != 200:
                logger.warning(f"AI Verifier: Could not download image {image_url}")
                return False

            img = Image.open(BytesIO(response.content))
            # Convert to RGB to avoid issues with PNG transparency
            if img.mode != 'RGB':
                img = img.convert('RGB')
                
            # Resize image to save bandwidth and speed up AI processing
            img.thumbnail((800, 800))

            # 2. Ask Gemini to verify
            prompt = f"""
            أنت خبير في المنتجات والمبيعات وتدقيق الصور.
            انظر إلى هذه الصورة، هل هي صورة للمنتج التالي بالضبط؟
            اسم المنتج: "{product_name}"
            
            أجب بكلمة "نعم" إذا كانت الصورة تطابق اسم المنتج والشركة المصنعة بشكل صحيح تماماً.
            أجب بكلمة "لا" إذا كانت الصورة لمنتج مختلف، أو شركة مختلفة، أو نوع مختلف تماماً.
            لا تقم بكتابة أي تفاصيل إضافية، فقط "نعم" أو "لا".
            """
            
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    result = self.model.generate_content([prompt, img])
                    text = result.text.strip().lower()
                    
                    if "نعم" in text or "yes" in text:
                        logger.info(f"AI Verified as CORRECT: {product_name}")
                        return True
                    else:
                        logger.warning(f"AI Verified as INCORRECT: {product_name} - {image_url}")
                        return False
                except Exception as api_err:
                    err_msg = str(api_err)
                    if "429" in err_msg or "Quota" in err_msg:
                        import time
                        import re
                        
                        sleep_time = 15 # default
                        match = re.search(r'retry in (\d+\.?\d*)s', err_msg)
                        if match:
                            sleep_time = float(match.group(1)) + 1
                            
                        logger.warning(f"AI Quota exceeded. Sleeping for {sleep_time:.1f} seconds... (Attempt {attempt+1}/{max_retries})")
                        time.sleep(sleep_time)
                    else:
                        raise api_err
            
            logger.error(f"AI Verification failed after {max_retries} retries for {product_name}.")
            return True # Fallback if totally failed
            
        except Exception as e:
            logger.error(f"AI Verification error for {product_name}: {e}")
            return True # Fallback to true if API fails so we don't break the whole app
