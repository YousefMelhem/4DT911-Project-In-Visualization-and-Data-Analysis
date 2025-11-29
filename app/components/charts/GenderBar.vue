<template>
  <div class="gender-chart">
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
    <ChartTooltip
      :visible="tooltipVisible"
      :x="tooltipX"
      :y="tooltipY"
      :data="tooltipData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import * as d3 from 'd3'
import { useChartTooltip } from '~/composables/useChartTooltip'
import ChartTooltip from './ChartTooltip.vue'

/* =========================
 * Types
 * =======================*/
type Item = { label: string; count: number }

const props = defineProps<{
  items: Item[]
  total?: number
  clusterNote?: string
  selectedValue?: string | null
}>()

const emit = defineEmits<{
  itemSelect: [{ type: 'gender'; value: string }]
}>()

/* =========================
 * Constants & helpers
 * =======================*/
const W = 700
const H = 300
const MARGIN = { top: 8, right: 16, bottom: 42, left: 90 }
const INNER_W = W - MARGIN.left - MARGIN.right
const INNER_H = H - MARGIN.top - MARGIN.bottom
const fmt = d3.format(',')

const svgRef = ref<SVGSVGElement | null>(null)
const { tooltipVisible, tooltipX, tooltipY, tooltipData, showTooltip, hideTooltip, updatePosition } = useChartTooltip()

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
  const totalCount = props.total ?? data.reduce((sum, d) => sum + d.count, 0)

  const bars = g.selectAll('rect')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', (d: Item) => x(d.label)!)
    .attr('y', y(0))
    .attr('width', x.bandwidth())
    .attr('height', 0)
    .attr('rx', 6)
    .attr('fill', (d: Item) => props.selectedValue === d.label ? '#4c51bf' : '#667eea')
    .attr('opacity', (d: Item) => props.selectedValue === d.label ? 1 : 0.85)
    .attr('stroke', (d: Item) => props.selectedValue === d.label ? '#2d3748' : 'none')
    .attr('stroke-width', (d: Item) => props.selectedValue === d.label ? 2 : 0)
    .style('cursor', 'pointer')
    .on('mouseenter', function(event, d: Item) {
      if (props.selectedValue !== d.label) {
        d3.select(this).attr('opacity', 1)
      }
      showTooltip(event, {
        label: d.label,
        count: d.count,
        total: totalCount,
        clusterNote: props.clusterNote
      })
    })
    .on('mousemove', (event) => {
      updatePosition(event)
    })
    .on('mouseleave', function(_event, d: Item) {
      if (props.selectedValue !== d.label) {
        d3.select(this).attr('opacity', 0.85)
      }
      hideTooltip()
    })
    .on('click', (_event, d: Item) => {
      emit('itemSelect', { type: 'gender', value: d.label })
    })

  bars.transition()
    .duration(350)
    .attr('y', (d: Item) => y(d.count))
    .attr('height', (d: Item) => y(0) - y(d.count))

  // Value labels
  g.selectAll('text.value')
    .data(data)
    .enter()
    .append('text')
    .attr('class', 'value')
    .attr('x', (d: Item) => (x(d.label)! + x.bandwidth() / 2))
    .attr('y', y(0))
    .attr('text-anchor', 'middle')
    .attr('fill', '#2d3748')
    .attr('opacity', 0)
    .style('font-size', '18px')
    .style('font-weight', '600')
    .text((d: Item) => fmt(d.count))
    .transition()
    .duration(350)
    .delay(100)
    .attr('y', (d: Item) => y(d.count) - 6)
    .attr('opacity', 1)
}

onMounted(draw)
watch(() => props.items, draw, { deep: true })
watch(() => props.selectedValue, draw)
</script>

<style scoped>
.gender-chart {
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
.chart-body { width: 100%; flex: 1 1 auto; }
.svg-chart { width: 100%; height: auto; display: block; }
</style>
