# 🍃 Tea Disease AI Model - Setup Guide

This folder contains the AI model for **Tea Leaf Disease Classification** using a trained EfficientNet-B0 PyTorch model.

## 📁 Folder Structure

```
ml-model/
├── best_model.pth           # Trained PyTorch model (EfficientNet-B0, ~95% accuracy)
├── predict_service.py        # Python inference script (called by Node.js backend)
├── requirements.txt          # Python dependencies
├── install_requirements.bat  # One-click setup script (Windows)
└── README.md                 # This file
```

## 🚀 First-Time Setup

### Prerequisites
- **Python 3.8+** installed and available in PATH
- **Node.js 18+** for the backend server

### Step 1: Install Python Dependencies

**Windows:** Double-click `install_requirements.bat`

**Or run manually:**
```bash
cd backend/ml-model
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
```

This creates a virtual environment inside `ml-model/.venv/` and installs:
- `torch` — PyTorch deep learning framework
- `torchvision` — Image processing and pre-trained models
- `Pillow` — Image loading library

### Step 2: Install Node.js Dependencies

```bash
cd backend
npm install
```

### Step 3: Start the Backend

```bash
cd backend
npm run dev
```

### Step 4: Start the Frontend

```bash
cd frontend
npm run dev
```

### Step 5: Use the Disease Detection

1. Open `http://localhost:5173` in your browser
2. Log in and navigate to **Tea Disease Detection** (`/owner/tea-disease`)
3. Upload a tea leaf image and click **Analyze**
4. The AI model will classify the leaf and show results

## 🔬 Detected Diseases

| Disease | Code | Severity |
|---------|------|----------|
| Brown Blight | BB | High |
| Healthy Green Leaf | GL | None |
| Red Spider Mite | RSM | High |

## ⚙️ Configuration (Optional)

If the backend can't find the Python virtual environment automatically, add this to your `backend/.env` file:

```env
PYTHON_PATH=C:\path\to\your\python.exe
```

The backend auto-detects Python in this order:
1. `PYTHON_PATH` environment variable (if set)
2. `backend/ml-model/.venv/` (created by install script)
3. Project root `.venv/`
4. System `python` command

## 🛠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| `ModuleNotFoundError: No module named 'torch'` | Run `install_requirements.bat` or install packages manually |
| `Model file not found` | Ensure `best_model.pth` is in this folder |
| `Python is not installed` | Install Python 3.8+ from [python.org](https://www.python.org/downloads/) |
| Analysis takes too long | First run loads the model (~10-15s). Subsequent runs are faster |
