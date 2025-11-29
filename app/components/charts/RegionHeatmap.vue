<template>
  <div class="region-heatmap">
    <div class="chart-header">
      <h3>Region Co-occurrence</h3>
      <p class="sub">
        How often body regions are involved together in the same case
      </p>
    </div>
    <div class="chart-body">
      <svg
        ref="svgRef"
        class="svg-chart"
        :viewBox="`0 0 ${VIEW_W} ${computedHeight}`"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Heatmap of region co-occurrence"
      />
      <div v-if="matrix.labels.length === 0" class="empty-note">No data</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import * as d3 from 'd3'

type RegionMatrix = { labels: string[]; grid: number[][] }

const props = defineProps<{
  matrix: RegionMatrix
  selectedValue?: string | null
}>()

const emit = defineEmits<{
  (e: 'item-select', payload: { type: 'region'; value: string } | null): void
}>()

const VIEW_W = 400
const MARGIN = { top: 100, right: 0, bottom: 0, left: 100 } as const
const COL_LABEL_OFFSET = 5
const CELL_SIZE = 30

const computedHeight = computed(() => {
  const n = props.matrix.labels?.length ?? 0
  const innerH = n * CELL_SIZE
  return MARGIN.top + innerH + MARGIN.bottom
})

const svgRef = ref<SVGSVGElement | null>(null)

const draw = () => {
  const el = svgRef.value
  if (!el) return

  const labels = props.matrix.labels ?? []
  const grid = props.matrix.grid ?? []
  const n = labels.length

  const W = VIEW_W
  const H = computedHeight.value

  const svg = d3.select(el)
  svg.selectAll('*').remove()

  if (n === 0) {
    svg.append('text')
      .attr('x', W / 2)
      .attr('y', H / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#718096')
      .text('No data')
    return
  }

  const innerSize = n * CELL_SIZE
  const xStart = MARGIN.left
  const xEnd = xStart + innerSize

  const x = d3.scaleBand<string>()
    .domain(labels)
    .range([xStart, xEnd])
    .padding(0)

  const y = d3.scaleBand<string>()
    .domain(labels)
    .range([MARGIN.top, MARGIN.top + innerSize])
    .padding(0)

  // Max value for color scaling
  let maxVal = 0
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      maxVal = Math.max(maxVal, grid[i]?.[j] ?? 0)
    }
  }

  const color = d3.scaleSequential(d3.interpolateBlues)
    .domain([0, Math.max(maxVal, 1)]) // avoid [0,0] domain

  const fmt = d3.format(',')

  // Column labels (top, rotated)
  const colLabelGroup = svg.append('g')
    .attr('transform', `translate(0, ${MARGIN.top - COL_LABEL_OFFSET})`)

  colLabelGroup
    .selectAll('text.col-label')
    .data(labels)
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
    .data(labels)
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

  const cells: { row: string; col: string; value: number }[] = []
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const value = grid[i]?.[j] ?? 0
      cells.push({ row: labels[i]!, col: labels[j]!, value })
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
      if (!props.selectedValue) return '#e2e8f0'
      const isSelected = d.row === props.selectedValue || d.col === props.selectedValue
      return isSelected ? '#2b6cb0' : '#e2e8f0'
    })
    .attr('stroke-width', d => {
      if (!props.selectedValue) return 0.5
      const isSelected = d.row === props.selectedValue || d.col === props.selectedValue
      return isSelected ? 2 : 0.5
    })
    .attr('fill', d => d.value === 0 ? '#f7fafc' : color(d.value)!)
    .style('cursor', 'pointer')
    .on('click', (_event, d) => {
      if (props.selectedValue === d.row) {
        emit('item-select', null)
      } else {
        emit('item-select', { type: 'region', value: d.row })
      }
    })
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
      .style('font-size', '10px')
    .style('font-weight', '500')
    .style('pointer-events', 'none')
    .text(d => fmt(d.value))
}

onMounted(draw)
watch(() => [props.matrix, props.selectedValue, computedHeight.value], draw, { deep: true })
</script>

<style scoped>
.region-heatmap {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem 1rem 1.25rem;
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
