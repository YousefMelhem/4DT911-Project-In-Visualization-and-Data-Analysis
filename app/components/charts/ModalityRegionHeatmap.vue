<template>
  <div class="modality-region-heatmap">
    <div class="chart-header">
      <h3>Modality × Region</h3>
      <p class="sub">
        Which imaging modalities are used for which body regions
      </p>
    </div>
    <div class="chart-body" ref="chartBodyRef">
      <svg ref="svgRef" class="svg-chart" :viewBox="`0 0 ${VIEW_W} ${computedHeight}`"
        preserveAspectRatio="xMidYMid meet" role="img" aria-label="Heatmap of modality by region" />
      <div v-if="matrix.rowLabels.length === 0 || matrix.colLabels.length === 0" class="empty-note">
        No data
      </div>
    </div>

    <div v-if="tooltipVisible" class="chart-tooltip" :style="{ left: `${tooltipX}px`, top: `${tooltipY}px` }">
      <div v-if="tooltipData" class="tooltip-content">
        <div class="tooltip-label">{{ tooltipData.label }}</div>
        <div class="tooltip-count">Count: {{ tooltipData.count }}</div>
        <div v-if="tooltipData.extra" class="tooltip-extra">{{ tooltipData.extra }}</div>
        <div v-if="tooltipData.clusterNote" class="tooltip-note">{{ tooltipData.clusterNote }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed, nextTick } from 'vue'
import * as d3 from 'd3'

type ModalityRegionMatrix = {
  rowLabels: string[]
  colLabels: string[]
  grid: number[][]
}

const props = defineProps<{
  matrix: ModalityRegionMatrix
  selectedValue?: { modality: string; region: string } | null
}>()

const emit = defineEmits<{
  (e: 'item-select', payload: { type: 'modality-region'; modality: string; region: string } | null): void
}>()

// Wider viewbox + big left margin to give row labels room
const VIEW_W = 450
const MARGIN = { top: 70, right: 0, bottom: 0, left: 130 } as const
const COL_LABEL_OFFSET = 5
const CELL_SIZE = 30

const computedHeight = computed(() => {
  const nRows = props.matrix.rowLabels?.length ?? 0
  const innerH = nRows * CELL_SIZE
  return MARGIN.top + innerH + MARGIN.bottom
})

const svgRef = ref<SVGSVGElement | null>(null)
const chartBodyRef = ref<HTMLElement | null>(null)

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

  const rowLabels = props.matrix.rowLabels ?? []
  const colLabels = props.matrix.colLabels ?? []
  const grid = props.matrix.grid ?? []

  const nRows = rowLabels.length
  const nCols = colLabels.length

  const W = VIEW_W
  const H = computedHeight.value

  const svg = d3.select(el)
  svg.selectAll('*').remove()

  if (nRows === 0 || nCols === 0) {
    svg.append('text')
      .attr('x', W / 2)
      .attr('y', H / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#718096')
      .text('No data')
    return
  }

  const innerW = nCols * CELL_SIZE
  const innerH = nRows * CELL_SIZE
  const xStart = MARGIN.left
  const xEnd = xStart + innerW

  const x = d3.scaleBand<string>()
    .domain(colLabels)
    .range([xStart, xEnd])
    .padding(0)

  const y = d3.scaleBand<string>()
    .domain(rowLabels)
    .range([MARGIN.top, MARGIN.top + innerH])
    .padding(0)

  // Max value + total for color scaling / percentages
  let maxVal = 0
  let totalCount = 0
  for (let r = 0; r < nRows; r++) {
    for (let c = 0; c < nCols; c++) {
      const v = grid[r]?.[c] ?? 0
      maxVal = Math.max(maxVal, v)
      totalCount += v
    }
  }

  const color = d3.scaleSequential(d3.interpolateBlues)
    .domain([0, Math.max(maxVal, 1)])  // avoid [0,0] domain

  const fmt = d3.format(',')

  // Column labels (top, rotated)
  const colLabelGroup = svg.append('g')
    .attr('transform', `translate(0, ${MARGIN.top - COL_LABEL_OFFSET})`)

  colLabelGroup
    .selectAll('text.col-label')
    .data(colLabels)
    .enter()
    .append('text')
    .attr('class', 'col-label')
    .attr('transform', d =>
      `translate(${x(d)! + x.bandwidth() / 2}, 0) rotate(-45)`
    )
    .attr('text-anchor', 'start')
    .attr('fill', '#4a5568')
    .style('font-size', '12px')
    .text(d => d)

  // Row labels (left)
  svg.append('g')
    .selectAll('text.row-label')
    .data(rowLabels)
    .enter()
    .append('text')
    .attr('class', 'row-label')
    .attr('x', xStart - 10)
    .attr('y', d => (y(d)! + y.bandwidth() / 2))
    .attr('text-anchor', 'end')
    .attr('dominant-baseline', 'middle')
    .attr('fill', '#4a5568')
    .style('font-size', '11px')
    .text(d => d)

  type Cell = { row: string; col: string; value: number }

  const cells: Cell[] = []
  for (let r = 0; r < nRows; r++) {
    for (let c = 0; c < nCols; c++) {
      const value = grid[r]?.[c] ?? 0
      cells.push({ row: rowLabels[r]!, col: colLabels[c]!, value })
    }
  }

  const g = svg.append('g')

  g.selectAll('rect.cell')
    .data(cells)
    .enter()
    .append('rect')
    .attr('class', 'cell')
    .attr('x', d => x(d.col)!)
    .attr('y', d => y(d.row)!)
    .attr('width', x.bandwidth())
    .attr('height', y.bandwidth())
    .attr('stroke', d => {
      const sel = props.selectedValue
      if (!sel) return '#e2e8f0'
      const isSelected = sel.modality === d.col && sel.region === d.row
      return isSelected ? '#2b6cb0' : '#e2e8f0'
    })
    .attr('stroke-width', d => {
      const sel = props.selectedValue
      if (!sel) return 0.5
      const isSelected = sel.modality === d.col && sel.region === d.row
      return isSelected ? 2 : 0.5
    })
    .attr('fill', d => d.value === 0 ? '#f7fafc' : color(d.value)!)
    .style('cursor', 'pointer')
    .on('mouseenter', function (event, d) {
      d3.select(this)
        .transition()
        .duration(150)
        .attr('stroke', '#667eea')
        .attr('stroke-width', 2)

      const pct = totalCount > 0
        ? ((d.value / totalCount) * 100).toFixed(1)
        : '0.0'

      // Create tooltip data
      const tooltipContent = {
        label: `${d.col} • ${d.row}`,
        count: d.value,
        total: totalCount,
        extra: `${pct}% of all modality–region counts`,
      }

      // Use Vue.nextTick to ensure the tooltip state is updated
      nextTick(() => {
        showTooltip(event as MouseEvent, tooltipContent)
      })
    })
    .on('mousemove', (event) => {
      updatePosition(event as MouseEvent)
    })
    .on('mouseleave', function () {
      const d = d3.select<Cell, Cell>(this).datum()
      const sel = props.selectedValue
      const isSelected = sel && sel.modality === d.col && sel.region === d.row

      d3.select(this)
        .transition()
        .duration(150)
        .attr('stroke', isSelected ? '#2b6cb0' : '#e2e8f0')
        .attr('stroke-width', isSelected ? 2 : 0.5)

      hideTooltip()
    })
    .on('click', (_event, d) => {
      const sel = props.selectedValue
      if (sel && sel.modality === d.col && sel.region === d.row) {
        emit('item-select', null)
      } else {
        emit('item-select', {
          type: 'modality-region',
          modality: d.col,
          region: d.row,
        })
      }
    })

  g.selectAll('text.value')
    .data(cells)
    .enter()
    .append('text')
    .attr('class', 'value')
    .attr('x', d => x(d.col)! + x.bandwidth() / 2)
    .attr('y', d => y(d.row)! + y.bandwidth() / 2)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', '#1a202c')
    .style('font-size', '10px')
    .style('font-weight', '500')
    .style('pointer-events', 'none')
    .text(d => fmt(d.value))
}

onMounted(draw)
watch(() => [props.matrix, props.selectedValue, computedHeight.value], draw, { deep: true })
</script>

<style scoped>
.modality-region-heatmap {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem 1rem 1.25rem;
  position: relative;
}

.chart-header h3 {
  margin: 1rem 0.75rem 0.5rem;
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