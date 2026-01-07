<template>
  <div class="gender-chart">
    <div class="chart-header">
      <h3>Gender comparison</h3>
      <p class="sub">Relative gender distribution for each group (%)</p>
    </div>
    <div class="chart-body">
      <svg
        ref="svgRef"
        class="svg-chart"
        viewBox="0 0 700 300"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Grouped bar chart of gender distribution by group"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import * as d3 from 'd3'

type Item = { label: string; count: number }

type Series = {
  cohortId: string
  cohortName: string
  color: string
  items: Item[]
  total: number
}

const props = defineProps<{
  series: Series[]
  selectedValue?: { type: 'gender'; value: string; cohortId?: string } | null
}>()

const emit = defineEmits<{
  itemSelect: [{ type: 'gender'; value: string; cohortId: string }]
}>()

const W = 700
const H = 300
const MARGIN = { top: 56, right: 16, bottom: 42, left: 90 }
const INNER_W = W - MARGIN.left - MARGIN.right
const INNER_H = H - MARGIN.top - MARGIN.bottom

const svgRef = ref<SVGSVGElement | null>(null)

const truncate = (s: string, max = 12) =>
  s.length > max ? `${s.slice(0, max - 1)}…` : s

const draw = () => {
  const el = svgRef.value
  if (!el) return

  const svg = d3.select(el)
  svg.selectAll('*').remove()

  const series = (props.series ?? []).filter(s => (s.items ?? []).length > 0)
  if (!series.length) {
    svg
      .append('text')
      .attr('x', W / 2)
      .attr('y', H / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#718096')
      .text('No groups to compare')
    return
  }

  const labelSet = new Set<string>()
  for (const s of series) {
    for (const it of s.items) labelSet.add(it.label)
  }
  const labels = Array.from(labelSet)
  if (!labels.length) {
    svg
      .append('text')
      .attr('x', W / 2)
      .attr('y', H / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#718096')
      .text('No gender data')
    return
  }

  const maxTotal = d3.max(series, s => s.total) ?? 0
  if (maxTotal === 0) {
    svg
      .append('text')
      .attr('x', W / 2)
      .attr('y', H / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#718096')
      .text('All groups have 0 cases')
    return
  }

  const x0 = d3
    .scaleBand<string>()
    .domain(labels)
    .range([MARGIN.left, MARGIN.left + INNER_W])
    .paddingInner(0.3)
    .paddingOuter(0.1)

  const x1 = d3
    .scaleBand<string>()
    .domain(series.map(s => s.cohortId))
    .range([0, x0.bandwidth()])
    .padding(0.1)

  const y = d3
    .scaleLinear()
    .domain([0, 100])
    .nice()
    .range([MARGIN.top + INNER_H, MARGIN.top])

  svg
    .append('g')
    .attr('transform', `translate(0,${MARGIN.top + INNER_H})`)
    .call(d3.axisBottom(x0))
    .selectAll('text')
    .style('font-size', '12px')

  svg
    .append('g')
    .attr('transform', `translate(${MARGIN.left},0)`)
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d as number}%`))
    .selectAll('text')
    .style('font-size', '12px')

  const g = svg.append('g')

  labels.forEach(label => {
    const group = g.append('g').attr('transform', `translate(${x0(label)},0)`)

    const forLabel = series.map(s => {
      const item = s.items.find(it => it.label === label)
      const raw = item ? item.count : 0
      const value = s.total > 0 ? (raw / s.total) * 100 : 0
      return { series: s, value, raw, label }
    })

    const barSelection = group
      .selectAll('rect')
      .data(forLabel)
      .enter()
      .append('rect')
      .attr('x', d => x1(d.series.cohortId)!)
      .attr('y', y(0))
      .attr('width', x1.bandwidth())
      .attr('height', 0)
      .attr('rx', 4)
      .attr('fill', d => d.series.color)
      .attr('opacity', d => {
        const sel = props.selectedValue
        if (!sel || sel.type !== 'gender') return 0.9
        const isSelected = sel.value === d.label && sel.cohortId === d.series.cohortId
        return isSelected ? 1 : 0.55
      })
      .attr('stroke', d => {
        const sel = props.selectedValue
        if (!sel || sel.type !== 'gender') return 'none'
        const isSelected = sel.value === d.label && sel.cohortId === d.series.cohortId
        return isSelected ? '#2d3748' : 'none'
      })
      .attr('stroke-width', d => {
        const sel = props.selectedValue
        if (!sel || sel.type !== 'gender') return 0
        const isSelected = sel.value === d.label && sel.cohortId === d.series.cohortId
        return isSelected ? 2 : 0
      })
      .style('cursor', 'pointer')
      .on('click', (_event, d) => {
        emit('itemSelect', { type: 'gender', value: d.label, cohortId: d.series.cohortId })
      })

    barSelection
      .transition()
      .duration(350)
      .attr('y', d => y(d.value))
      .attr('height', d => y(0) - y(d.value))

    group
      .selectAll('text.value')
      .data(forLabel)
      .enter()
      .append('text')
      .attr('class', 'value')
      .attr('x', d => x1(d.series.cohortId)! + x1.bandwidth() / 2)
      .attr('y', y(0))
      .attr('text-anchor', 'middle')
      .attr('fill', '#2d3748')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .text(d => (d.value > 0 ? `${Math.round(d.value)}%` : ''))
      .transition()
      .duration(350)
      .delay(80)
      .attr('y', d => y(d.value) - 6)
  })

  const LEGEND_MAX_CHARS = 20
  const LEGEND_ITEM_GAP_X = 12
  const LEGEND_ITEM_GAP_Y = 18

  const legend = svg
    .append('g')
    .attr('transform', `translate(${MARGIN.left},${MARGIN.top - 46})`)

  let lx = 0
  let ly = 0
  const maxLegendWidth = INNER_W

  legend
    .selectAll('g.legend-item')
    .data(series)
    .enter()
    .append('g')
    .attr('class', 'legend-item')
    .each(function (d) {
      const gItem = d3.select(this)

      gItem
        .append('rect')
        .attr('x', 0)
        .attr('y', -9)
        .attr('width', 12)
        .attr('height', 12)
        .attr('rx', 3)
        .attr('fill', d.color)

      const label = truncate(d.cohortName, LEGEND_MAX_CHARS)

      const t = gItem
        .append('text')
        .attr('x', 18)
        .attr('y', 0)
        .attr('dominant-baseline', 'central')
        .style('font-size', '12px')
        .text(label)

      t.append('title').text(d.cohortName)

      const node = gItem.node() as SVGGElement | null
      if (!node) return
      const w = node.getBBox().width

      if (lx + w > maxLegendWidth && lx > 0) {
        lx = 0
        ly += LEGEND_ITEM_GAP_Y
      }

      gItem.attr('transform', `translate(${lx},${ly})`)
      lx += w + LEGEND_ITEM_GAP_X
    })
}

onMounted(draw)
watch(() => props.series, draw, { deep: true })
watch(() => props.selectedValue, draw, { deep: true })
</script>

<style scoped>
.gender-chart {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0.5rem 0.75rem 0.5rem;
  position: relative;
}

.chart-header h3 {
  margin: 0.5rem 0.5rem 0.2rem;
  color: #2d3748;
  font-size: 1.1rem;
  font-weight: 700;
}

.sub {
  margin: 0 0 0.5rem 0.5rem;
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
</style>
