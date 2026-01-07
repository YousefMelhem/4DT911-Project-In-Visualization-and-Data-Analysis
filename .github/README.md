# Medical Visual Analytics Tool

This repository contains a medical visual analytics system for exploring, searching, and analyzing a large collection of medical cases using text and image embeddings.

---

## Requirements

- **Python**
- **Node.js** and **npm**
- A Kaggle account (to download the dataset)

---

## Installation & Running the System

### 1. Clone the repository
```bash
git clone git@github.com:YousefMelhem/4DT911-Project-In-Visualization-and-Data-Analysis.git
cd 4DT911-Project-In-Visualization-and-Data-Analysis
```

---

### 2. Download the dataset
1. Download the dataset from Kaggle:  
   https://www.kaggle.com/datasets/ahmedsta/medical-analysis
2. Extract the downloaded ZIP into the `data` directory.
3. After extraction, the folder structure should look like this (example):

```
data/
└── archive/
    └── medpix_data_final/
        └── medpix_data_final/
            └── case_-4629902452688652/
```

Make sure the path to individual case folders matches this structure.

---

### 3. Backend setup
```bash
cd backend
python -m venv venv
```

Activate the virtual environment:

- **Windows**
  ```bash
  venv\Scripts\activate
  ```
- **macOS / Linux**
  ```bash
  source venv/bin/activate
  ```

Install dependencies and start the backend:
```bash
pip install -r requirements.txt
python main.py
```

---

### 4. Frontend setup
From the **root directory**:
```bash
npm install
npm run dev
```

---

### 5. Open the application
Open your browser and go to:

```
http://localhost:3000
```

---

## Using the Tool

The system consists of **three main pages**.

---

### 1. Case Gallery
- Browse and explore all medical cases.
- Click a case to open its detailed view.
- Use the **left sidebar** to filter cases.
- Use the **UMAP view** at the top to:
  - Mark individual cases using different marking tools.
  - Select entire clusters from the cluster list on the right.
- Above the UMAP, switch between **text embeddings** and **image embeddings** (including their clusters).

---

### 2. Similarity Search
Search for similar cases using embeddings.

**Search methods (top of the page):**
- **BioBERT (text-based)**  
  - Type a query into the search bar.
  - Click *Search*.
  - Similar cases are highlighted in the UMAP and listed below.

- **PubMedCLIP (image-based)**  
  - Select one of 25 example cases shown in the horizontally scrollable list (each case represents a different diagnosis cluster).
  - The selected case's image is used as the query.
  - Results are shown and highlighted in the same way as text search.

Additional options:
- Change the number of results shown (default: 10) in the top-right corner.

---

### 3. Analytics Dashboard
Used to analyze the dataset and discover patterns.

- **UMAP (top)**: same interaction options as in the Case Gallery.
- **Selection overview**:
  - Word cloud of key terms.
  - 8 representative cases (4 typical, 4 atypical).
- **Charts**:
  - Visualize demographics, modality, body region, and more.
- **Case list**:
  - Shows all cases in the current selection.

**Filtering options (all are linked):**
- Left sidebar filters
- UMAP interactions (marking points or selecting clusters)
- Direct chart interactions:
  - Click bars
  - Drag across line charts
  - Click heatmap cells

**Groups & comparison:**
- Create a group from the current selection using **“Create from selection”** (Groups panel below the UMAP).
- Rename a group by clicking its name.
- After creating at least two groups, enable **comparison mode** using the toggle to compare groups directly in the charts.

---


# CI/CD for Pull Requests

This project uses GitHub Actions to automatically test pull requests.

## What gets tested on every Pull Request:

### Frontend Tests (Vue.js)

### ML Notebook Tests (Python)
- **Requirements**: Validates Python dependencies
- **Notebook Execution**: Tests that notebooks run without errors

### Security Checks
- **npm audit**: Checks for vulnerable dependencies
- **Secret scanning**: Looks for hardcoded credentials

## How it works:

1. **Create a Pull Request** targeting the `master` branch
2. **GitHub Actions automatically runs** all tests
3. **All checks must pass** before the PR can be merged
4. **Review the results** in the PR checks section

## Status Badges:

The workflow creates status checks that appear in your Pull Request:
- ✅ Test Vue.js Frontend
- ✅ Test ML Notebooks  
- ✅ Basic Security Scan
- ✅ Quality Gate

All must be green (✅) before merging!
