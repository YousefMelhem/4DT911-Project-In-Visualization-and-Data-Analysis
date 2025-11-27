<template>
  <div class="filters-panel">
    <div class="filters-header">
      <h3>Filters</h3>
      <p class="filter-hint">Refine your search</p>
    </div>
    
    <!-- Search -->
    <div class="filter-group search-group">
      <h4>Search</h4>
      <input
        type="text"
        :value="modelValue.query"
        placeholder="Search diagnoses..."
        @input="onQueryInput(($event.target as HTMLInputElement).value)"
      />
    </div>
    <!-- Gender -->
    <div class="filter-group push-bottom">
      <MultiSelect
        label="Gender"
        :options="['Male', 'Female', 'Unknown']"
        :model-value="modelValue.genders"
        @update:modelValue="onGendersChange"
      />
    </div>

    <!-- Age -->
    <div class="filter-group">
      <h4>Age range</h4>
      <div class="range-group">
        <input
          type="number"
          :value="modelValue.ageMin ?? ''"
          placeholder="Min"
          @input="onAgeMinInput(($event.target as HTMLInputElement).value)"
        />
        <span>–</span>
        <input
          type="number"
          :value="modelValue.ageMax ?? ''"
          placeholder="Max"
          @input="onAgeMaxInput(($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <!-- Modalities -->
    <div class="filter-group push-bottom">
      <MultiSelect
        label="Modalities"
        :options="allModalities"
        :model-value="modelValue.modalities"
        @update:modelValue="onModalitiesChange"
      />
    </div>

    <!-- Regions -->
    <div class="filter-group push-bottom">
      <MultiSelect
        label="Regions"
        :groups="regionGroups"
        :model-value="modelValue.regions"
        @update:modelValue="onRegionsChange"
      />
    </div>

    <!-- Date -->
    <div class="filter-group">
      <h4>Date added</h4>
      <div class="range-group">
        <input
          type="date"
          :value="modelValue.dateMin ?? ''"
          @input="onDateMinInput(($event.target as HTMLInputElement).value)"
        />
        <span>–</span>
        <input
          type="date"
          :value="modelValue.dateMax ?? ''"
          @input="onDateMaxInput(($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <!-- Text sections -->
    <div class="filter-group push-bottom">
      <MultiSelect
        label="Required text sections"
        :options="['History', 'Exam', 'Findings', 'Diagnosis', 'Treatment', 'Discussion']"
        :model-value="selectedTextSections"
        @update:modelValue="onTextSectionsChange"
      />
    </div>

    <!-- Word count -->
    <div class="filter-group">
    <h4>Number of words</h4>
    <div class="range-group">
        <input
        type="number"
        :value="modelValue.wordsMin ?? ''"
        placeholder="Min"
        @input="onWordsMinInput(($event.target as HTMLInputElement).value)"
        />
        <span>–</span>
        <input
        type="number"
        :value="modelValue.wordsMax ?? ''"
        placeholder="Max"
        @input="onWordsMaxInput(($event.target as HTMLInputElement).value)"
        />
    </div>
    </div>

    <!-- Image count -->
    <div class="filter-group">
    <h4>Number of images</h4>
    <div class="range-group">
        <input
        type="number"
        :value="modelValue.imageMin ?? ''"
        placeholder="Min"
        @input="onImageMinInput(($event.target as HTMLInputElement).value)"
        />
        <span>–</span>
        <input
        type="number"
        :value="modelValue.imageMax ?? ''"
        placeholder="Max"
        @input="onImageMaxInput(($event.target as HTMLInputElement).value)"
        />
    </div>
    </div>

    <div class="filters-footer">
      <button class="reset-btn" @click="$emit('reset')">
        Reset filters
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MultiSelect from '~/components/ui/MultiSelect.vue'
import type { Filters, RegionGroup } from '~/composables/useCaseFilters'

const props = defineProps<{
  modelValue: Filters
  allModalities: string[]
  regionGroups: RegionGroup[]
}>()

const emit = defineEmits<{
  'update:modelValue': [Filters]
  reset: []
}>()

const update = (patch: Partial<Filters>) => {
  emit('update:modelValue', {
    ...props.modelValue,
    ...patch,
  })
}

const onQueryInput = (val: string) => {
  update({ query: val })
}

const onGendersChange = (vals: string[]) => {
  update({ genders: vals })
}

// Computed property to convert boolean flags to array of selected sections
const selectedTextSections = computed(() => {
  const sections: string[] = []
  if (props.modelValue.hasHistory) sections.push('History')
  if (props.modelValue.hasExam) sections.push('Exam')
  if (props.modelValue.hasFindings) sections.push('Findings')
  if (props.modelValue.hasDiagnosis) sections.push('Diagnosis')
  if (props.modelValue.hasTreatment) sections.push('Treatment')
  if (props.modelValue.hasDiscussion) sections.push('Discussion')
  return sections
})

const onTextSectionsChange = (vals: string[]) => {
  update({
    hasHistory: vals.includes('History'),
    hasExam: vals.includes('Exam'),
    hasFindings: vals.includes('Findings'),
    hasDiagnosis: vals.includes('Diagnosis'),
    hasTreatment: vals.includes('Treatment'),
    hasDiscussion: vals.includes('Discussion'),
  })
}

const onAgeMinInput = (raw: string) => {
  const num = raw === '' ? null : Number(raw)
  update({ ageMin: Number.isFinite(num) ? num : null })
}

const onAgeMaxInput = (raw: string) => {
  const num = raw === '' ? null : Number(raw)
  update({ ageMax: Number.isFinite(num) ? num : null })
}

const onImageMinInput = (raw: string) => {
  const num = raw === '' ? null : Number(raw)
  update({ imageMin: Number.isFinite(num) ? num : null })
}

const onImageMaxInput = (raw: string) => {
  const num = raw === '' ? null : Number(raw)
  update({ imageMax: Number.isFinite(num) ? num : null })
}

const onWordsMinInput = (raw: string) => {
  const num = raw === '' ? null : Number(raw)
  update({ wordsMin: Number.isFinite(num) ? num : null })
}

const onWordsMaxInput = (raw: string) => {
  const num = raw === '' ? null : Number(raw)
  update({ wordsMax: Number.isFinite(num) ? num : null })
}


const onModalitiesChange = (vals: string[]) => {
  update({ modalities: vals })
}

const onRegionsChange = (vals: string[]) => {
  update({ regions: vals })
}

const onDateMinInput = (val: string) => {
  update({ dateMin: val || null })
}

const onDateMaxInput = (val: string) => {
  update({ dateMax: val || null })
}
</script>

<style scoped>

.filters-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

.filters-header {
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #667eea;
  margin-bottom: 0.25rem;
}

.filters-header h3 {
  font-size: 1rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 0.15rem;
}

.filter-hint {
  font-size: 0.7rem;
  color: #718096;
  margin: 0;
}

.filter-group {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding-bottom: 0.65rem;
  border-bottom: 1px solid #e5e7eb;
}

.filter-group:last-of-type {
  border-bottom: none;
  padding-bottom: 0;
}

.filter-group h4 {
  margin-bottom: 0.4rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: #2d3748;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.search-group input {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 1px solid #cbd5e0;
  border-radius: 5px;
  font-size: 0.85rem;
}

.range-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.range-group input {
  width: 100%;
  padding: 0.35rem 0.5rem;
  border: 1px solid #cbd5e0;
  border-radius: 5px;
  font-size: 0.85rem;
  min-width: 0;
}

.pill-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.pill {
  border: 1px solid #cbd5e0;
  background: #f7fafc;
  color: #2d3748;
  border-radius: 5px;
  padding: 0.4rem 0.6rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all .2s ease;
  text-align: left;
}

.pill:hover {
  background: #edf2f7;
  border-color: #667eea;
  transform: translateX(2px);
}

.pill.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.push-bottom {
  margin-top: 0.5rem;
}

input[type="date"]::-webkit-calendar-picker-indicator {
  opacity: 0;
  display: none;
}

input[type="date"] {
  appearance: none;
  -webkit-appearance: none;
  position: relative;
}

:deep(.ms) {
  width: 100%;
}

:deep(.ms-btn) {
  min-height: 32px;
  font-size: 0.85rem;
  padding: 0.35rem 0.6rem;
}

:deep(.ms-dropdown) {
  font-size: 0.85rem;
}

:deep(.ms-label) {
  font-size: 0.7rem;
  margin-bottom: 0.4rem;
}

.filters-footer {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 2px solid #e5e7eb;
}

.reset-btn {
  width: 100%;
  background: #fee;
  color: #c53030;
  border: 1px solid #fc8181;
  border-radius: 5px;
  padding: 0.5rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-btn:hover {
  background: #fc8181;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(252, 129, 129, 0.3);
}
</style>
