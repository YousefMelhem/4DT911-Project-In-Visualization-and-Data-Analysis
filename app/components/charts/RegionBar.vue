<template>
  <div class="chart-card">
    <div class="chart-header">
      <div class="title-wrap">
        <h3>Regions</h3>
        <p class="sub">Cases per region (cases counted in every region they include)</p>
      </div>
      <button
        v-if="items.length > maxVisible"
        class="toggle-btn"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'Show top ' + maxVisible : 'Show all (' + items.length + ')' }}
      </button>
    </div>

    <div class="chart-body">
      <svg
        ref="svgRef"
        class="svg-chart"
        :viewBox="`0 0 ${VIEW_W} ${computedHeight}`"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Horizontal bar chart of case counts by region"
      />
      <div v-if="visibleItems.length === 0" class="empty-note">No data</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { select } from 'd3-selection'
import { scaleBand, scaleLinear } from 'd3-scale'
import { axisLeft, axisBottom } from 'd3-axis'
import { max } from 'd3-array'
import { format } from 'd3-format'

/* =========================
 * Types
 * =======================*/
type Item = { label: string; count: number }

const props = defineProps<{
  items: Item[]              // unsorted is fine
  maxVisible?: number        // default top N before expanding
}>()

/* =========================
 * Constants & sizing
 * =======================*/
const VIEW_W = 820
const MARGIN = { top: 16, right: 24, bottom: 40, left: 180 } as const // more left for long labels
const ROW_H = 26
const GAP = 6
const fmt = format(',')

/* =========================
 * State & derived data
 * =======================*/
const expanded = ref(false)
const maxVisible = computed(() => props.maxVisible ?? 15)

const sorted = computed<Item[]>(() =>
  (props.items ?? []).slice().sort((a, b) => b.count - a.count)
)
const visibleItems = computed<Item[]>(() =>
  expanded.value ? sorted.value : sorted.value.slice(0, maxVisible.value)
)

const computedHeight = computed(() => {
  const inner = Math.max(0, visibleItems.value.length * (ROW_H + GAP) - GAP)
  return MARGIN.top + inner + MARGIN.bottom
})

/* =========================
 * Render
 * =======================*/
const svgRef = ref<SVGSVGElement | null>(null)

const draw = () => {
  const el = svgRef.value
  if (!el) return

  const svg = select(el)
  svg.selectAll('*').remove()

  const data = visibleItems.value
  const W = VIEW_W
  const H = computedHeight.value
  const innerW = W - MARGIN.left - MARGIN.right
  const innerH = H - MARGIN.top - MARGIN.bottom

  const maxX = max(data, d => d.count) ?? 0
  if (data.length === 0 || maxX === 0) {
    svg.append('text')
      .attr('x', W / 2)
      .attr('y', H / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#718096')
      .text('No data')
    return
  }

  // Scales
  const y = scaleBand<string>()
    .domain(data.map(d => d.label))
    .range([MARGIN.top, MARGIN.top + innerH])
    .paddingInner(GAP / (ROW_H + GAP))
    .paddingOuter(0)

  const x = scaleLinear()
    .domain([0, maxX])
    .nice()
    .range([MARGIN.left, MARGIN.left + innerW])

  // Axes
  svg.append('g')
    .attr('transform', `translate(0,${MARGIN.top + innerH})`)
    .call(axisBottom(x).ticks(5).tickFormat((d: any) => fmt(d)))
    .selectAll('text')
      .style('font-size', '18px')

  svg.append('g')
    .attr('transform', `translate(${MARGIN.left},0)`)
    .call(axisLeft(y))
    .selectAll('text')
      .style('font-size', '18px')

  // Bars
  const g = svg.append('g')

  g.selectAll('rect')
    .data(data)
    .enter()
    .append('rect')
      .attr('x', x(0))
      .attr('y', d => y(d.label)!)
      .attr('width', d => x(d.count) - x(0))
      .attr('height', y.bandwidth())
      .attr('rx', 4)
      .attr('fill', '#667eea')
      .append('title')
        .text(d => `${d.label}: ${fmt(d.count)}`)

  // Values
  g.selectAll('text.value')
    .data(data)
    .enter()
    .append('text')
      .attr('class', 'value')
      .attr('x', d => x(d.count) + 6)
      .attr('y', d => (y(d.label)! + y.bandwidth() / 2))
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#2d3748')
      .style('font-size', '16px')
      .style('font-weight', '600')
      .text(d => fmt(d.count))
}

onMounted(draw)
// Redraw when the visible data set or overall height changes
watch([visibleItems, computedHeight], draw, { deep: true })
</script>

<style scoped>
.chart-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 1rem 1rem 1.25rem;
}
.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  flex-wrap: wrap;
}
.title-wrap h3 {
  margin: 0;
  color: #2d3748;
  font-size: 1.1rem;
  font-weight: 700;
}
.sub { margin: 0.15rem 0 0; color: #718096; font-size: 0.9rem; }
.toggle-btn {
  border: 1px solid #e2e8f0;
  background: #f7fafc;
  color: #2d3748;
  border-radius: 8px;
  padding: .4rem .7rem;
  font-size: .9rem;
  cursor: pointer;
}
.toggle-btn:hover { background: #edf2f7; }
.chart-body { width: 100%; }
.svg-chart { width: 100%; height: auto; display: block; }
.empty-note { margin-top: 0.5rem; color: #718096; font-size: 0.9rem; }
</style>
