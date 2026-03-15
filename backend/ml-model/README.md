# 🍃 Tea Quality & Disease AI Models - Setup Guide

This folder contains multiple AI models used by the system:
1. **Tea Leaf Disease Classification**: A trained EfficientNet-B0 PyTorch model (`best_model.pth`).
2. **Tea Leaf Quality Prediction**: Trained XGBoost models for quality grade and percentage (`quality_models/`).

## 📁 Folder Structure

```
ml-model/
├── best_model.pth             # Trained PyTorch model (Disease Detection)
├── predict_service.py         # Inference script for Disease Detection
├── quality_models/            # Trained XGBoost models and encoders (Quality Prediction)
├── quality_predict_service.py # Inference script for Quality Prediction
├── train_quality_model.ipynb  # Jupyter notebook for training the quality model
├── requirements.txt           # Python dependencies (for both models)
├── install_requirements.bat   # One-click setup script (Windows)
└── README.md                  # This file
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

This creates a virtual environment inside `ml-model/.venv/` and installs dependencies for both models:
- `torch`, `torchvision`, `Pillow` — For Tea Disease classification
- `xgboost`, `scikit-learn`, `pandas` — For Tea Quality prediction
- `jupyter` — For running the training notebooks

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

### Step 5: Use the AI Features

**Disease Detection:**
1. Open `http://localhost:5173` in your browser
2. Log in and navigate to **Tea Disease Detection** (`/owner/tea-disease`)
3. Upload a tea leaf image and click **Analyze**
4. The AI model will classify the leaf and show results

**Quality Check:**
1. Navigate to **Tea Quality** (`/owner/tea-quality`)
2. Open the **AI Tea Leaf Quality Check** tab
3. Enter parameters and click **Predict Quality**
4. The XGBoost model will predict the quality grade classification and percentage

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
| `Model file not found` | Ensure `best_model.pth` and `quality_models/` exist in this folder |
| `Python is not installed` | Install Python 3.8+ from [python.org](https://www.python.org/downloads/) |
| Analysis takes too long | First run loads the models (~10-15s). Subsequent runs are faster |
