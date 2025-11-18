<template>
  <div class="filters-panel">
    <!-- Gender -->
    <div class="filter-group">
      <h4>Gender</h4>
      <div class="pill-group">
        <button
          v-for="g in ['Male', 'Female', 'Unknown']"
          :key="g"
          :class="['pill', modelValue.genders.includes(g) && 'active']"
          @click="toggleGender(g)"
        >
          {{ g }}
        </button>
      </div>
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

    <div class="filters-footer">
      <button class="reset-btn" @click="$emit('reset')">
        Reset filters
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
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

const toggleGender = (g: string) => {
  const genders = new Set(props.modelValue.genders)
  if (genders.has(g)) {
    genders.delete(g)
  } else {
    genders.add(g)
  }
  update({ genders: Array.from(genders) })
}

const onAgeMinInput = (raw: string) => {
  const num = raw === '' ? null : Number(raw)
  update({ ageMin: Number.isFinite(num) ? num : null })
}

const onAgeMaxInput = (raw: string) => {
  const num = raw === '' ? null : Number(raw)
  update({ ageMax: Number.isFinite(num) ? num : null })
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
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  width: 100%;
  box-sizing: border-box;
  gap: 1.2rem;
  background: white;
  padding: 1.25rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 1.75rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.filter-group h4 {
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: #2d3748;
}

.range-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.range-group input {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  font-size: 0.9rem;
  min-width: 0;
}

.pill-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.pill {
  border: 1px solid #cbd5e0;
  background: #edf2f7;
  color: #2d3748;
  border-radius: 20px;
  padding: 0.3rem 0.8rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all .15s ease;
}

.pill:hover {
  background: #e2e8f0;
}

.pill.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.push-bottom {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
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
  min-height: 36px;
}

.filters-footer {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.reset-btn {
  background: #edf2f7;
  color: #2d3748;
  border: 1px solid #cbd5e0;
  border-radius: 8px;
  padding: 0.4rem 0.9rem;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.reset-btn:hover {
  background: #e2e8f0;
}
</style>
