<template>
  <div class="chart-card">
    <div class="chart-header">
      <h3>Modality × Region</h3>
      <p class="sub">
        Which imaging modalities are used for which body regions
      </p>
    </div>
    <div class="chart-body">
      <svg
        ref="svgRef"
        class="svg-chart"
        :viewBox="`0 0 ${VIEW_W} ${computedHeight}`"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Heatmap of modality by region"
      />
      <div v-if="matrix.rowLabels.length === 0 || matrix.colLabels.length === 0" class="empty-note">
        No data
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import * as d3 from 'd3'

type ModalityRegionMatrix = {
  rowLabels: string[]
  colLabels: string[]
  grid: number[][]
}

const props = defineProps<{
  matrix: ModalityRegionMatrix
}>()

const VIEW_W = 500
const MARGIN = { top: 70, right: 0, bottom: 0, left: 0 } as const
const COL_LABEL_OFFSET = 5
const CELL_SIZE = 28

const computedHeight = computed(() => {
  const nRows = props.matrix.rowLabels?.length ?? 0
  const innerH = nRows * CELL_SIZE
  return MARGIN.top + innerH + MARGIN.bottom
})

const svgRef = ref<SVGSVGElement | null>(null)

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
  const xStart = (W - innerW) / 2
  const xEnd = xStart + innerW

  const x = d3.scaleBand<string>()
    .domain(colLabels)
    .range([xStart, xEnd])
    .padding(0)

  const y = d3.scaleBand<string>()
    .domain(rowLabels)
    .range([MARGIN.top, MARGIN.top + innerH])
    .padding(0)

  // Max value for color scaling
  let maxVal = 0
  for (let r = 0; r < nRows; r++) {
    for (let c = 0; c < nCols; c++) {
      maxVal = Math.max(maxVal, grid[r]?.[c] ?? 0)
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
      .attr('x', xStart - 8)
      .attr('y', d => (y(d)! + y.bandwidth() / 2))
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#4a5568')
      .style('font-size', '12px')
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
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 0.5)
      .attr('fill', d => d.value === 0 ? '#f7fafc' : color(d.value)!)
      .append('title')
        .text(d => `${d.row} × ${d.col}: ${fmt(d.value)} case${d.value === 1 ? '' : 's'}`)

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
      .style('font-size', '11px')
      .style('font-weight', '500')
      .text(d => fmt(d.value))
}

onMounted(draw)
watch(() => props.matrix, draw, { deep: true })
watch(computedHeight, draw)
</script>

<style scoped>
.chart-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 1rem 1rem 1.25rem;
}
.chart-header h3 {
  margin: 0;
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
</style>
