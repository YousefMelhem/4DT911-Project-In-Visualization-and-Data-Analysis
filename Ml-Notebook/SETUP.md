# 🚀 ML Notebooks Setup Guide

## Quick Start

### Step 1: Install All Packages

```bash
cd /home/yousef/code/school/4DT911-project/Ml-Notebook
pip install -r requirements.txt
```

**⏱️ Installation time:** ~5-10 minutes (downloads ~2GB)

---

## Phase-by-Phase Installation

If you want to install only what you need for each phase:

### **Phase 1: Data Preparation** ✅ (Already Complete)
```bash
pip install numpy pandas matplotlib seaborn tqdm jupyter
```

### **Phase 2A: TF-IDF Features** (Current Phase)
```bash
pip install numpy pandas matplotlib seaborn scikit-learn scipy joblib tqdm
```

### **Phase 2B: BERT Embeddings**
```bash
pip install sentence-transformers transformers torch
```
⚠️ **Note:** PyTorch download is ~800MB

### **Phase 3: Image Features (CNN)**
```bash
pip install torch torchvision Pillow
```

### **Phase 7: Optimization (Later)**
```bash
pip install faiss-cpu numba
```

---

## Verify Installation

After installing, test if everything works:

```python
# Run this in Python or Jupyter
import numpy
import pandas
import sklearn
import matplotlib
import seaborn
import tqdm
print("✅ Phase 2A packages ready!")

# For Phase 2B (BERT)
try:
    import sentence_transformers
    import transformers
    import torch
    print("✅ Phase 2B packages ready!")
except ImportError:
    print("⚠️  Phase 2B packages not installed yet")
```

---

## Troubleshooting

### Problem: `pip` command not found
**Solution:**
```bash
# Try pip3 instead
pip3 install -r requirements.txt
```

### Problem: PyTorch installation fails
**Solution:**
```bash
# Install CPU-only version (smaller, faster)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

### Problem: Permission denied
**Solution:**
```bash
# Install for user only
pip install --user -r requirements.txt
```

### Problem: Jupyter notebook not found
**Solution:**
```bash
# Install Jupyter
pip install jupyter notebook
# Then start Jupyter
jupyter notebook
```

---

## System Requirements

- **Python:** 3.8 or higher (check with `python --version`)
- **Disk Space:** ~5GB free (for packages and data)
- **RAM:** 8GB minimum, 16GB recommended
- **Internet:** Required for downloading models

---

## What Each Package Does

| Package | Purpose | Used In |
|---------|---------|---------|
| `numpy` | Array operations | All phases |
| `pandas` | Data manipulation | All phases |
| `scikit-learn` | TF-IDF, similarity | Phase 2A |
| `sentence-transformers` | BERT embeddings | Phase 2B |
| `torch` | Deep learning | Phase 2B, 3 |
| `torchvision` | Image processing | Phase 3 |
| `matplotlib` + `seaborn` | Visualization | All phases |
| `tqdm` | Progress bars | All phases |
| `joblib` | Save/load models | Phase 2+3 |

---

## Next Steps After Installation

1. **Open Jupyter Notebook:**
   ```bash
   cd /home/yousef/code/school/4DT911-project/Ml-Notebook
   jupyter notebook
   ```

2. **Run notebooks in order:**
   - ✅ `01_data_preparation.ipynb` (Complete)
   - 🔄 `02a_text_features_tfidf.ipynb` (Current - Run this!)
   - ⏭️ `02b_text_embeddings_bert.ipynb` (Next)

3. **Check outputs:**
   - Phase 2A creates: `data/features/tfidf_*.npz/pkl/json`
   - Phase 2B creates: `data/features/text_embeddings_bert.npy`

---

## Need Help?

- **Check Python version:** `python --version` (need 3.8+)
- **Check pip version:** `pip --version`
- **List installed packages:** `pip list`
- **Update pip:** `pip install --upgrade pip`
