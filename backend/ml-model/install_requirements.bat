@echo off
echo ===================================================
echo Installing required Python packages for Tea Disease Model
echo ===================================================

echo.
echo Activating virtual environment...
call "..\..\.venv\Scripts\activate.bat"

echo.
echo Installing PyTorch and TorchVision (CPU version for inference)...
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

echo.
echo Installing Pillow (Image Processing)...
pip install Pillow

echo.
echo ===================================================
echo Installation Complete!
echo ===================================================
pause
