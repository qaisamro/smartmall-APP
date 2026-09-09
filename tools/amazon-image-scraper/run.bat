@echo off
title Product Image Finder AI
color 0A

echo =========================================================
echo       Product Image Finder AI
echo =========================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed.
    echo Please install Python 3.8 or higher.
    pause
    exit /b 1
)

REM Install requirements
echo Installing required packages...
pip install pandas openpyxl requests beautifulsoup4 lxml tqdm colorama Pillow opencv-python scikit-learn --quiet

echo.
echo Starting the image finder...
echo.

python main.py

echo.
echo =========================================================
pause