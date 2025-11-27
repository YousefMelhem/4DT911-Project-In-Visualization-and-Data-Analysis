<template>
  <div class="region-chart">
    <div class="chart-header">
      <div class="title-wrap">
        <h3>Regions</h3>
        <p class="sub">Cases per region (cases counted in every region they include)</p>
      </div>
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

const VIEW_W = 660
const MARGIN = { top: 8, right: 40, bottom: 26, left: 140 } as const
const ROW_H = 45
const GAP = 20
const fmt = d3.format(',')

const sorted = computed<Item[]>(() =>
  (props.items ?? []).slice().sort((a, b) => b.count - a.count)
)

const computedHeight = computed(() => {
  const inner = Math.max(0, sorted.value.length * (ROW_H + GAP) - GAP)
  return MARGIN.top + inner + MARGIN.bottom
})

const svgRef = ref<SVGSVGElement | null>(null)

const draw = () => {
  const el = svgRef.value
  if (!el) return

  const svg = d3.select(el)
  svg.selectAll('*').remove()

  const data = sorted.value
  const W = VIEW_W
  const H = computedHeight.value
  const innerW = W - MARGIN.left - MARGIN.right
  const innerH = H - MARGIN.top - MARGIN.bottom

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
    .range([MARGIN.left, MARGIN.left + innerW])

  svg.append('g')
    .attr('transform', `translate(0,${MARGIN.top + innerH})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat((d) => fmt(d as number)))
    .selectAll('text')
    .style('font-size', '18px')

  svg.append('g')
    .attr('transform', `translate(${MARGIN.left},0)`)
    .call(d3.axisLeft(y))
    .selectAll('text')
    .style('font-size', '18px')

  const g = svg.append('g')

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
        .text((d: Item) => `${d.label}: ${fmt(d.count)}`)

  g.selectAll('text.value')
    .data(data)
    .enter()
    .append('text')
      .attr('class', 'value')
      .attr('x', (d: Item) => x(d.count) + 6)
      .attr('y', (d: Item) => y(d.label)! + y.bandwidth() / 2)
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#2d3748')
      .style('font-size', '16px')
      .style('font-weight', '600')
      .text((d: Item) => fmt(d.count))
}

onMounted(draw)
watch([sorted, computedHeight], draw, { deep: true })
</script>


<style scoped>
.region-chart{
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0.5rem 1rem 0.5rem;
}
.chart-header {
  margin: 1rem 0.75rem 0.25rem;
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
.chart-body { width: 100%; flex: 1 1 auto; }
.svg-chart { width: 100%; height: auto; display: block; }
.empty-note { margin-top: 0.5rem; color: #718096; font-size: 0.9rem; }
</style>
