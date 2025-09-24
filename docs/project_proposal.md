# Visual Analytics for Medical Diagnostic Pattern Discovery
## 4DT911 Project Proposal

---

## 1. Introduction

This project develops a visual analytics system for medical diagnostic pattern discovery using the MedPix dataset from the National Institutes of Health (NIH). The system combines computational analysis of medical cases with interactive visualizations to support diagnostic learning and pattern discovery.

### Data Source
The data originates from MedPix, an open-access medical case database developed by the Uniformed Services University of the Health Sciences. Each case represents a complete diagnostic scenario including:
- Medical images (CT scans, MRI, X-rays, ultrasounds) 
- Clinical narratives (patient history, diagnosis, treatment)
- Verified case documentation with source URLs
- Physician diagnostic reasoning

### Real-World Representation
The dataset represents authentic medical diagnostic workflows where physicians analyze multimodal data (images + clinical text) to reach diagnostic conclusions. This mirrors real diagnostic processes that combine visual pattern recognition with clinical reasoning.

---

## 2. Motivation

### Problem Statement
Medical diagnosis requires integrating visual pattern recognition from imaging with clinical reasoning from patient data. Medical students and physicians need tools to discover diagnostic patterns across large case collections and learn from similar cases.

### Why This Problem Matters
- **Educational Impact**: Pattern discovery across thousands of cases accelerates diagnostic learning
- **Clinical Decision Support**: Rapid access to similar cases improves diagnostic accuracy
- **Knowledge Discovery**: Computational analysis reveals patterns that manual review might miss
- **Scalable Learning**: System grows more valuable as new cases are added

### Domain Applications
This solution approach applies to other multimodal diagnostic domains:
- Pathology slide analysis with clinical reports
- Dermatology image databases with patient histories  
- Veterinary diagnostic cases
- Any domain combining visual and textual diagnostic data

---

## 3. Data Report

### Dataset Scale and Structure
- **Total Cases**: 6,700 medical diagnostic cases
- **Data Format**: JSON metadata + organized image directories
- **Schema**: Structured case records with consistent fields (Case Title, URL, Image Paths, Case Folder)
- **Scalability**: System designed to handle 10% data growth (additional ~670 cases)

### Data Characteristics

**Multimodal Content**:
- **Medical Images**: Multiple images per case (average 3-5 images)
- **Clinical Text**: Case titles with diagnostic information
- **Metadata**: URLs, case identifiers, image file paths

**Extracted Features** (from preprocessing analysis):
- **Body Systems**: Neurological, Cardiovascular, Respiratory, Abdominal, Musculoskeletal, Other
- **Imaging Modalities**: CT, MRI, X-Ray, Ultrasound, Nuclear Medicine
- **Case Complexity**: Simple, Moderate, Complex (computed score 0-10)

**Data Distribution**:
- Body systems show balanced representation across major anatomical regions
- Imaging modalities reflect real clinical usage patterns
- Case complexity follows expected distribution (Simple: ~40%, Moderate: ~45%, Complex: ~15%)

### Data Quality and Preprocessing
- **Source Quality**: All cases include verified URLs and structured case folders
- **Preprocessing Status**: 
  - Text normalization for consistent medical terminology
  - Feature extraction for body systems and imaging modalities
  - Complexity scoring based on multimodal content analysis
- **Missing Data**: Minimal missing values (<5%) handled through robust parsing

---

## 4. Research Questions and Goals

### Primary Research Questions

**RQ1: Interactive Clustering for Medical Pattern Discovery**
"How can interactive K-means clustering of medical cases, combined with coordinated visualizations, help users discover diagnostic patterns across different body systems and imaging modalities?"

**RQ2: User-Driven Computational Analysis**
"Can user-controlled clustering parameters (K-value selection, feature weighting) improve pattern discovery compared to fixed computational approaches?"

**RQ3: Visual Analytics for Medical Education**  
"How do coordinated views (overview dashboard, cluster network, case details) support exploratory analysis of medical diagnostic patterns?"

### Exploratory Goals

**G1: Interactive Machine Learning Pipeline**
Enable users to trigger and control K-means clustering with real-time visualization updates, demonstrating computational-visual integration.

**G2: Pattern Discovery Through Clustering**
Support identification of diagnostic patterns by grouping similar cases and revealing relationships between medical features.

**G3: Educational Case Exploration**
Provide intuitive navigation from statistical overviews to individual case details, supporting medical education workflows.

---

## 5. Solution Design

### Visualization Methods and Interactions

**Four Coordinated Views**:
1. **Overview Dashboard**: Statistical charts (pie charts for body systems, bar charts for imaging modalities, histograms for complexity) with interactive filtering controls
2. **Clustering Control Panel**: K-means parameter controls (K-value slider, feature selection checkboxes) with cluster quality metrics
3. **Cluster Network Visualization**: Interactive force-directed graph showing case clusters with color-coded groupings and zoom/pan controls
4. **Case Detail Explorer**: Searchable table with case information and detail-on-demand views for individual cases

**Key Interactions**:
- **Brushing and Linking**: Selections in network view highlight corresponding rows in case table
- **Dynamic Filtering**: Multi-attribute filters (body system, imaging type, complexity) update all views simultaneously  
- **Interactive Clustering**: User adjusts K-value → triggers clustering computation → network view updates in real-time
- **Detail-on-Demand**: Click any case node → opens detailed case information panel

### Computational Methods

**Core Machine Learning Pipeline**:
1. **Feature Engineering**: Convert case titles to TF-IDF vectors, combine with categorical features (body system, imaging modality, complexity score)
2. **Interactive K-means Clustering**: User-controlled clustering with K=2 to K=10, real-time computation and visualization updates
3. **Similarity Computation**: Cosine similarity between cases within clusters for network edge weights
4. **Cluster Quality Metrics**: Silhouette score and within-cluster sum of squares for cluster validation

**Interactive Computational Features**:
- Users select optimal K-value through elbow method visualization
- Feature weighting controls (text vs. categorical features)
- Cluster stability analysis across different parameter settings
- Export clustering results for further analysis

### Implementation Architecture

**Frontend**: Vue.js 3 with TypeScript for reactive UI components, D3.js for interactive network visualization and statistical charts
**Backend**: Express.js REST API serving case data and clustering results, with endpoints for triggering ML computations
**Data Processing**: Python scikit-learn for K-means clustering, exported results consumed by backend API
**Data Storage**: JSON-based case database with processed features, clusterings cached for performance
## 6. Sketches

### Data Analysis Pipeline
```
[Case JSON Data] → [Feature Engineering] → [TF-IDF + Categorical Features]
                          ↓
[User Selects K-value] → [K-means Clustering] → [Cluster Assignments + Quality Metrics]
                          ↓
[Network Layout Algorithm] → [Interactive Visualization] → [User Exploration]
```

### Software Architecture
```
┌──────────────────────────────────────────────────────────┐
│                Frontend (Vue.js + D3.js)                │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│ │ Overview        │ │ Clustering      │ │ Network         ││ 
│ │ Dashboard       │ │ Controls        │ │ Visualization   ││
│ └─────────────────┘ └─────────────────┘ └─────────────────┘│
│ ┌─────────────────┐                   ┌─────────────────┐ │
│ │ Case Detail     │                   │ Filter          │ │
│ │ Panel           │                   │ Controls        │ │
│ └─────────────────┘                   └─────────────────┘ │
└──────────────────────────────────────────────────────────┘
                        │ HTTP/REST API
┌──────────────────────────────────────────────────────────┐
│                Backend (Express.js)                      │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│ │ Cases API       │ │ Clustering API  │ │ Statistics API  ││
│ └─────────────────┘ └─────────────────┘ └─────────────────┘│
└──────────────────────────────────────────────────────────┘
                        │ Python Script Execution
┌──────────────────────────────────────────────────────────┐
│              Data Processing Layer                       │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│ │ Feature         │ │ K-means         │ │ Cluster         ││
│ │ Engineering     │ │ Algorithm       │ │ Validation      ││
│ └─────────────────┘ └─────────────────┘ └─────────────────┘│
└──────────────────────────────────────────────────────────┘
```

### User Interaction Flow
```
User Opens App → Overview Dashboard → Filter Cases by Attributes
         ↓
User Adjusts K-value Slider → Backend Triggers Clustering → Network Updates
         ↓
User Explores Clusters → Clicks Case Node → Detail Panel Opens
         ↓
User Compares Clusters → Identifies Patterns → Educational Insights
```

### Clustering Interaction Details
```
1. User sees current clustering (default K=3)
2. User moves K-value slider (K=2 to K=10)
3. System shows cluster quality metrics
4. User clicks "Update Clustering"
5. Backend runs scikit-learn K-means
6. Frontend receives new cluster assignments
7. Network visualization animates to new layout
8. Statistics update in real-time
```

## 7. Assignment of Responsibilities and Tasks

### Implementation Timeline (9-week project)

**Phase 1: Data Processing & Backend Foundation (Weeks 1-2)**
- Complete feature engineering pipeline (TF-IDF vectorization, categorical encoding)
- Implement K-means clustering with scikit-learn
- Create Express.js API endpoints for data serving and clustering
- Set up JSON data storage with processed features

**Phase 2: Core Visualization Development (Weeks 3-5)**  
- Build Vue.js dashboard with overview charts (Chart.js integration)
- Implement D3.js network visualization with force-directed layout
- Create clustering control panel with parameter sliders
- Develop case detail components and filtering interface

**Phase 3: Interactive Integration (Weeks 6-7)**
- Connect clustering controls to backend computation
- Implement real-time clustering updates and visualization refresh
- Add brushing and linking between coordinated views
- Integrate cluster quality metrics and validation

**Phase 4: Refinement & Evaluation (Weeks 8-9)**
- User interface polishing and responsive design
- Performance optimization for clustering computations
- Usability testing and interface improvements
- Documentation and final presentation preparation

### Technical Implementation Details

**Computational Components**:
- **Feature Engineering**: TF-IDF for case titles + one-hot encoding for categorical features
- **Clustering Algorithm**: Scikit-learn K-means with K=2 to K=10 range
- **Cluster Validation**: Silhouette analysis and elbow method for optimal K selection
- **API Integration**: RESTful endpoints for triggering clustering and retrieving results

**Visualization Components**:
- **Statistical Charts**: Vue.js + Chart.js for overview dashboard
- **Network Graph**: D3.js force simulation with interactive node positioning
- **Control Interface**: Vue.js reactive components for parameter adjustment
- **Coordinated Views**: Vuex state management for cross-component communication

### Evaluation Plan

**Functionality Testing**:
- Verify clustering algorithm produces meaningful medical case groupings
- Test interactive parameter controls trigger correct computational updates
- Validate coordinated view synchronization and filtering accuracy

**Usability Assessment**:
- Evaluate user ability to discover diagnostic patterns through clustering
- Assess ease of use for K-value selection and cluster interpretation
- Test educational value for medical case exploration scenarios

**Computational Validation**:
- Measure clustering quality using silhouette scores and medical expert review
- Test system performance with full 6,700 case dataset
- Verify scalability with additional data (10% growth scenario)

**Success Criteria**:
- Users can successfully identify and interpret medical case clusters
- Interactive clustering provides better pattern discovery than static analysis
- System handles real-time computation without significant performance degradation
