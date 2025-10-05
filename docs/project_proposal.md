 
 
Project Proposal 
Group A 
 
 
 
  
 
 


Introduction  
This project proposes the design and implementation of a visual analytics 
system that enables medical students and practitioners to explore diagnostic 
cases in an interactive and data-driven way. The focus is on multimodal data, 
combining medical images with clinical narratives and patient metadata. The 
datasets used originate from MedPix (NIH) and a complementary Kaggle 
medical analysis dataset, both of which provide thousands of real-world 
diagnostic cases across a wide range of modalities such as CT, MRI, X-ray, 
and ultrasound. 
 
The primary aim of the system is to combine computational methods—such 
as clustering, similarity search, and dimensionality reduction—with 
interactive visualizations. In doing so, it will support users in identifying 
diagnostic patterns, retrieving similar cases, and developing a deeper 
understanding of how different clinical and demographic factors relate to 
medical diagnoses. 
 
Motivation 
Medical diagnosis is a cognitively demanding task because it requires the 
integration of visual inspection of images with contextual information 
derived from patient history, demographics, and examination notes. For 
students, the ability to explore and compare large case collections can 
accelerate the learning of diagnostic reasoning. For practitioners, access to 
similar cases can support decision-making in complex scenarios. 
 
Currently, searching for relevant diagnostic cases is often limited to 
keyword-based queries or static case collections. This approach fails to 
capture the richness of multimodal data and makes it difficult to uncover 
hidden structures or relationships in the dataset. A visual analytics system 
that allows users to interactively explore both the statistical distributions of 
cases and their similarity relationships has the potential to enhance both 
education and clinical practice. 
 
Data Report 
The dataset represents authentic medical diagnostic workflows where 
physicians analyze visual data (medical images) alongside clinical narratives 
(patient records, examination findings, lab results) to reach diagnostic 
conclusions. This mirrors the cognitive process of medical diagnosis that 
 
 
 
 
 


combines pattern recognition from medical imaging with clinical reasoning 
based on patient history and symptoms 
 
Data Source 
The data originates from MedPix, a free open-access online database of 
medical cases developed by the Uniformed Services University of the Health 
Sciences. Each case includes: 
1. Multiple related medical images  
2. Comprehensive clinical narratives including patient history, physical 
examination findings, imaging results, differential diagnoses, final 
diagnoses, and treatment plans 
3. Verified medical case sources with URLs linking to original 
documentation 
4. Physician-written diagnostic reasoning and clinical discussions
 
 
 
 
 


 
Dataset Scale 
The dataset comprises 7,432 medical cases and 40,900 medical images, with 
nearly complete image coverage (99.9%). Each case is supported by verified 
source URLs and case folders, ensuring data reliability and quality. 
 
Textual Features 
Diagnosis Coverage: 99.7% of cases (7,406 cases) include extracted 
diagnoses.  To understand the scale and quality of the dataset, we analyzed 
the length of the textual descriptions. This helps us see how detailed the 
clinical information is and how reliable the data will be for our project. 
 
Figure 1: Distribution of case description lengths 
 
In addition to the extensive image coverage and high-quality metadata, each 
case is organized into structured clinical sections, including the case title, 
patient history, physical examination, imaging findings, differential 
diagnosis, final diagnosis, treatment plans, and clinical discussions. Together, 
these components ensure that the dataset provides not only breadth and depth 
of clinical information but also a consistent framework for comprehensive 
analysis.
 
 
 
 
 
 


Medical Specialties 
To better understand the dataset, we looked at the distribution of cases across 
medical specialties. The figure below shows the top anatomical regions 
represented in the data. 
 
 
Figure 2: Distribution of cases across the top anatomical regions 
 
1. Disc-related conditions (4,180 cases) 
2. Head/Neurological (1,391 cases) 
3. Bone/Orthopedic (1,272 cases) 
4. Chest/Pulmonary (880 cases) 
5. Abdominal (870 cases) 
 
 
 
Images per Case 
 
- 
Average: 5.5 images per case 
- 
Median: 4.0 images per case 
- 
Range: 0-184 images per case 
Where Image Types are JPEG format medical images including CT scans, 
MRI, X-rays, ultrasounds, angiography, PET scans, mammography. 
 
 
 
 
 


 
Figure 3: Distribution of images per case 
 
Demographics Overview 
 
Age data were available for 60.6% of cases (4,502 in total), with patients 
ranging from 1 to 94 years and an average age of 34.3 years. The distribution 
was as follows: pediatric (17.9%), young adult (19.5%), middle-aged 
(16.4%), elderly (6.8%), and unknown (39.4%). Gender information was 
available for 81.6% of cases, showing a near-balanced distribution between 
males (43.1%) and females (38.5%), as well as 18.4% unknown. 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
Figure 4: Age distribution of cases 
                                        Figure 5: Gender distribution of cases 
 
 
 
 
 
 
 
 


 
Research Questions and Goals 
The project is structured around three main research questions: 
 
a. Research Questions 
1. What visual and clinical patterns can we find in the MedPix dataset 
(like X-rays, CT scans, MRIs)? How can we show these patterns to 
help with diagnosis and learning? 
 
2.  How can we combine medical images and clinical notes to find 
similar, relevant cases for any given patient? 
 
3. How are diagnoses connected to different body regions and patient 
details like age and gender? 
 
 
b. Goals 
G1: Develop a system that simulates the clinical diagnostic workflow, 
from patient presentation and image review, to differential diagnosis 
and final reasoning. 
 
G2: Combine image features and clinical text to create meaningful 
similarity measures, enabling users to find diagnostically relevant 
cases for any given query. 
 
 
 
 
 
 


 
Solution Design 
The solution combines computational methods with interactive visualization 
in a tightly integrated system. On the computational side, textual case 
descriptions will be transformed into embeddings using language models, 
while image embeddings will be derived from pretrained convolutional or 
transformer-based networks. These will be combined with encoded metadata 
into multimodal vectors. Based on these representations, the system will 
support similarity search through cosine distance, clustering using algorithms 
such as K-means or DBSCAN, and dimensionality reduction with UMAP or 
t-SNE for visualization purposes. Cluster validation measures such as 
silhouette score will provide users with feedback about the quality of 
groupings. 
 
On the visualization side, the system will provide several coordinated views. 
A case gallery will allow users to search and filter cases based on attributes 
such as age, gender, body region, or modality. An embedding map will 
project cases into two dimensions, allowing clusters and similarity 
relationships to be explored interactively. A similarity panel will return cases 
most related to a selected query, with sliders enabling the user to balance the 
influence of textual versus visual features. Finally, a dashboard of statistical 
charts will highlight demographic and regional distributions, while a case 
detail panel will provide drill-down access to individual cases, including both 
images and clinical notes. 
 
Interaction is a central part of the design: filtering and brushing in one view 
will update the others, similarity searches will dynamically recompute based 
on user-selected parameters, and parameter sliders for clustering and feature 
weighting will trigger computational updates in real time. This tight coupling 
of computation and visualization will support exploratory workflows where 
users move seamlessly from broad overviews to detailed case inspections. 
Visualization Methods and Interactions 
 
1. Image Gallery (Starting View) 
- 
What: Displays a grid of case thumbnails. 
- 
 How to use: Use the search bar and filters (modality, body 
region, diagnosis, age, gender) to narrow results. Click a card 
to view a case. 
- 
Why: It lets you quickly explore and spot visual patterns in the 
dataset. (Addresses RQ1 & RQ3) 
2. Similar Cases Panel 
 
 
 
 
 


- 
What: Shows a list or grid of cases similar to the one you’re 
viewing. 
- 
How to use: Adjust a slider to balance similarity by image or 
text; click to jump to another case. 
- 
Why: Helps you find relevant cases using both images and 
notes. (Addresses RQ2) 
3. Trend Dashboard 
- 
What: Presents small charts, such as a bar chart for diagnoses 
by body region, an age histogram, and gender distribution. 
- 
How to use: Click on any bar or bin to filter the image gallery. 
- 
Why: Quickly reveals demographic and regional trends, while 
allowing focused exploration. (Addresses RQ3) 
 
 
Computational Methods 
1. Text analysis: Clinical notes will be converted into sentence 
embeddings, producing a fixed-length vector that represents the 
medical meaning of each case. 
 
2. Image analysis: Features will be extracted from medical images and 
aggregated into a single vector per case, capturing relevant visual 
patterns. 
 
3. Similarity search: Combined text and image embeddings will be 
compared using distance measures to retrieve cases most similar to a 
selected query. 
 
4. Clustering: Case embeddings will be grouped to reveal recurring 
diagnostic patterns across patient demographics, body regions, and 
specialties. 
 
5. Dimensionality reduction: High-dimensional embeddings will be 
projected into two dimensions, enabling interactive visualization of 
relationships between cases. 
 
 
 
 
 
 
 


Implementation Plan 
The system will follow a client–server architecture. The frontend, developed 
in Vue.js with D3.js, will implement the coordinated visualizations. The 
backend, built with FastAPI in Python, will handle requests for clustering, 
similarity search, and case data retrieval. Computational components will rely 
on libraries such as PyTorch for embedding extraction and scikit-learn for 
clustering and dimensionality reduction. Case metadata will be stored in 
JSON or CSV files, while images will be stored on disk. 
Implementation Details 
Frontend Web App 
- 
What: Vue UI for Gallery, Case page, Similar Cases, and 
Trends. 
- 
Why: Vue is simple, fast, and integrates well with Node.js, 
keeping a clear separation from the Python backend 
 
 
Backend  
- 
What: We use FastAPI (Python) to provide endpoints for 
cases, case details, similar cases, and trend statistics. 
- 
Why: FastAPI is lightweight, works well with Python data and 
machine learning libraries, and easily connects our MedPix 
dataset to the frontend. 
 
 
Data & Storage 
- 
What: Case metadata stored in CSV or JSON files, and 
medical images stored on disk in an images/ folder. 
- 
Why: Easiest setup, no database server needed, just files that 
can be read directly by the backend. 
 
 
 
 
 
 
 


 
Sketches 
 
Computational Pipeline 
 
 
 
 
 
 
 
 


FrontEnd 
 
User Interactions and Data Flow 
 
 
 
 
 
 


Assignment of Responsibilities and Tasks  
 
Our team will work together at every stage of the project, instead of splitting 
tasks by front-end, back-end, or machine learning. This way, everyone learns 
all aspects of the workflow and knowledge is shared. 
 
 
 
 
 
 


 
 
The URL to the data:  
A. Ahmed, Medical Analysis Dataset, Kaggle, 2022. [Online]. Available: 
https://www.kaggle.com/datasets/ahmedsta/medical-analysis/data  
 
 
 
 
 
 
 
