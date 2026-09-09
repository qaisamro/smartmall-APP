import sys
from pathlib import Path


class Config:
    def __init__(self):
        # ── قائمة الملفات المطلوب معالجتها ──────────────────────────────────
        if len(sys.argv) > 1:
            # يمكن تمرير ملف واحد أو أكثر كـ arguments
            self.input_files = [Path(f) for f in sys.argv[1:]]
        else:
            # ضع هنا الملفات التي تريد معالجتها
            self.input_files = [
                Path(r"D:\Downloads\2_(501_1000)_classified.xlsx"),
                Path(r"D:\Downloads\3_(1001_1500)_classified.xlsx"),
                Path(r"D:\Downloads\4_(1501_2000)_classified.xlsx"),
            ]

        # الملف الحالي (يُعيّن تلقائياً عند بدء معالجة كل ملف)
        self.input_file = self.input_files[0]
        self.output_file = self._make_output_path(self.input_file)

        self.download_images = False
        self.min_confidence = 75  # تطابق العلامة التجارية كافٍ للقبول
        self.save_checkpoint = True
        self.checkpoint_interval = 10
        self.delay_between_requests = 2
        self.headless_mode = False
        self.search_timeout = 30
        self.enable_web_search = True
        # AI مُعطَّل — يسبب تأخيرات بسبب حد الطلبات المجاني
        # لتفعيله ضع مفتاح API هنا: self.gemini_api_key = "AIza..."
        self.gemini_api_key = ""

    def _make_output_path(self, input_file: Path) -> Path:
        return input_file.parent / f"{input_file.stem}_with_images.xlsx"

    def set_current_file(self, file_path: Path):
        """تبديل الملف الحالي عند الانتقال للملف التالي"""
        self.input_file = file_path
        self.output_file = self._make_output_path(file_path)

    def validate(self):
        existing = [f for f in self.input_files if f.exists()]
        missing  = [f for f in self.input_files if not f.exists()]
        if missing:
            for m in missing:
                print(f"⚠️  File not found (will skip): {m}")
        if not existing:
            raise ValueError("No valid input files found!")
        self.input_files = existing
        self.input_file  = existing[0]
        self.output_file = self._make_output_path(existing[0])
        print(f"📂 Files to process: {len(existing)}")
        for f in existing:
            print(f"   ✅ {f}")