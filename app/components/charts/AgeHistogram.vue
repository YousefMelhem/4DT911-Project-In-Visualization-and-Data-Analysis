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
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import * as d3 from 'd3'

/* =========================
 * Types
 * =======================*/
type Bin = { binStart: number; binEnd: number; count: number }

const props = defineProps<{
  bins: Bin[]        // e.g., [{binStart:0, binEnd:9, count:123}, …, {binStart:90, binEnd:Infinity, count:5}]
  unknownCount?: number
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

  g.selectAll('rect')
    .data(data)
    .enter()
    .append('rect')
      .attr('x', (_: Bin, i: number) => x(labels[i] ?? '') ?? 0)
      .attr('y', (d: Bin) => y(d.count))
      .attr('width', x.bandwidth())
      .attr('height', (d: Bin) => y(0) - y(d.count))
      .attr('rx', 4)
      .attr('fill', '#667eea')
      .append('title')
        .text((d: Bin, i: number) => `${labels[i]}: ${fmt(d.count)}`)

  // Value labels
  g.selectAll('text.value')
    .data(data)
    .enter()
    .append('text')
      .attr('class', 'value')
      .attr('x', (_: Bin, i: number) => {
        const xi = x(labels[i] ?? '')
        return ((xi !== undefined ? xi : 0) + x.bandwidth() / 2)
      })
      .attr('y', (d: Bin) => y(d.count) - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', '#2d3748')
      .style('font-size', '16px')
      .style('font-weight', '600')
      .text((d: Bin) => fmt(d.count))
}

onMounted(draw)
watch(() => props.bins, draw, { deep: true })
watch(() => props.unknownCount, draw)
</script>

<style scoped>
.age-chart {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0.5rem 0.75rem 0.5rem;
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
 }
.svg-chart { width: 100%; height: auto; display: block; }
.footnote { margin-top: 0.5rem; font-size: 0.85rem; color: #718096; }
</style>
