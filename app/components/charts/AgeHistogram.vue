<template>
  <div class="age-chart">
    <div class="chart-header">
      <h3>Age distribution</h3>
      <p class="sub">Fixed bins (0–9, 10–19, …, 90+). Unknown ages excluded from bars.</p>
    </div>
    <div class="chart-body">
      <svg
        ref="svgRef"
        class="svg-chart"
        viewBox="0 0 700 320"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Histogram of case counts by age bin"
      />
      <div class="footnote" v-if="(unknownCount ?? 0) > 0">
        Excluded Unknown ages: {{ (unknownCount ?? 0).toLocaleString() }}
      </div>
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
import { ref, watch, onMounted, nextTick } from 'vue'
import * as d3 from 'd3'

/* =========================
 * Types
 * =======================*/
type Bin = { binStart: number; binEnd: number; count: number }
type SelectedBin = { binStart: number; binEnd: number } | null

const props = defineProps<{
  bins: Bin[]        // e.g., [{binStart:0, binEnd:9, count:123}, …, {binStart:90, binEnd:Infinity, count:5}]
  unknownCount?: number
  total?: number
  clusterNote?: string
  selectedBin?: SelectedBin
}>()

const emit = defineEmits<{
  itemSelect: [{ type: 'ageBin'; binStart: number; binEnd: number }]
}>()

/* =========================
 * Constants & helpers
 * =======================*/
const W = 700
const H = 300
const MARGIN = { top: 20, right: 16, bottom: 20, left: 48}
const INNER_W = W - MARGIN.left - MARGIN.right
const INNER_H = H - MARGIN.top - MARGIN.bottom

const fmt = d3.format(',')
const labelFor = (b: Bin) => (Number.isFinite(b.binEnd) ? `${b.binStart}–${b.binEnd}` : `${b.binStart}+`)

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

const isBinSelected = (bin: Bin) => {
  if (!props.selectedBin) return false
  return props.selectedBin.binStart === bin.binStart && props.selectedBin.binEnd === bin.binEnd
}

/* =========================
 * Render
 * =======================*/
const draw = () => {
  const el = svgRef.value
  if (!el) return

  const svg = d3.select(el)
  svg.selectAll('*').remove()

  const data = (props.bins ?? []).slice()
  const maxY = d3.max(data, (d: Bin) => d.count) ?? 0

  if (data.length === 0 || maxY === 0) {
    svg.append('text')
      .attr('x', W / 2)
      .attr('y', H / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#718096')
      .text('No data')
    return
  }

  const labels = data.map(labelFor)
  const totalCount = props.total ?? data.reduce((sum, d) => sum + d.count, 0)

  const x = d3.scaleBand<string>()
    .domain(labels)
    .range([MARGIN.left, MARGIN.left + INNER_W])
    .padding(0.1)

  const y = d3.scaleLinear()
    .domain([0, maxY])
    .nice()
    .range([MARGIN.top + INNER_H, MARGIN.top])

  // Axes
  svg.append('g')
    .attr('transform', `translate(0,${MARGIN.top + INNER_H})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .style('font-size', '16px')
    .attr('transform', 'translate(0,4) rotate(0)')
    .style('text-anchor', 'middle')

  svg.append('g')
    .attr('transform', `translate(${MARGIN.left},0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat((d) => fmt(d as number)))
    .selectAll('text')
    .style('font-size', '16px')

  // Bars
  const g = svg.append('g')

  const bars = g.selectAll('rect')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', (_: Bin, i: number) => x(labels[i] ?? '') ?? 0)
    .attr('y', y(0))
    .attr('width', x.bandwidth())
    .attr('height', 0)
    .attr('rx', 4)
    .attr('fill', (d: Bin) => isBinSelected(d) ? '#4c51bf' : '#667eea')
    .attr('opacity', (d: Bin) => isBinSelected(d) ? 1 : 0.85)
    .attr('stroke', (d: Bin) => isBinSelected(d) ? '#2d3748' : 'none')
    .attr('stroke-width', (d: Bin) => isBinSelected(d) ? 2 : 0)
    .style('cursor', 'pointer')
      .on('mouseenter', function(event, d: Bin) {
      const i = data.indexOf(d)
      if (!isBinSelected(d)) {
        d3.select(this).attr('opacity', 1)
      }
      
      const pct = totalCount > 0 ? ((d.count / totalCount) * 100).toFixed(1) : '0.0'
      
      const tooltipContent = {
        label: `Age ${labels[i]}`,
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
      .on('mouseleave', function(_event, d: Bin) {
      if (!isBinSelected(d)) {
        d3.select(this).attr('opacity', 0.85)
      }
      hideTooltip()
    })
    .on('click', (_event, d: Bin) => {
      emit('itemSelect', { type: 'ageBin', binStart: d.binStart, binEnd: d.binEnd })
    })

  bars.transition()
    .duration(350)
    .attr('y', (d: Bin) => y(d.count))
    .attr('height', (d: Bin) => y(0) - y(d.count))

  // Value labels
  const labels_text = g.selectAll('text.value')
    .data(data)
    .enter()
    .append('text')
    .attr('class', 'value')
    .attr('x', (_: Bin, i: number) => {
      const xi = x(labels[i] ?? '')
      return ((xi !== undefined ? xi : 0) + x.bandwidth() / 2)
    })
    .attr('y', y(0))
    .attr('text-anchor', 'middle')
    .attr('fill', '#2d3748')
    .attr('opacity', 0)
    .style('font-size', '16px')
    .style('font-weight', '600')
    .text((d: Bin) => fmt(d.count))

  labels_text.transition()
    .duration(350)
    .delay(100)
    .attr('y', (d: Bin) => y(d.count) - 6)
    .attr('opacity', 1)
}

onMounted(draw)
watch(() => props.bins, draw, { deep: true })
watch(() => props.unknownCount, draw)
watch(() => props.selectedBin, draw, { deep: true })
</script>

<style scoped>
.age-chart {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0.5rem 0.75rem 0.5rem;
  position: relative;
}
.chart-header h3 {
  margin: 0.5rem 0.5rem 0.5rem;
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
.svg-chart { width: 100%; height: auto; display: block; }
.footnote { margin-top: 0.5rem; font-size: 0.85rem; color: #718096; }

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