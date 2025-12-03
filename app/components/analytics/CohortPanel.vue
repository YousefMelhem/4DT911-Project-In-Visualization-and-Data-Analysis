<template>
  <section class="cohort-panel" aria-label="Saved groups">
    <div class="cohort-header-row">
      <div class="cohort-header-text">
        <h2>Groups</h2>
        <p class="cohort-sub">
          <span v-if="cohorts.length === 0">
            No groups yet. Create one from your current selection.
          </span>
          <span v-else>
            {{ cohorts.length }} group{{ cohorts.length === 1 ? '' : 's' }} saved
          </span>
        </p>
      </div>

      <button
        type="button"
        class="create-btn"
        :disabled="currentSelectionCount === 0"
        @click="$emit('create-from-selection')"
      >
        + Create from selection
        <span v-if="currentSelectionCount > 0" class="count-pill">
          {{ currentSelectionCount.toLocaleString() }}
        </span>
      </button>
    </div>

    <!-- Comparison mode toggle -->
    <div
      v-if="cohorts.length > 0"
      class="comparison-toggle-row"
    >
      <button
        type="button"
        class="comparison-toggle"
        :class="{
          active: comparisonEnabled,
          disabled: cohorts.length < 2
        }"
        @click="handleComparisonToggle"
      >
        <span class="toggle-pill">
          <span class="toggle-knob" :class="{ on: comparisonEnabled }"></span>
        </span>
        <span class="toggle-label">Comparison mode</span>
        <span v-if="cohorts.length < 2" class="toggle-hint">
          needs at least 2 groups
        </span>
      </button>
    </div>

    <!-- Groups list -->
    <div v-if="cohorts.length > 0" class="cohort-list">
      <article
        v-for="cohort in cohorts"
        :key="cohort.id"
        class="cohort-item"
        :class="{ active: cohort.id === activeCohortId }"
        @click="$emit('toggle-cohort', cohort.id)"
      >
        <div
          class="color-dot"
          :style="{ backgroundColor: cohort.color }"
        ></div>

        <div class="cohort-main">
          <div class="cohort-name-row">
            <h3 class="cohort-name">
              {{ cohort.name }}
            </h3>
          </div>
          <p class="cohort-meta">
            {{ cohort.size.toLocaleString() }} cases
          </p>
        </div>

        <button
          type="button"
          class="remove-btn"
          @click.stop="$emit('remove-cohort', cohort.id)"
          aria-label="Remove group"
        >
          ×
        </button>
      </article>
    </div>

    <p v-else class="cohort-empty">
      Groups let you save static subsets of cases and later compare them in supported charts.
    </p>
  </section>
</template>

<script setup lang="ts">
type Cohort = {
  id: string
  name: string
  size: number
  color: string
}

const props = defineProps<{
  cohorts: Cohort[]
  activeCohortId: string | null
  currentSelectionCount: number
  comparisonEnabled: boolean
}>()

const emit = defineEmits<{
  (e: 'create-from-selection'): void
  (e: 'toggle-cohort', id: string): void
  (e: 'remove-cohort', id: string): void
  (e: 'toggle-comparison-mode'): void
}>()

const handleComparisonToggle = () => {
  if (props.cohorts.length < 2) {
    return
  }
  emit('toggle-comparison-mode')
}
</script>

<style scoped>
.cohort-panel {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 0.6rem 0.75rem 0.7rem;
  margin-bottom: 0.5rem;
}

.cohort-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.4rem;
}

.cohort-header-text h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #2d3748;
}

.cohort-sub {
  margin: 0.15rem 0 0;
  font-size: 0.85rem;
  color: #718096;
}

.create-btn {
  border: 1px solid #cbd5e0;
  background: #edf2f7;
  color: #2d3748;
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.create-btn:hover:not(:disabled) {
  background: #e2e8f0;
}

.create-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.count-pill {
  background: #4c51bf;
  color: white;
  border-radius: 999px;
  padding: 0.05rem 0.5rem;
  font-size: 0.75rem;
}

/* Comparison toggle */
.comparison-toggle-row {
  margin-bottom: 0.45rem;
}

.comparison-toggle {
  border: none;
  background: transparent;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0;
  cursor: pointer;
  font-size: 0.85rem;
  color: #4a5568;
}

.comparison-toggle.disabled {
  cursor: default;
  opacity: 0.6;
}

.toggle-pill {
  width: 32px;
  height: 18px;
  border-radius: 999px;
  background: #e2e8f0;
  position: relative;
  transition: background 0.15s ease;
}

.comparison-toggle.active .toggle-pill {
  background: #667eea;
}

.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
  transition: transform 0.15s ease;
}

.toggle-knob.on {
  transform: translateX(14px);
}

.toggle-label {
  font-weight: 600;
}

.toggle-hint {
  font-size: 0.78rem;
  color: #a0aec0;
}

/* Cohort list */
.cohort-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.cohort-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.3rem 1.7rem 0.35rem 0.5rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cohort-item:hover {
  background: #f7fafc;
}

.cohort-item.active {
  border-color: #667eea;
  box-shadow: 0 0 0 1px rgba(102, 126, 234, 0.4);
  background: #f0f4ff;
}

.color-dot {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  margin-top: 0.25rem;
  flex-shrink: 0;
}

.cohort-main {
  flex: 1 1 auto;
  min-width: 0;
}

.cohort-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cohort-name {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #2d3748;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.cohort-meta {
  margin: 0.15rem 0 0;
  font-size: 0.8rem;
  color: #718096;
}

.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  border: none;
  background: transparent;
  color: #a0aec0;
  font-size: 1rem;
  line-height: 1;
  padding: 0.1rem 0.25rem;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.remove-btn:hover {
  background: #fed7d7;
  color: #c53030;
}

.cohort-empty {
  margin: 0.2rem 0 0;
  font-size: 0.83rem;
  color: #a0aec0;
}
</style>
