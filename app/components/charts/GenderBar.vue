<template>
  <div class="chart-card">
    <div class="chart-header">
      <h3>Gender distribution</h3>
      <p class="sub">Counts of Female, Male, and Unknown</p>
    </div>
    <div class="chart-body">
      <svg
        ref="svgRef"
        class="svg-chart"
        viewBox="0 0 700 280"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Bar chart of case counts by gender"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import * as d3 from 'd3'

/* =========================
 * Types
 * =======================*/
type Item = { label: string; count: number }

const props = defineProps<{
  items: Item[]
}>()

/* =========================
 * Constants & helpers
 * =======================*/
const W = 700
const H = 280
const MARGIN = { top: 20, right: 16, bottom: 40, left: 48 }
const INNER_W = W - MARGIN.left - MARGIN.right
const INNER_H = H - MARGIN.top - MARGIN.bottom
const fmt = d3.format(',')

const svgRef = ref<SVGSVGElement | null>(null)

/* =========================
 * Render
 * =======================*/
const draw = () => {
  const el = svgRef.value
  if (!el) return

  const svg = d3.select(el)
  svg.selectAll('*').remove()

  const data = (props.items ?? []).slice()
  const maxY = d3.max(data, (d: Item) => d.count) ?? 0

  // Empty state
  if (data.length === 0 || maxY === 0) {
    svg.append('text')
      .attr('x', W / 2)
      .attr('y', H / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#718096')
      .text('No data')
    return
  }

  // Scales
  const x = d3.scaleBand<string>()
    .domain(data.map(d => d.label))
    .range([MARGIN.left, MARGIN.left + INNER_W])
    .padding(0.25)

  const y = d3.scaleLinear()
    .domain([0, maxY]).nice()
    .range([MARGIN.top + INNER_H, MARGIN.top])

  // Axes
  svg.append('g')
    .attr('transform', `translate(0,${MARGIN.top + INNER_H})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
      .style('font-size', '18px')

  svg.append('g')
    .attr('transform', `translate(${MARGIN.left},0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat((d) => fmt(d as number)))
    .selectAll('text')
      .style('font-size', '16px')

  // Bars
  const g = svg.append('g')
  g.selectAll('rect')
    .data(data)
    .enter()
    .append('rect')
      .attr('x', (d: Item) => x(d.label)!)
      .attr('y', (d: Item) => y(d.count))
      .attr('width', x.bandwidth())
      .attr('height', (d: Item) => y(0) - y(d.count))
      .attr('rx', 6)
      .attr('fill', '#667eea')
      .append('title')
        .text((d: Item) => `${d.label}: ${fmt(d.count)}`)

  // Value labels
  g.selectAll('text.value')
    .data(data)
    .enter()
    .append('text')
      .attr('class', 'value')
      .attr('x', (d: Item) => (x(d.label)! + x.bandwidth() / 2))
      .attr('y', (d: Item) => y(d.count) - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', '#2d3748')
      .style('font-size', '18px')
      .style('font-weight', '600')
      .text((d: Item) => fmt(d.count))
}

onMounted(draw)
watch(() => props.items, draw, { deep: true })
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
.chart-body { width: 100%; }
.svg-chart { width: 100%; height: auto; display: block; }
</style>
