<template>
  <div class="text-chart">
    <div class="chart-header">
      <h3>Text Sections</h3>
      <p class="sub">
        Number of cases that include each documentation section
      </p>
    </div>
    <div class="chart-body">
      <svg
        ref="svgRef"
        class="svg-chart"
        :viewBox="`0 0 ${VIEW_W} ${computedHeight}`"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Horizontal bar chart of case counts by documentation section"
      />
      <div v-if="items.length === 0" class="empty-note">No data</div>
    </div>
    
    <div
      v-if="tooltipVisible"
      class="chart-tooltip"
      :style="{ left: `${tooltipX}px`, top: `${tooltipY}px` }"
    >
      <div v-if="tooltipData" class="tooltip-content">
        <div class="tooltip-label">{{ tooltipData.label }}</div>
        <div class="tooltip-count">Count: {{ tooltipData.count.toLocaleString() }}</div>
        <div v-if="tooltipData.extra" class="tooltip-extra">{{ tooltipData.extra }}</div>
        <div v-if="tooltipData.clusterNote" class="tooltip-note">{{ tooltipData.clusterNote }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed, nextTick } from 'vue'
import * as d3 from 'd3'

type Item = { label: string; count: number }

const props = defineProps<{
  items: Item[]
  total?: number
  clusterNote?: string
  selectedValue?: string | null
}>()

const emit = defineEmits<{
  itemSelect: [{ type: 'section'; value: string }]
}>()

const VIEW_W = 660
const MARGIN = { top: 8, right: 40, bottom: 26, left: 120 } as const
const ROW_H = 45
const GAP = 20
const fmt = d3.format(',')

const computedHeight = computed(() => {
  const inner = Math.max(0, props.items.length * (ROW_H + GAP) - GAP)
  return MARGIN.top + inner + MARGIN.bottom
})

const svgRef = ref<SVGSVGElement | null>(null)

const tooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)
const tooltipData = ref<any>(null)

const showTooltip = (event: MouseEvent, data: any) => {
  tooltipData.value = data
  tooltipVisible.value = true
  updatePosition(event)
}

const hideTooltip = () => {
  tooltipVisible.value = false
}

const updatePosition = (event: MouseEvent) => {
  tooltipX.value = event.clientX + 10
  tooltipY.value = event.clientY - 10
}

const draw = () => {
  const el = svgRef.value
  if (!el) return

  const svg = d3.select(el)
  svg.selectAll('*').remove()

  const W = VIEW_W
  const H = computedHeight.value
  const innerW = W - MARGIN.left - MARGIN.right
  const innerH = H - MARGIN.top - MARGIN.bottom
  const innerRight = MARGIN.left + innerW

  const data = (props.items ?? []).slice()
  const maxX = d3.max(data, (d: Item) => d.count) ?? 0
  const totalCount = props.total ?? data.reduce((sum, d) => sum + d.count, 0)

  if (data.length === 0 || maxX === 0) {
    svg.append('text')
      .attr('x', W / 2)
      .attr('y', H / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#718096')
      .text('No data')
    return
  }

  const y = d3.scaleBand<string>()
    .domain(data.map(d => d.label))
    .range([MARGIN.top, MARGIN.top + innerH])
    .paddingInner(GAP / (ROW_H + GAP))
    .paddingOuter(0)

  const x = d3.scaleLinear()
    .domain([0, maxX])
    .nice()
    .range([MARGIN.left, innerRight])

  // x-axis
  svg.append('g')
    .attr('transform', `translate(0,${MARGIN.top + innerH})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat((d) => fmt(d as number)))
    .selectAll('text')
    .style('font-size', '17px')

  // y-axis
  svg.append('g')
    .attr('transform', `translate(${MARGIN.left},0)`)
    .call(d3.axisLeft(y))
    .selectAll('text')
    .style('font-size', '17px')
    .style('cursor', 'default')

  const g = svg.append('g')

  // bars
  const bars = g.selectAll('rect')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', x(0))
    .attr('y', (d: Item) => y(d.label)!)
    .attr('width', 0)
    .attr('height', y.bandwidth())
    .attr('rx', 4)
    .attr('fill', (d: Item) => props.selectedValue === d.label ? '#4c51bf' : '#667eea')
    .attr('opacity', (d: Item) => props.selectedValue === d.label ? 1 : 0.85)
    .attr('stroke', (d: Item) => props.selectedValue === d.label ? '#2d3748' : 'none')
    .attr('stroke-width', (d: Item) => props.selectedValue === d.label ? 2 : 0)
    .style('cursor', 'pointer')
    .on('mouseenter', function (event, d: Item) {
      if (props.selectedValue !== d.label) {
        d3.select(this).attr('opacity', 1)
      }
      
      const pct = totalCount > 0 ? ((d.count / totalCount) * 100).toFixed(1) : '0.0'
      const tooltipContent = {
        label: d.label,
        count: d.count,
        total: totalCount,
        extra: `${pct}% of all cases`,
        clusterNote: props.clusterNote
      }
      
      nextTick(() => {
        showTooltip(event as MouseEvent, tooltipContent)
      })
    })
    .on('mousemove', (event) => {
      updatePosition(event as MouseEvent)
    })
    .on('mouseleave', function (_event, d: Item) {
      if (props.selectedValue !== d.label) {
        d3.select(this).attr('opacity', 0.85)
      }
      hideTooltip()
    })
    .on('click', (_event, d: Item) => {
      emit('itemSelect', { type: 'section', value: d.label })
    })
    
  bars.transition()
    .duration(350)
    .attr('width', (d: Item) => x(d.count) - x(0))

  // value labels at bar ends, clamped inside the viewBox
  const labels_text = g.selectAll('text.value')
    .data(data)
    .enter()
    .append('text')
    .attr('class', 'value')
    .attr('x', x(0) + 6)
    .attr('y', (d: Item) => (y(d.label)! + y.bandwidth() / 2))
    .attr('dominant-baseline', 'middle')
    .attr('fill', '#2d3748')
    .attr('opacity', 0)
    .style('font-size', '16px')
    .style('font-weight', '600')
    .text((d: Item) => fmt(d.count))

  labels_text.transition()
    .duration(350)
    .delay(100)
    .attr('x', (d: Item) => {
      const desired = x(d.count) + 6
      return Math.min(desired, innerRight - 4)
    })
    .attr('opacity', 1)
}

onMounted(draw)
watch(() => props.items, draw, { deep: true })
watch(computedHeight, draw)
watch(() => props.selectedValue, draw)
</script>

<style scoped>
.text-chart{
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0.5rem 1rem 0.5rem;
  position: relative;
}
.chart-header h3 {
  margin: 1rem 0.75rem 0.25rem;
  color: #2d3748;
  font-size: 1.1rem;
  font-weight: 700;
}
.sub {
  margin: 0.15rem 0 0.5rem;
  color: #718096;
  font-size: 0.9rem;
}
.chart-body {
  width: 100%;
  flex: 1 1 auto;
  position: relative;
}
.svg-chart {
  width: 100%;
  height: auto;
  display: block;
}
.empty-note {
  margin-top: 0.5rem;
  color: #718096;
  font-size: 0.9rem;
}

.chart-tooltip {
  position: fixed;
  pointer-events: none;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  max-width: 250px;
  word-wrap: break-word;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tooltip-label {
  font-weight: bold;
  font-size: 13px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 4px;
  margin-bottom: 2px;
}

.tooltip-count {
  font-size: 12px;
}

.tooltip-extra {
  font-style: italic;
  font-size: 11px;
  opacity: 0.9;
}

.tooltip-note {
  font-size: 11px;
  opacity: 0.8;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
</style>