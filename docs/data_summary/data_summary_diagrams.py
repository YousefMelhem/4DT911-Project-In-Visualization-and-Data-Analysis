import json
import numpy as np
import matplotlib.pyplot as plt
import os

import sys

# Require user to specify the path to the medical data folder as a command-line argument
if len(sys.argv) > 1:
    medical_data_dir = sys.argv[1]
else:
    print("Error: Please provide the path to the medical data folder as a command-line argument.\n"
          "Example: python data_summary_diagrams.py D:/path/to/medical")
    sys.exit(1)


# Set output directory for all images: 'img' directory next to this script
output_dir = os.path.join(os.path.dirname(__file__), 'img')
os.makedirs(output_dir, exist_ok=True)
def outpath(filename):
    return os.path.join(output_dir, filename)





# Distribution of Images per Case
json_path = os.path.join(medical_data_dir, 'Cases.json')
with open(json_path, 'r', encoding='utf-8') as f:
    cases = json.load(f)
img_counts = [len(case['Image Paths']) for case in cases if 'Image Paths' in case]
img_counts = np.array(img_counts)

# Cap all img_counts >=25 to 25
img_counts_capped = np.copy(img_counts)
img_counts_capped[img_counts_capped >= 25] = 25

bins = np.arange(0, 26) - 0.5
bins = np.append(bins, [25.5])

plt.figure(figsize=(9,4))
n, _, _ = plt.hist(img_counts_capped, bins=bins, color='#4F81BD', edgecolor='black', linewidth=0.5, alpha=0.8)
plt.grid(axis='y', linestyle='--', linewidth=0.7, color='#888888', alpha=0.9)

mean_val = np.mean(img_counts)
median_val = np.median(img_counts)
plt.axvline(mean_val, color='orange', linestyle='dashed', linewidth=2.0, label=f'Mean ({mean_val:.2f})')
plt.axvline(median_val, color='red', linestyle='dashed', linewidth=2.0, label=f'Median ({median_val:.2f})')

xticks = list(range(0, 26))
xticklabels = [str(x) for x in range(0, 25)] + ['25+']
plt.xticks(xticks, xticklabels, rotation=0)

plt.title(f'Distribution of Images per Case\nFull range: {img_counts.min()}–{img_counts.max()}')
plt.xlabel('Number of Images')
plt.ylabel('Number of Cases')
plt.legend()
plt.tight_layout()
plt.savefig(outpath('images_per_case_distribution.png'))
plt.close()



# Text Length Histogram (Log X)
text_lengths = [len(case.get('Case Title', '')) for case in cases if 'Case Title' in case]

plt.figure(figsize=(7,4))
bins = np.logspace(np.log10(max(1, np.min(text_lengths))), np.log10(np.max(text_lengths)+1), 30)
plt.hist(text_lengths, bins=bins, color='#4F81BD', edgecolor='black', alpha=0.8)
plt.grid(axis='y', linestyle='--', linewidth=0.7, color='#888888', alpha=0.9)
plt.xscale('log')

min_tick = int(np.min(text_lengths))
max_tick = int(np.max(text_lengths))
xticks = [min_tick, 100, 300, 1000, 3000, 10000, max_tick]
xticklabels = [str(min_tick), '100', '300', '1,000', '3,000', '10,000', str(max_tick)]
plt.xticks(xticks, xticklabels, rotation=0)

mean_text = np.mean(text_lengths)
median_text = np.median(text_lengths)
plt.axvline(mean_text, color='orange', linestyle='dashed', linewidth=2.0, label=f'Mean ({mean_text:.2f})')
plt.axvline(median_text, color='red', linestyle='dashed', linewidth=2.0, label=f'Median ({median_text:.2f})')

plt.title('Distribution of Case Description Lengths')
plt.xlabel('Number of Characters (log scale)')
plt.ylabel('Number of Cases')
plt.legend()
plt.tight_layout()
plt.savefig(outpath('case_description_length_hist.png'))
plt.close()



# Top Anatomical Regions
plt.figure(figsize=(7,4))
regions = ['Disc-related', 'Head/Neuro', 'Bone/Ortho', 'Chest/Pulm', 'Abdominal']
region_counts = [4180, 1391, 1272, 880, 870]
plt.bar(regions, region_counts, color=plt.cm.Set2.colors)
plt.grid(axis='y', linestyle='--', linewidth=0.7, color='#888888', alpha=0.9)
plt.title('Top Anatomical Regions')
plt.ylabel('Number of Cases')
plt.tight_layout()
plt.savefig(outpath('regions_bar.png'))
plt.close()



# Imaging Modalities
plt.figure(figsize=(7,4))
modalities = ['CT', 'MRI', 'Ultrasound', 'Radiography', 'Angiography']
modality_counts = [4868, 3655, 1115, 677, 238]
plt.bar(modalities, modality_counts, color=plt.cm.Set2.colors)
max_modality = max(modality_counts)
yticks_modality = list(range(0, int((max_modality + 499) // 500 * 500 + 500), 500))
plt.yticks(yticks_modality)
plt.grid(axis='y', which='both', linestyle='--', linewidth=0.7, color='#888888', alpha=0.9)
plt.title('Imaging Modalities')
plt.ylabel('Mentions')
plt.tight_layout()
plt.savefig(outpath('modalities_bar.png'))
plt.close()



# Top Diagnoses
plt.figure(figsize=(7,4))
diagnoses = ['Osteochondroma', 'Meningioma', 'Osteosarcoma', 'Bicornuate Uterus', 'Osteomyelitis']
diagnosis_counts = [84, 30, 28, 24, 24]
plt.bar(diagnoses, diagnosis_counts, color=plt.cm.Set2.colors)
plt.grid(axis='y', linestyle='--', linewidth=0.7, alpha=0.7)
plt.title('Top Diagnoses')
plt.ylabel('Number of Cases')
plt.tight_layout()
plt.savefig(outpath('diagnoses_bar.png'))
plt.close()



# Age bar chart
age_labels = ['Pediatric\n(0-17)', 'Young Adult\n(18-35)', 'Middle Age\n(36-64)', 'Elderly\n(65-94)', 'Unknown']
age_percentages_proposal = [29.6, 32.1, 27.1, 11.2]
age_avail_frac = 0.606
age_percentages_true = [round(p * age_avail_frac, 1) for p in age_percentages_proposal]
age_unknown_pct = round(100 - sum(age_percentages_true), 1)
age_percentages_full = age_percentages_true + [age_unknown_pct]
age_colors = list(plt.cm.Set2.colors)[:4] + ['#CCCCCC']

plt.figure(figsize=(6,4))
bars0 = plt.bar(age_labels, age_percentages_full, color=age_colors)

max_age = max(age_percentages_full)
ylim_age = int((max_age + 4.99) // 5 * 5 + 5)
plt.ylim(0, ylim_age)
plt.yticks(range(0, ylim_age + 1, 5))
plt.grid(axis='y', which='both', linestyle='--', linewidth=0.7, color='#888888', alpha=0.9)
for bar, pct in zip(bars0, age_percentages_full):
    plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1, f'{pct:.1f}%', ha='center', va='bottom', fontsize=11)

plt.title('Age Distribution')
plt.ylabel('Percent of Cases')
plt.tight_layout()
plt.savefig(outpath('age_bar.png'))
plt.close()




# Gender bar chart
gender_labels = ['Male', 'Female', 'Unknown']
gender_percentages_proposal = [52.8, 47.2]
gender_avail_frac = 0.816
gender_percentages_true = [round(p * gender_avail_frac, 1) for p in gender_percentages_proposal]
gender_unknown_pct = round(100 - sum(gender_percentages_true), 1)
gender_percentages_full = gender_percentages_true + [gender_unknown_pct]
gender_colors = ['#4F81BD', '#F28E2B', '#CCCCCC']

plt.figure(figsize=(4.5,4))
bars1 = plt.bar(gender_labels, gender_percentages_full, color=gender_colors)

max_gender = max(gender_percentages_full)
ylim_gender = int((max_gender + 4.99) // 5 * 5 + 5)
plt.ylim(0, ylim_gender)
plt.yticks(range(0, ylim_gender + 1, 5))
plt.grid(axis='y', which='both', linestyle='--', linewidth=0.7, color='#888888', alpha=0.9)
for bar, pct in zip(bars1, gender_percentages_full):
    plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1, f'{pct:.1f}%', ha='center', va='bottom', fontsize=11)

plt.title('Gender Distribution')
plt.ylabel('Percent of Cases')
plt.tight_layout()
plt.savefig(outpath('gender_bar.png'))
plt.close()
