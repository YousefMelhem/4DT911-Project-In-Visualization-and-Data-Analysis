# Visual Analytics for Medical Diagnostic Pattern Discovery
## 4DT911 Project Proposal

---

## 1. Introduction
The dataset contain 7432 medical cases with a total of 40 900 medical images combination of images and clinical text.  Each case includes multiple related medical images (radiology, X-ray, CT scans, MRI, ultrasound) as well as detailed real-world diagnostic. These include patient history, physical examination findings, imaging interpretations, differential diagnoses, final diagnoses, and treatment plans. This provides a holistic view of each medical scenario. Dataset retrieved from Kaggle while the data originally comes from MedPix, which is an open database from National Institutes of Health (NIH). 

This project focuses on developing a visual analytics system for medical diagnostic pattern discovery. The goal is to support users in exploring complex medical cases by integrating and analyzing both visual and textual data.

### Data Source
The data originates from MedPix, a free open-access online database of medical cases developed by the Uniformed Services University of the Health Sciences. Each case includes:
- Multiple related medical images (radiology, CT scans, MRI, X-rays, ultrasounds)
- Comprehensive clinical narratives including patient history, physical examination findings, imaging results, differential diagnoses, final diagnoses, and treatment plans
- Verified medical case sources with URLs linking to original documentation
- Physician-written diagnostic reasoning and clinical discussions

### Real-World Representation
The dataset represents authentic medical diagnostic workflows where physicians analyze visual data (medical images) alongside clinical narratives (patient records, examination findings, lab results) to reach diagnostic conclusions. This mirrors the cognitive process of medical diagnosis that combines pattern recognition from medical imaging with clinical reasoning based on patient history and symptoms.

---

## 2. Motivation

### Problem Statement
Medical diagnosis is a complex cognitive process that requires integrating visual pattern recognition from medical imaging with clinical reasoning based on patient history, symptoms, and examination findings. Medical students, residents, and even experienced physicians can benefit from tools that help them:

1. **Discover diagnostic patterns** across similar cases
2. **Learn from visual similarities** in medical imaging
3. **Understand diagnostic reasoning** through case-based learning
4. **Explore differential diagnoses** by examining similar presentations

### Why This Problem Matters
- **Medical Education**: Current medical education relies heavily on individual case studies. A system that can reveal patterns across thousands of cases would accelerate learning and improve diagnostic accuracy.
- **Clinical Decision Support**: Physicians could benefit from rapid access to similar cases when facing challenging diagnoses.
- **Diagnostic Quality**: Pattern discovery across large medical datasets could reveal subtle diagnostic insights that individual case analysis might miss.
- **Knowledge Discovery**: Understanding relationships between clinical presentations, imaging findings, and diagnoses could lead to new medical insights.

### Broader Applications
The solution approach can be applied to:
- **Pathology slide analysis** for cancer diagnosis
- **Dermatology image databases** for skin condition diagnosis
- **Veterinary medicine** case databases
- **Legal case analysis** combining documents and evidence
- **Any domain** requiring multimodal pattern discovery combining images and textual narratives

---

## 3. Data Report

### Dataset Scale
- **Total Cases**: 7,432 medical cases
- **Total Images**: 40,900 medical images
- **Coverage**: 99.9% of cases include medical images
- **Data Quality**: 100% of cases include verified source URLs and case folders

### Image Characteristics
- **Images per Case**: 
  - Average: 5.5 images per case
  - Median: 4.0 images per case
  - Range: 1-184 images per case
- **Image Types**: JPEG format medical images including CT scans, MRI, X-rays, ultrasounds, angiography, PET scans, mammography

### Clinical Data Dimensions

#### Textual Features
- **Diagnosis Coverage**: 99.7% of cases (7,406 cases) include extracted diagnoses
- **Text Content**: 
  - Average case description: 1,583 characters
  - Median case description: 851 characters
  - Range: 37-62,497 characters
- **Clinical Sections**: Case title, patient history, physical examination, imaging findings, differential diagnosis, final diagnosis, treatment plans, clinical discussions

#### Demographics
- **Age Information**: Available for 60.6% of cases (4,502 cases)
  - Age Range: 1-94 years
  - Average Age: 34.3 years
  - Distribution: Pediatric (29.6%), Young Adult (32.1%), Middle Age (27.1%), Elderly (11.2%)
- **Gender Information**: Available for 81.6% of cases
  - Male: 52.8%, Female: 47.2%

#### Medical Specialties
**Top Anatomical Regions** (by frequency):
1. Disc-related conditions (4,180 cases)
2. Head/Neurological (1,391 cases)
3. Bone/Orthopedic (1,272 cases)
4. Chest/Pulmonary (880 cases)
5. Abdominal (870 cases)

**Imaging Modalities**:
- CT: 4,868 mentions
- MRI: 3,655 mentions  
- Ultrasound: 1,115 mentions
- Radiography: 677 mentions
- Angiography: 238 mentions

**Top Diagnoses**:
1. Osteochondroma (84 cases)
2. Meningioma (30 cases)
3. Osteosarcoma (28 cases)
4. Bicornuate Uterus (24 cases)
5. Osteomyelitis (24 cases)

### Data Preprocessing Status
The dataset is relatively clean but requires preprocessing for analysis:
- **Text normalization**: Standardizing medical terminology and diagnosis names
- **Image standardization**: Resizing and normalizing medical images for computer vision analysis
- **Feature extraction**: Converting clinical text into structured features
- **Data linking**: Ensuring proper relationships between images and clinical narratives

---

## 4. Research Questions and Goals

### Primary Research Questions

**RQ1: Pattern Discovery**
"What visual and clinical patterns exist across similar medical diagnoses, and how can these patterns be discovered and visualized to support diagnostic learning?"

**RQ2: Multimodal Similarity**
"How can we effectively combine medical image similarity with clinical text similarity to identify cases that are diagnostically relevant to a given query case?"

**RQ3: Diagnostic Reasoning Support**
"Can visualization of similar cases and their diagnostic pathways improve medical students' and physicians' diagnostic accuracy and confidence?"

### Secondary Goals

**G1: Interactive Exploration**
Enable users to interactively explore the medical case database through multiple entry points (symptoms, images, diagnoses, patient demographics) with seamless navigation between related cases.

**G2: Educational Workflow Support**
Provide progressive case revelation functionality that supports medical education by allowing students to work through diagnostic reasoning step-by-step.

**G3: Pattern Validation**
Implement computational methods to validate discovered patterns against established medical knowledge and identify potentially novel diagnostic insights.

---

## 5. Solution Design

### Visualization Methods and Interactions

#### Primary Visualizations

**1. Case Similarity Network**
- **Method**: Force-directed graph layout showing case relationships
- **Interactions**: 
  - Node selection reveals case details
  - Edge filtering by similarity type (visual vs. textual)
  - Zoom and pan for multi-scale exploration
  - Clustering controls to group similar cases

**2. Medical Image Gallery with Smart Filtering**
- **Method**: Grid-based image layout with hierarchical organization
- **Interactions**:
  - Multi-dimensional filtering (diagnosis, body system, imaging modality, demographics)
  - Image comparison mode (side-by-side viewing)
  - Magnification and annotation overlay
  - Similarity-based sorting

**3. Diagnostic Pathway Visualization**
- **Method**: Sankey diagrams showing symptom→finding→diagnosis flows
- **Interactions**:
  - Path highlighting for specific diagnostic journeys
  - Statistical overlays showing probability distributions
  - Filtering by patient demographics or case complexity

**4. Feature Space Exploration**
- **Method**: t-SNE/UMAP embeddings of image and text features
- **Interactions**:
  - Brushing and linking between feature space and case details
  - Dynamic clustering with adjustable parameters
  - Overlay categorical variables (diagnosis, age group, etc.)

#### Secondary Visualizations

**5. Case Timeline and Progression**
- **Method**: Horizontal timeline showing diagnostic workflow
- **Interactions**: Step-by-step revelation for educational use

**6. Comparative Analysis Dashboard**
- **Method**: Small multiples for case comparison
- **Interactions**: Synchronized views across multiple cases

### Machine Learning and Computational Methods

#### Image Analysis Pipeline
**1. Deep Learning Feature Extraction**
- **Method**: Pre-trained Convolutional Neural Networks (ResNet-50, VGG-16) fine-tuned on medical images
- **Purpose**: Extract visual features for similarity computation
- **Implementation**: Transfer learning from ImageNet with medical image fine-tuning

**2. Image Similarity Clustering**
- **Method**: K-means and hierarchical clustering on CNN features
- **Purpose**: Group visually similar medical images
- **Validation**: Medical expert review of clustering quality

#### Text Analysis Pipeline
**1. Natural Language Processing**
- **Method**: BERT-based embeddings for medical text (ClinicalBERT, BioBERT)
- **Purpose**: Convert clinical narratives to semantic vectors
- **Features**: Symptom extraction, diagnosis standardization, clinical entity recognition

**2. Topic Modeling**
- **Method**: Latent Dirichlet Allocation (LDA) and BERTopic
- **Purpose**: Discover thematic patterns in clinical descriptions
- **Application**: Identify common diagnostic patterns and symptom clusters

#### Multimodal Integration
**1. Case Similarity Computation**
- **Method**: Weighted combination of image and text similarity scores
- **Algorithm**: Cosine similarity with learnable weights
- **Optimization**: User feedback-based weight adjustment

**2. Recommendation System**
- **Method**: Collaborative filtering combined with content-based recommendations
- **Purpose**: Suggest similar cases for educational and diagnostic support
- **Evaluation**: Medical expert assessment of recommendation relevance

#### Dimensionality Reduction and Visualization
**1. Embedding Computation**
- **Method**: t-SNE and UMAP for high-dimensional feature visualization
- **Purpose**: Create 2D representations of case similarity space
- **Parameters**: Adaptive perplexity and nearest neighbors based on data structure

### Implementation Architecture

#### Technology Stack
**Frontend**: 
- React.js for component-based UI development
- D3.js for custom medical visualizations
- Three.js for 3D network visualization
- Material-UI for consistent design system

**Backend**:
- Python Flask/FastAPI for REST API development
- PostgreSQL for structured medical data storage
- Redis for caching similarity computations
- Elasticsearch for fast text search and filtering

**Machine Learning**:
- PyTorch for deep learning model development
- Scikit-learn for traditional ML algorithms
- Transformers library for BERT-based text analysis
- OpenCV for medical image preprocessing

**Infrastructure**:
- Docker containerization for deployment
- AWS/Google Cloud for scalable hosting
- GPU acceleration for model inference

#### Software Architecture Components

**Data Layer**:
- Medical case database (PostgreSQL)
- Image storage with CDN (AWS S3 + CloudFront)
- Precomputed similarity matrices (Redis)
- Search indices (Elasticsearch)

**API Layer**:
- Case retrieval and filtering endpoints
- Similarity computation services
- Image processing pipeline
- User interaction logging

**Computation Layer**:
- Image feature extraction service
- Text embedding computation
- Similarity matrix updates
- Machine learning model training

**Frontend Layer**:
- Interactive visualization components
- Case detail views
- Filtering and search interfaces
- Educational workflow management

---

## 6. Sketches

### Data Analysis Pipeline
```
[Medical Images] → [CNN Feature Extraction] → [Image Embeddings]
                                                      ↓
[Clinical Text] → [BERT Text Processing] → [Text Embeddings]
                                                      ↓
[Image + Text Embeddings] → [Similarity Computation] → [Case Relationships]
                                                      ↓
[Dimensionality Reduction] → [Interactive Visualizations]
```

### Software Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Vue)                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │ Image Gallery   │  │ Network View    │  │ Case Details    ││
│  │ Component       │  │ Component       │  │ Component       ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (Flask/FastAPI)               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │ Case API        │  │ Similarity API  │  │ Search API      ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Computation Layer                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │ ML Models       │  │ Similarity      │  │ Feature         ││
│  │ (PyTorch)       │  │ Engine          │  │ Extraction      ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │ PostgreSQL      │  │ Image Storage   │  │ Redis Cache     ││
│  │ (Cases/Meta)    │  │ (AWS S3)        │  │ (Similarities)  ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### User Interaction Flow
```
User Query → [Search Interface] → [Filter Processing] → [Similarity Computation]
                                                              ↓
User Selection ← [Results Display] ← [Ranking & Filtering] ← [Similar Cases]
      ↓
[Case Detail View] → [Image Viewer] → [Related Cases] → [Educational Mode]
      ↓
[Annotation/Notes] → [Learning Progress] → [Performance Analytics]
```

### Component Data Flow
```
1. User searches for "chest pain" 
   → Text search in Elasticsearch
   → Returns matching case IDs

2. User selects a case
   → Triggers similarity computation
   → Backend computes image + text similarities
   → Returns ranked similar cases

3. User explores similar cases
   → Frontend updates network visualization
   → Highlights related nodes and edges
   → Updates image gallery with similar images

4. User compares cases
   → Loads case details in parallel
   → Synchronizes image viewers
   → Displays diagnostic comparison table
```

---

## 7. Assignment of Responsibilities and Tasks

*Note: This section would be filled based on your team composition. Here's a template structure:*

### Team Member Roles

#### Frontend Developer(s)
**Primary Responsibilities:**
- React.js application development
- D3.js visualization implementation
- User interface design and usability testing
- Integration with backend APIs

**Key Tasks:**
- Implement interactive medical image gallery
- Develop case similarity network visualization
- Create responsive case detail views
- Design educational workflow interfaces

#### Backend Developer(s)
**Primary Responsibilities:**
- REST API development and optimization
- Database design and management
- Image processing pipeline
- System architecture and deployment

**Key Tasks:**
- Build case retrieval and filtering APIs
- Implement image storage and serving
- Design efficient similarity computation
- Set up cloud infrastructure

#### Machine Learning Engineer(s)
**Primary Responsibilities:**
- Model development and training
- Feature extraction pipelines
- Similarity algorithm optimization
- Performance evaluation

**Key Tasks:**
- Fine-tune CNN models for medical images
- Implement BERT-based text analysis
- Develop multimodal similarity metrics
- Validate model performance with domain experts

#### Data Engineer/Analyst
**Primary Responsibilities:**
- Data preprocessing and cleaning
- Feature engineering
- Quality assurance
- Performance monitoring

**Key Tasks:**
- Clean and standardize medical text data
- Implement image preprocessing pipeline
- Create data validation frameworks
- Monitor system performance metrics

### Shared Responsibilities
- Weekly team meetings and progress reviews
- Code review and quality assurance
- Documentation and testing
- User evaluation planning and execution
- Final presentation and demonstration preparation

### Project Timeline
- **Weeks 1-2**: Data preprocessing and initial analysis
- **Weeks 3-4**: Core ML model development and API foundation
- **Weeks 5-6**: Frontend visualization development
- **Weeks 7-8**: Integration and system testing
- **Weeks 9-10**: User evaluation and refinement
- **Weeks 11-12**: Final documentation and presentation

---

## Conclusion

This project addresses a significant challenge in medical education and clinical decision support by combining advanced machine learning techniques with intuitive visualization methods. The comprehensive MedPix dataset provides an ideal foundation for developing and evaluating novel approaches to multimodal medical data analysis. The proposed solution has the potential to advance both visual analytics research and medical education practice, while providing a framework applicable to other domains requiring complex pattern discovery across multimodal data.
