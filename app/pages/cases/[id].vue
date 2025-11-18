<template>
  <div class="case-detail-page">
    <div v-if="loading" class="loading">
      <div class="loader"></div>
      <p>Loading case details...</p>
    </div>

    <div v-else-if="error" class="error">
      <p>❌ Error loading case: {{ error }}</p>
      <NuxtLink to="/cases" class="back-btn">← Back to Cases</NuxtLink>
    </div>

    <div v-else-if="caseData" class="case-detail">
      <!-- Header -->
      <div class="case-header">
        <NuxtLink to="/cases" class="back-link">← Back to Cases</NuxtLink>
        <h1>{{ caseData.diagnosis }}</h1>
        <!-- ADD Metadata Chips -->
        <div v-if="detailChips.length > 0" class="metadata-chips">
          <div
            v-for="chip in detailChips"
            :key="chip.label"
            class="metadata-chip"
          >
            <span class="metadata-label">{{ chip.label }}</span>

            <!-- Regions: nested region + subregion pills -->
            <template v-if="chip.type === 'regions'">
              <div class="regions-list">
                <div
                  v-for="(subregions, regionName) in chip.value"
                  :key="regionName"
                  class="region-pill"
                >
                  <span class="region-name">{{ regionName }}</span>

                  <span
                    v-for="sub in subregions"
                    :key="regionName + '-' + sub"
                    class="subregion-pill"
                  >
                    {{ sub }}
                  </span>
                </div>
              </div>
            </template>

            <!-- Generic array chip (e.g. modalities) -->
            <template v-else-if="Array.isArray(chip.value)">
              <div class="chip-list">
                <span
                  v-for="(v, i) in chip.value"
                  :key="i"
                  class="chip-pill"
                >
                  {{ v }}
                </span>
              </div>
            </template>

            <!-- Single value chip -->
            <template v-else>
              <span class="chip-value">{{ chip.value }}</span>
            </template>
          </div>
        </div>

        <p class="case-id">Case ID: {{ caseData.id }}</p>
      </div>

      <!-- Image Gallery -->
      <div class="image-gallery">
        <div class="main-image">
          <img 
            v-if="selectedImage"
            :src="`${API_URL}/images/${selectedImage}`" 
            :alt="caseData.diagnosis"
            @error="handleImageError"
          />
          <div v-else class="no-image">
            <span>📋</span>
            <p>No images available</p>
          </div>
        </div>
        
        <div v-if="caseData.imagePaths && caseData.imagePaths.length > 1" class="thumbnail-strip">
          <div 
            v-for="(imagePath, index) in caseData.imagePaths" 
            :key="index"
            class="thumbnail"
            :class="{ active: selectedImage === imagePath }"
            @click="selectedImage = imagePath"
          >
            <img 
              :src="`${API_URL}/images/${imagePath}`" 
              :alt="`Image ${index + 1}`"
              @error="handleImageError"
            />
          </div>
        </div>
      </div>

      <!-- Case Information Tabs -->
      <div class="case-info-container">
        <div class="info-tabs">
          <button 
            v-for="tab in tabs" 
            :key="tab.id"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
            class="tab-btn"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="tab-content">
          <!-- History Tab -->
          <div v-if="activeTab === 'history'" class="info-section">
            <h3>📋 Patient History</h3>
            <p v-if="caseData.history">{{ caseData.history }}</p>
            <p v-else class="no-data">No history information available</p>
          </div>

          <!-- Exam Tab -->
          <div v-if="activeTab === 'exam'" class="info-section">
            <h3>🔬 Physical Examination</h3>
            <p v-if="caseData.exam">{{ caseData.exam }}</p>
            <p v-else class="no-data">No examination information available</p>
          </div>

          <!-- Findings Tab -->
          <div v-if="activeTab === 'findings'" class="info-section">
            <h3>🔍 Imaging Findings</h3>
            <p v-if="caseData.findings">{{ caseData.findings }}</p>
            <p v-else class="no-data">No findings information available</p>
          </div>

          <!-- Diagnosis Tab -->
          <div v-if="activeTab === 'diagnosis'" class="info-section">
            <h3>🩺 Case Diagnosis</h3>
            <div class="diagnosis-box">
              <p><strong>Diagnosis:</strong> {{ caseData.caseDiagnosis || caseData.diagnosis }}</p>
              <p v-if="caseData.diagnosisBy"><strong>Confirmed By:</strong> {{ caseData.diagnosisBy }}</p>
            </div>
            
            <div v-if="caseData.differentialDiagnosis" class="differential">
              <h4>Differential Diagnosis</h4>
              <p>{{ caseData.differentialDiagnosis }}</p>
            </div>
          </div>

          <!-- Treatment Tab -->
          <div v-if="activeTab === 'treatment'" class="info-section">
            <h3>💊 Treatment & Follow-Up</h3>
            <p v-if="caseData.treatment">{{ caseData.treatment }}</p>
            <p v-else class="no-data">No treatment information available</p>
          </div>

          <!-- Discussion Tab -->
          <div v-if="activeTab === 'discussion'" class="info-section">
            <h3>💬 Clinical Discussion</h3>
            <p v-if="caseData.discussion">{{ caseData.discussion }}</p>
            <p v-else class="no-data">No discussion available</p>
          </div>
        </div>
      </div>

      <!-- External Link -->
      <div class="external-link">
        <a :href="caseData.url" target="_blank" class="medpix-link">
          View on MedPix ↗
        </a>
      </div>
    </div>
    <DialogBox />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import DialogBox from '~/components/popup/DialogBox.vue'

const route = useRoute()

const config = useRuntimeConfig()
const API_URL = config.public.apiUrl
const { warning, success, error: showError } = useDialog()

interface CaseDetail {
  id: string
  url: string
  diagnosis: string
  caseTitle: string
  history: string
  exam: string
  findings: string
  caseDiagnosis: string
  diagnosisBy: string
  treatment: string
  discussion: string
  differentialDiagnosis: string
  imageCount: number
  imagePaths: string[]
  caseFolder: string
  patient_age?: number
  gender?: string
  modalities: string[]
  regions: Record<string, string[]>
}

const caseData = ref<CaseDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const selectedImage = ref<string | null>(null)
const activeTab = ref('history')

const tabs = [
  { id: 'history', label: 'History' },
  { id: 'exam', label: 'Examination' },
  { id: 'findings', label: 'Findings' },
  { id: 'diagnosis', label: 'Diagnosis' },
  { id: 'treatment', label: 'Treatment' },
  { id: 'discussion', label: 'Discussion' }
]

const pick = (obj: any, ...keys: string[]): any => {
  if (!obj) return null
  for (const key of keys) {
    if (obj[key] != null && obj[key] !== '') {
      return obj[key]
    }
  }
  return null
}

const detailChips = computed(() => {
  if (!caseData.value) return []

  const chips = [
    {
      label: 'Age',
      icon: '🗓️',
      value: pick(caseData.value, 'patientAge', 'patient_age')
    },
    {
      label: 'Gender',
      icon: '👤',
      value: pick(caseData.value, 'gender')
    },
    {
      label: 'Modalities',
      icon: '🖥️',
      value: Array.isArray(caseData.value.modalities)
        ? caseData.value.modalities.filter(Boolean)
        : []
    },
    {
      label: 'Regions',
      icon: '📍',
      type: 'regions',
      value: caseData.value.regions || {}
    }
  ]

  return chips.filter(chip => {
    if (chip.type === 'regions') {
      return chip.value && Object.keys(chip.value).length > 0
    }
    return Array.isArray(chip.value)
      ? chip.value.length > 0
      : chip.value != null && chip.value !== ''
  })
})


const loadCaseDetails = async () => {
  const caseId = route.params.id as string
  
  try {
    loading.value = true
    error.value = null
    
    console.log('Loading case with ID:', caseId)
    console.log('API URL:', `${API_URL}/api/cases/${caseId}`)
    
    const response = await fetch(`${API_URL}/api/cases/${caseId}`)
    
    console.log('Response status:', response.status)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('Case data loaded:', data)
    caseData.value = data
    
    // Set the first image as selected
    if (data.imagePaths && data.imagePaths.length > 0) {
      selectedImage.value = data.imagePaths[0]
    }
    success('Case Loaded', `Successfully loaded case details for ${data.diagnosis}`)

  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error'
    console.error('Error loading case details:', e)
    showError(
      'Load Failed',
      'An error occurred while loading case details. Would you like to try again?',
      {
        onConfirm: () => loadCaseDetails()
      }
    )
  } finally {
    loading.value = false
  }
}

// Watch for route changes and reload data
watch(() => route.params.id, () => {
  loadCaseDetails()
})

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement
  target.style.display = 'none'
}

const openMedPix = async () => {
  if (!caseData.value?.url) return
  
  try {
    const confirmed = await warning('External Link', 'This will open the MedPix website in a new tab. Continue?')
    
    if (confirmed) {
      window.open(caseData.value.url, '_blank')
      success('Link Opened', 'MedPix website opened in new tab')
    }
  } catch (e) {
    showError(
      'Link Open Failed',
      'An error occurred while opening the external link. Would you like to try again?',
      {
        onConfirm: () => window.open(caseData.value?.url, '_blank')
      }
    )
  }
}

onMounted(() => {
  loadCaseDetails()
})
</script>

<style scoped>
.case-detail-page {
  min-height: calc(100vh - 80px);
  background: #f5f7fa;
  padding: 2rem;
}

.loading, .error {
  text-align: center;
  padding: 4rem 2rem;
}

.loader {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.case-detail {
  max-width: 1200px;
  margin: 0 auto;
}

.case-header {
  margin-bottom: 2rem;  
}

.back-link {
  display: inline-flex;
  align-items: center;
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
  margin-bottom: 1rem;
  transition: color 0.3s;
}

.back-link:hover {
  color: #5568d3;
}

.case-header h1 {
  font-size: 2.5rem;
  color: #2d3748;
  margin-bottom: 1.5rem;
  font-weight: 700;
  line-height: 1.3;
}

.metadata-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgb(230, 241, 250);
  color: #2d3748;
  padding: 0.75rem 1.25rem;
  border-radius: 25px;
  font-size: 0.9rem;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.metadata-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  border-color: #667eea;
}

.chip-label {
  font-size: 0.7rem;
  color: #718096;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.chip-value {
  font-size: 1rem;
  color: #2d3748;
  font-weight: 600;
}

.metadata-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.chip-pill {
  background: #edf2f7;
  border: 1px solid #d5dbe4;
  border-radius: 12px;
  padding: 0.2rem 0.5rem;
  font-size: 0.8rem;
  color: #718096;
  font-weight: 600;
}

.regions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.region-pill {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  background: #e9f0ff;
  border: 1px solid #bfc5db;
  transition: all 0.2s ease;
}

.region-pill:hover {
  transform: translateY(-1px);
  background: #eef4ff;
  border-color: #667eea;
  box-shadow: 0 4px 10px rgba(102, 126, 234, 0.2);
}

.region-name {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #2d3748;
  margin-right: 0.25rem;
}

.subregion-pill {
  background: #edf2f7;
  border: 1px solid #d5dbe4;
  border-radius: 12px;
  padding: 0.2rem 0.5rem;
  font-size: 0.8rem;
  color: #718096;
  font-weight: 600;
}


.case-id {
  color: #718096;
  font-size: 0.95rem;
  font-style: italic;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.image-gallery {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.main-image {
  width: 100%;
  height: 500px;
  background: #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.main-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.no-image {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #a0aec0;
}

.no-image span {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.thumbnail-strip {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding: 0.5rem 0;
}

.thumbnail {
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  background: #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.3s;
}

.thumbnail:hover {
  border-color: #667eea;
  transform: translateY(-2px);
}

.thumbnail.active {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.case-info-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.info-tabs {
  display: flex;
  border-bottom: 2px solid #e2e8f0;
  overflow-x: auto;
}

.tab-btn {
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  color: #718096;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  border-bottom: 3px solid transparent;
  white-space: nowrap;
}

.tab-btn:hover {
  color: #667eea;
  background: #f7fafc;
}

.tab-btn.active {
  color: #667eea;
  border-bottom-color: #667eea;
  background: #f7fafc;
}

.tab-content {
  padding: 2rem;
}

.info-section h3 {
  font-size: 1.5rem;
  color: #2d3748;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-section p {
  color: #4a5568;
  line-height: 1.8;
  font-size: 1.05rem;
}

.no-data {
  color: #a0aec0;
  font-style: italic;
}

.diagnosis-box {
  background: #f7fafc;
  border-left: 4px solid #667eea;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.diagnosis-box p {
  margin-bottom: 0.75rem;
}

.diagnosis-box p:last-child {
  margin-bottom: 0;
}

.differential {
  margin-top: 1.5rem;
}

.differential h4 {
  font-size: 1.2rem;
  color: #2d3748;
  margin-bottom: 0.75rem;
}

.external-link {
  text-align: center;
}

.medpix-link {
  display: inline-block;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-decoration: none;
  border-radius: 50px;
  font-weight: 600;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  transition: all 0.3s;
}

.medpix-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.back-btn {
  padding: 0.75rem 2rem;
  background: #667eea;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  display: inline-block;
  transition: background 0.3s;
}

.back-btn:hover {
  background: #5568d3;
}


@media (max-width: 768px) {
  .case-header h1 {
    font-size: 1.75rem;
  }

  .main-image {
    height: 300px;
  }

  .info-tabs {
    flex-wrap: nowrap;
  }

  .tab-btn {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }

  .tab-content {
    padding: 1.5rem;
  }
}
</style>
