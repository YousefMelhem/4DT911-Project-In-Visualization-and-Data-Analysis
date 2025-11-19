<template>
  <div class="chart-card">
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
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import * as d3 from 'd3'

type Item = { label: string; count: number }

const props = defineProps<{
  items: Item[]
}>()

const VIEW_W = 760
// give the labels a bit more breathing room on the right
const MARGIN = { top: 16, right: 48, bottom: 40, left: 160 } as const
const ROW_H = 26
const GAP = 6
const fmt = d3.format(',')

const computedHeight = computed(() => {
  const inner = Math.max(0, props.items.length * (ROW_H + GAP) - GAP)
  return MARGIN.top + inner + MARGIN.bottom
})

const svgRef = ref<SVGSVGElement | null>(null)

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
  g.selectAll('rect')
    .data(data)
    .enter()
    .append('rect')
      .attr('x', x(0))
      .attr('y', (d: Item) => y(d.label)!)
      .attr('width', (d: Item) => x(d.count) - x(0))
      .attr('height', y.bandwidth())
      .attr('rx', 4)
      .attr('fill', '#667eea')
      .append('title')
        .text((d: Item) => `${d.label}: ${fmt(d.count)} cases`)

  // value labels at bar ends, clamped inside the viewBox
  g.selectAll('text.value')
    .data(data)
    .enter()
    .append('text')
      .attr('class', 'value')
      .attr('x', (d: Item) => {
        const desired = x(d.count) + 6
        return Math.min(desired, innerRight - 4)
      })
      .attr('y', (d: Item) => (y(d.label)! + y.bandwidth() / 2))
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#2d3748')
      .style('font-size', '16px')
      .style('font-weight', '600')
      .text((d: Item) => fmt(d.count))
}

onMounted(draw)
watch(() => props.items, draw, { deep: true })
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
