"""
Clear all cache for Product Image Finder
"""
import os
import shutil
import glob

def clear_all_cache():
    """Clear all cache files"""
    print("🧹 Clearing cache...")
    
    # 1. Clear cache folder
    if os.path.exists("cache"):
        try:
            shutil.rmtree("cache")
            print("✅ Cache folder removed")
        except Exception as e:
            print(f"❌ Error removing cache folder: {e}")
    
    # 2. Clear checkpoint files
    checkpoint_files = glob.glob("*.checkpoint.xlsx")
    for f in checkpoint_files:
        try:
            os.remove(f)
            print(f"✅ Removed: {f}")
        except Exception as e:
            print(f"❌ Error removing {f}: {e}")
    
    # 3. Clear backup files
    backup_files = glob.glob("*.backup.xlsx")
    for f in backup_files:
        try:
            os.remove(f)
            print(f"✅ Removed: {f}")
        except Exception as e:
            print(f"❌ Error removing {f}: {e}")
    
    # 4. Clear log files (optional)
    # log_files = glob.glob("*.log")
    # for f in log_files:
    #     try:
    #         os.remove(f)
    #         print(f"✅ Removed: {f}")
    #     except Exception as e:
    #         print(f"❌ Error removing {f}: {e}")
    
    # 5. Clear __pycache__ folders
    for root, dirs, files in os.walk("."):
        for dir in dirs:
            if dir == "__pycache__":
                try:
                    shutil.rmtree(os.path.join(root, dir))
                    print(f"✅ Removed: {os.path.join(root, dir)}")
                except Exception as e:
                    print(f"❌ Error removing {dir}: {e}")
    
    print("✨ Cache cleared successfully!")

if __name__ == "__main__":
    clear_all_cache()