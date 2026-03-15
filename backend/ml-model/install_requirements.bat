@echo off
echo ========================================================
echo  Tea Quality & Disease AI Models - Environment Setup
echo ========================================================
echo.

:: Get the directory where this script lives
set "SCRIPT_DIR=%~dp0"
set "VENV_DIR=%SCRIPT_DIR%.venv"
set "REQUIREMENTS=%SCRIPT_DIR%requirements.txt"

:: Step 1: Check if Python is installed
echo [1/4] Checking Python installation...
python --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Python is not installed or not in PATH.
    echo Please install Python 3.8+ from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)
python --version
echo       Python found!
echo.

:: Step 2: Create virtual environment if it doesn't exist
echo [2/4] Checking virtual environment...
if not exist "%VENV_DIR%\Scripts\python.exe" (
    echo       Virtual environment not found. Creating one...
    python -m venv "%VENV_DIR%"
    if %ERRORLEVEL% neq 0 (
        echo ERROR: Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo       Virtual environment created at: %VENV_DIR%
) else (
    echo       Virtual environment already exists.
)
echo.

:: Step 3: Activate virtual environment
echo [3/4] Activating virtual environment...
call "%VENV_DIR%\Scripts\activate.bat"
echo       Activated!
echo.

:: Step 4: Install required packages
echo [4/4] Installing required Python packages...
echo.
pip install --upgrade pip
pip install -r "%REQUIREMENTS%"
echo.

if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Package installation failed.
    echo Try running this script as Administrator.
    pause
    exit /b 1
)

echo.
echo ===================================================
echo  Setup Complete! All packages installed.
echo ===================================================
echo.
echo  Virtual env location: %VENV_DIR%
echo  To activate manually:  %VENV_DIR%\Scripts\activate.bat
echo.
pause
