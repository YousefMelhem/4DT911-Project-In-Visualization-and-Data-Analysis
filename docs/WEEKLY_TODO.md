# Week Todo List - MedPix Visual Analytics System
**Week of:** October 6, 2025  
**Team:** Group A  
**Sprint Goal:** Complete Analytics Dashboard & Begin ML Implementation

---

## 🎯 Current Project Status

### ✅ Completed (Week 1-2)
- [x] Project setup and structure
- [x] Data cleaning pipeline with field parser (7,432 cases processed)
- [x] FastAPI backend with case endpoints
- [x] Nuxt 3 frontend with responsive navigation
- [x] Cases gallery page with search & pagination (24 cases/page)
- [x] Individual case detail pages with image galleries
- [x] Image serving (fixed path resolution)
- [x] Environment configuration and security fixes
- [x] File-based routing structure

---

## 📋 This Week's Tasks

### 🔴 HIGH PRIORITY - Analytics Dashboard (RQ3)

#### Task 1.1: Backend Analytics Endpoints
**Owner:** Team (Pair Programming)  
**Estimated Time:** 4-5 hours  
**Description:** Create FastAPI endpoints to serve statistical data

**Subtasks:**
- [ ] Create `/api/analytics/demographics` endpoint
  - Return age distribution (pediatric, young adult, middle-aged, elderly)
  - Return gender distribution (male, female, unknown)
  - Calculate percentages for each category
  
- [ ] Create `/api/analytics/specialties` endpoint
  - Return top anatomical regions with case counts
  - Include: Disc, Head/Neuro, Bone/Ortho, Chest/Pulmonary, Abdominal
  
- [ ] Create `/api/analytics/modalities` endpoint
  - Count cases by imaging modality (CT, MRI, X-ray, Ultrasound, etc.)
  - Extract from case data or diagnoses
  
- [ ] Create `/api/analytics/stats` endpoint
  - Total cases count
  - Total images count
  - Average images per case
  - Cases with/without diagnosis

**Files to modify:**
- `backend/main.py` (add new endpoints)

**Testing:**
```bash
curl http://localhost:8000/api/analytics/demographics
curl http://localhost:8000/api/analytics/specialties
curl http://localhost:8000/api/analytics/stats
```

---

#### Task 1.2: Analytics Page Frontend
**Owner:** Team (Pair Programming)  
**Estimated Time:** 5-6 hours  
**Description:** Build interactive analytics dashboard with charts

**Subtasks:**
- [ ] Install Chart.js or D3.js for visualizations
  ```bash
  cd /home/yousef/code/school/4DT911-project
  npm install chart.js vue-chartjs
  # OR for D3.js: npm install d3
  ```

- [ ] Update `app/pages/analytics.vue` with dashboard layout
  - Grid layout with 4-6 chart cards
  - Responsive design (mobile-friendly)
  - Loading states while fetching data

- [ ] Implement demographic visualizations (Figure 4 & 5 from proposal)
  - **Age Distribution Chart:** Horizontal bar chart showing age groups
  - **Gender Distribution Chart:** Pie or donut chart
  - Make charts interactive (hover to see percentages)

- [ ] Implement specialty visualizations (Figure 2 from proposal)
  - **Top Anatomical Regions:** Bar chart with top 10 regions
  - Click on bar to filter cases gallery (future enhancement)

- [ ] Implement general statistics cards
  - Total cases (7,432)
  - Total images (40,900)
  - Average images per case (5.5)
  - Diagnosis coverage (99.7%)

- [ ] Add filter/drill-down interaction
  - When user clicks chart segment, navigate to filtered cases page
  - Example: Click "Chest/Pulmonary" → navigateTo('/cases?region=chest')

**Files to create/modify:**
- `app/pages/analytics.vue`
- `app/components/charts/` (optional: create reusable chart components)

---

### 🟡 MEDIUM PRIORITY - Enhanced Search & Filtering (RQ1)

#### Task 2.1: Advanced Filtering Backend
**Owner:** Team (Pair Programming)  
**Estimated Time:** 3-4 hours  

**Subtasks:**
- [ ] Update `/api/cases` endpoint to accept filter parameters
  - `?age_group=pediatric` (pediatric, young_adult, middle_aged, elderly)
  - `?gender=male|female|unknown`
  - `?specialty=chest|head|bone|disc|abdominal`
  - `?has_diagnosis=true|false`
  
- [ ] Implement filtering logic in `backend/main.py`
  - Parse query parameters
  - Filter cases_data based on criteria
  - Return filtered + paginated results

**Example API call:**
```
GET /api/cases?page=1&search=fracture&age_group=elderly&gender=male
```

---

#### Task 2.2: Filter UI on Cases Page
**Owner:** Team (Pair Programming)  
**Estimated Time:** 3-4 hours  

**Subtasks:**
- [ ] Add filter panel to `app/pages/cases/index.vue`
  - Dropdown for age group
  - Dropdown for gender
  - Dropdown for specialty/region
  - Checkbox for "Has diagnosis only"
  
- [ ] Connect filters to API calls
  - Update `fetchCases()` to include filter params
  - Update URL query params for shareable links
  
- [ ] Add "Clear Filters" button
- [ ] Display active filter tags/chips

---

### 🟢 LOW PRIORITY - ML Foundation (RQ2)

#### Task 3.1: ML Environment Setup
**Owner:** Team (Pair Programming)  
**Estimated Time:** 2-3 hours  

**Subtasks:**
- [ ] Create new Jupyter notebook: `Ml-Notebook/embedding_generation.ipynb`
- [ ] Install required ML libraries:
  ```bash
  pip install sentence-transformers torch torchvision pillow scikit-learn
  ```
  
- [ ] Update `Ml-Notebook/requirements.txt`:
  ```
  sentence-transformers>=2.2.0
  torch>=2.0.0
  torchvision>=0.15.0
  Pillow>=9.0.0
  scikit-learn>=1.3.0
  umap-learn>=0.5.0
  ```

---

#### Task 3.2: Text Embedding Exploration
**Owner:** Team (Pair Programming)  
**Estimated Time:** 3-4 hours  

**Subtasks:**
- [ ] Load `data/processed/cases_cleaned.json` in notebook
- [ ] Experiment with text embeddings using Sentence-BERT
  ```python
  from sentence_transformers import SentenceTransformer
  model = SentenceTransformer('all-MiniLM-L6-v2')
  ```
  
- [ ] Generate embeddings for case descriptions (combine history + findings + diagnosis)
- [ ] Test similarity search on 100 sample cases
  - Pick a query case
  - Find top 5 most similar cases using cosine similarity
  - Manually validate if results make medical sense
  
- [ ] Document findings in notebook with markdown cells

---

### 🔧 TECHNICAL DEBT & IMPROVEMENTS

#### Task 4.1: Code Quality
**Estimated Time:** 2 hours  

- [ ] Add error handling to all API endpoints (try-catch blocks)
- [ ] Add loading spinners to all pages
- [ ] Improve mobile responsiveness on case detail page
- [ ] Add TypeScript types for API responses

---

#### Task 4.2: Documentation
**Estimated Time:** 1-2 hours  

- [ ] Update `README.md` with:
  - Current features list
  - API endpoints documentation
  - How to run the project (frontend + backend)
  - Screenshots of current pages
  
- [ ] Add comments to complex functions (especially `parse_case_title()`)
- [ ] Create `docs/API_DOCUMENTATION.md`

---

## 📊 Task Distribution Strategy

Since your team works collaboratively (as per proposal), here's a suggested workflow:

### Day 1-2 (Mon-Tue): Analytics Dashboard
- **Session 1 (3h):** Backend analytics endpoints together
- **Session 2 (3h):** Frontend chart setup and first visualizations

### Day 3-4 (Wed-Thu): Analytics Polish + Filtering
- **Session 3 (3h):** Complete analytics dashboard with all charts
- **Session 4 (2h):** Implement advanced filtering (backend + frontend)

### Day 5 (Fri): ML Exploration + Polish
- **Session 5 (2h):** ML environment setup and first embedding experiments
- **Session 6 (2h):** Code quality improvements and documentation

### Weekend (Optional): 
- Individual exploration of ML models
- Testing and bug fixes

---

## 🎯 Success Criteria for This Week

By end of week, you should have:

1. **Analytics Dashboard** (addresses RQ3)
   - [ ] Working dashboard page at `/analytics`
   - [ ] At least 4 interactive charts displaying real data
   - [ ] Demographic and specialty visualizations matching proposal figures

2. **Enhanced Case Exploration** (addresses RQ1)
   - [ ] Working filters on cases page
   - [ ] Ability to filter by age, gender, and specialty
   - [ ] Shareable filtered URLs

3. **ML Foundation** (addresses RQ2)
   - [ ] Working ML notebook with text embeddings
   - [ ] Proof-of-concept similarity search on sample data
   - [ ] Documentation of approach and findings

4. **Quality & Documentation**
   - [ ] Updated README with setup instructions
   - [ ] API documentation created
   - [ ] All features tested on both desktop and mobile

---

## 📝 Notes & Reminders

- **Commit often:** Make small commits with descriptive messages
- **Test as you go:** Run both frontend and backend while developing
- **Pair program:** Work together on complex tasks, rotate driver/navigator
- **Ask for help:** If stuck for >30 minutes, discuss with team or instructor
- **Reference proposal:** Keep `docs/project_proposal.md` open for requirements

---

## 🚀 Next Week Preview (Week 4)

If you complete this week's tasks, next week will focus on:
- Image embedding generation (ResNet/ViT)
- Combined multimodal similarity search
- Embedding visualization with UMAP/t-SNE
- Similar cases panel implementation
- Clustering experiments (K-means, DBSCAN)

---

## 📞 Daily Standup Questions

Ask each other daily:
1. What did I complete yesterday?
2. What am I working on today?
3. Any blockers or challenges?

---

**Last Updated:** October 6, 2025  
**Next Review:** October 13, 2025
