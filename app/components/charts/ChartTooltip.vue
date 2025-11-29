<template>
  <Teleport to="body">
    <div
      v-if="visible && data"
      class="chart-tooltip"
      :style="{
        left: `${x + 12}px`,
        top: `${y - 12}px`
      }"
    >
      <div class="tooltip-label">{{ data.label }}</div>
      <div class="tooltip-value">{{ data.count.toLocaleString() }} cases</div>
      <div class="tooltip-percent">{{ percentage }}% of {{ data.total.toLocaleString() }}</div>
      <div v-if="data.clusterNote" class="tooltip-note">{{ data.clusterNote }}</div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TooltipData } from '~/composables/useChartTooltip'

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  data: TooltipData | null
}>()

const percentage = computed(() => {
  if (!props.data || props.data.total === 0) return '0'
  return ((props.data.count / props.data.total) * 100).toFixed(1)
})
</script>

<style scoped>
.chart-tooltip {
  position: fixed;
  background: rgba(45, 55, 72, 0.95);
  backdrop-filter: blur(8px);
  color: white;
  padding: 0.75rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  z-index: 10000;
  font-size: 0.875rem;
  line-height: 1.4;
  max-width: 250px;
  transform: translateY(-100%);
}

.tooltip-label {
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: #e2e8f0;
}

.tooltip-value {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  color: white;
}

.tooltip-percent {
  color: #cbd5e0;
  font-size: 0.8rem;
}

.tooltip-note {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  color: #a0aec0;
  font-size: 0.75rem;
  font-style: italic;
}
</style>
