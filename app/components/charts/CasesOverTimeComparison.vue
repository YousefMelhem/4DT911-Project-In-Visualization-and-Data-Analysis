<template>
  <div class="chart-card">
    <div class="chart-header">
      <div>
        <h3>Cases over time by group</h3>
        <p class="sub">Monthly case counts for each group (absolute)</p>
      </div>

      <div class="legend" v-if="groups && groups.length">
        <div v-for="g in groups" :key="g.id" class="legend-item">
          <span class="legend-swatch" :style="{ backgroundColor: g.color }" />
          <span class="legend-label">
            {{ g.name }}
            <span class="legend-meta">({{ g.size.toLocaleString() }} cases)</span>
          </span>
        </div>
      </div>
    </div>

    <div class="chart-body">
      <svg
        ref="svgRef"
        class="svg-chart"
        :viewBox="`0 0 ${computedWidth} ${H}`"
        preserveAspectRatio="none"
        role="img"
        aria-label="Line chart of monthly case counts by group"
      />
      <div v-if="isEmpty" class="empty-note">No data</div>
    </div>

    <div
      v-if="tooltipVisible"
      class="chart-tooltip"
      :style="{ left: `${tooltipX}px`, top: `${tooltipY}px` }"
    >
      <div v-if="tooltipData" class="tooltip-content">
        <div class="tooltip-label">{{ tooltipData.label }}</div>
        <div class="tooltip-count">
          {{ tooltipData.groupName }}: {{ tooltipData.count.toLocaleString() }} cases
        </div>
        <div v-if="tooltipData.extra" class="tooltip-extra">{{ tooltipData.extra }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import * as d3 from 'd3'

type Point = { date: Date; count: number }

type GroupSeries = {
  id: string
  name: string
  color: string
  size: number
  series: Point[]
}

const props = defineProps<{
  groups: GroupSeries[]
}>()

const emit = defineEmits<{
  rangeChange: [{ start: Date; end: Date } | null]
}>()

const H = 200
const MARGIN = { top: 20, right: 20, bottom: 46, left: 56 }
const INNER_H = H - MARGIN.top - MARGIN.bottom

const svgRef = ref<SVGSVGElement | null>(null)

const chartWidth = ref(900)
const computedWidth = computed(() => chartWidth.value)

const measureWidth = () => {
  const el = svgRef.value
  if (!el) return
  const parent = el.parentElement
  if (!parent) return
  const rect = parent.getBoundingClientRect()
  if (rect.width > 0) chartWidth.value = rect.width
}

const isEmpty = computed(() => {
  if (!props.groups || props.groups.length === 0) return true
  return props.groups.every(g => !g.series || g.series.length === 0)
})

const tooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)
const tooltipData = ref<any>(null)

const showTooltip = (event: MouseEvent, data: any) => {
  tooltipData.value = data
  tooltipVisible.value = true
  tooltipX.value = event.clientX + 10
  tooltipY.value = event.clientY - 10
}

const hideTooltip = () => {
  tooltipVisible.value = false
}

const updatePosition = (event: MouseEvent) => {
  tooltipX.value = event.clientX + 10
  tooltipY.value = event.clientY - 10
}

const fmtTooltipMonth = d3.timeFormat('%b %Y')
const fmtTickLong = d3.timeFormat('%b %Y')
const fmtTickShort = d3.timeFormat('%b %y')
const fmtTickYear = d3.timeFormat('%Y')

const pickTickConfig = (x: d3.ScaleTime<number, number>, innerW: number) => {
  const candidates: Array<{ every: d3.TimeInterval; fmt: (d: Date) => string }> = [
    { every: d3.timeMonth, fmt: fmtTickLong },
    { every: d3.timeMonth.every(2) ?? d3.timeMonth, fmt: fmtTickShort },
    { every: d3.timeMonth.every(3) ?? d3.timeMonth, fmt: fmtTickShort },
    { every: d3.timeMonth.every(6) ?? d3.timeMonth, fmt: fmtTickShort },
    { every: d3.timeYear, fmt: fmtTickYear },
    { every: d3.timeYear.every(2) ?? d3.timeYear, fmt: fmtTickYear },
    { every: d3.timeYear.every(5) ?? d3.timeYear, fmt: fmtTickYear },
  ]

  const fontPx = 8
  const pad = 8
  const estTextWidth = (s: string) =>
    Math.max(18, s.length * (fontPx * 0.62)) + pad

  for (const c of candidates) {
    const ticks = x.ticks(c.every)
    if (ticks.length <= 1) return { every: c.every, fmt: c.fmt }

    let ok = true
    for (let i = 0; i < ticks.length; i++) {
      const t = ticks[i] as Date
      const txt = c.fmt(t)
      const w = estTextWidth(txt)
      const xt = x(t)

      const left = xt - w / 2
      const right = xt + w / 2

      if (left < MARGIN.left - 1) { ok = false; break }
      if (right > MARGIN.left + innerW + 1) { ok = false; break }

      if (i > 0) {
        const prev = ticks[i - 1] as Date
        const prevTxt = c.fmt(prev)
        const prevW = estTextWidth(prevTxt)
        const xp = x(prev)
        const prevRight = xp + prevW / 2
        if (left < prevRight + 2) { ok = false; break }
      }
    }

    if (ok) return { every: c.every, fmt: c.fmt }
  }

  return { every: d3.timeYear.every(5) ?? d3.timeYear, fmt: fmtTickYear }
}


const draw = () => {
  const el = svgRef.value
  if (!el) return

  const W = computedWidth.value
  const INNER_W = W - MARGIN.left - MARGIN.right

  const svg = d3.select(el)
  svg.selectAll('*').remove()

  if (!props.groups || props.groups.length === 0 || isEmpty.value) return

  const allPoints: Point[] = []
  for (const g of props.groups) for (const p of g.series ?? []) allPoints.push(p)
  if (!allPoints.length) return

  const xDomain = d3.extent(allPoints, d => d.date) as [Date, Date]
  const yMax = (d3.max(allPoints, d => d.count) ?? 0) || 0

  const x = d3.scaleTime()
    .domain(xDomain)
    .range([MARGIN.left, MARGIN.left + INNER_W])

  const y = d3.scaleLinear()
    .domain([0, yMax])
    .nice()
    .range([MARGIN.top + INNER_H, MARGIN.top])

  const xAxisG = svg.append('g')
    .attr('transform', `translate(0,${MARGIN.top + INNER_H})`)

  const tickCfg = pickTickConfig(x, INNER_W)

  xAxisG.call(
    d3.axisBottom(x)
      .ticks(tickCfg.every)
      .tickFormat((d) => tickCfg.fmt(d as Date))
  )

  xAxisG.selectAll('text')
    .style('font-size', '8px')
    .attr('transform', 'translate(0,4)')
    .style('text-anchor', 'middle')

  svg.append('g')
    .attr('transform', `translate(${MARGIN.left},0)`)
    .call(d3.axisLeft(y).ticks(5))
    .selectAll('text')
    .style('font-size', '10px')

  const lineGen = d3.line<Point>()
    .x(d => x(d.date))
    .y(d => y(d.count))
    .curve(d3.curveMonotoneX)

  for (const g of props.groups) {
    const data = (g.series ?? []).slice().sort((a, b) => +a.date - +b.date)
    if (!data.length) continue

    const totalForGroup = data.reduce((sum, d) => sum + d.count, 0)

    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', g.color || '#667eea')
      .attr('stroke-width', 2)
      .attr('opacity', 0.95)
      .attr('d', lineGen)

    svg.append('g')
      .selectAll(`circle.group-${g.id}`)
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.date))
      .attr('cy', d => y(d.count))
      .attr('r', 2)
      .attr('fill', g.color || '#667eea')
      .attr('opacity', 0.9)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d: Point) {
        d3.select(this).transition().duration(150).attr('r', 4).attr('opacity', 1)

        const pct = totalForGroup > 0 ? ((d.count / totalForGroup) * 100).toFixed(1) : '0.0'
        showTooltip(event as MouseEvent, {
          label: fmtTooltipMonth(d.date),
          count: d.count,
          groupName: g.name,
          extra: `${pct}% of this group's cases`,
        })
      })
      .on('mousemove', (event) => updatePosition(event as MouseEvent))
      .on('mouseleave', function () {
        d3.select(this).transition().duration(150).attr('r', 2).attr('opacity', 0.9)
        hideTooltip()
      })
  }

  const brushBandHeight = 24
  const bandBottom = MARGIN.top + INNER_H
  const bandTop = bandBottom - brushBandHeight

  const brush = d3.brushX()
    .extent([[MARGIN.left, bandTop], [MARGIN.left + INNER_W, bandBottom]])
    .on('brush', (event) => {
      const sel = event.selection as [number, number] | null
      if (!sel) return
      const [x0, x1] = sel

      svg.select<SVGGElement>('.brush').select<SVGRectElement>('.selection')
        .attr('x', x0)
        .attr('width', x1 - x0)
        .attr('y', MARGIN.top)
        .attr('height', INNER_H)
    })
    .on('end', (event) => {
      const sel = event.selection as [number, number] | null
      if (!sel) {
        emit('rangeChange', null)
        return
      }
      const [x0, x1] = sel
      emit('rangeChange', { start: x.invert(x0), end: x.invert(x1) })

      svg.select<SVGGElement>('.brush').select<SVGRectElement>('.selection')
        .attr('y', MARGIN.top)
        .attr('height', INNER_H)
    })

  const brushG = svg.append('g').attr('class', 'brush').call(brush)

  brushG.selectAll('.selection')
    .attr('fill', '#667eea')
    .attr('fill-opacity', 0.16)
    .attr('stroke', '#667eea')
    .attr('stroke-width', 1.5)

  brushG.selectAll('.overlay').style('cursor', 'crosshair')
}

onMounted(() => {
  nextTick(() => {
    measureWidth()
    draw()
  })
  window.addEventListener('resize', measureWidth)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', measureWidth)
})

watch(
  () => props.groups,
  () => {
    nextTick(() => {
      measureWidth()
      draw()
    })
  },
  { deep: true }
)

watch(computedWidth, draw)
</script>

<style scoped>
.chart-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 1rem 1rem 1.25rem;
  position: relative;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.chart-header h3 {
  margin: 0.25rem 0 0.25rem;
  color: #2d3748;
  font-size: 1.1rem;
  font-weight: 700;
}

.sub {
  margin: 0;
  color: #718096;
  font-size: 0.9rem;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.75rem;
  justify-content: flex-end;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  white-space: nowrap;
}

.legend-swatch {
  width: 9px;
  height: 9px;
  border-radius: 999px;
}

.legend-label {
  color: #2d3748;
}

.legend-meta {
  color: #718096;
  font-size: 0.78rem;
}

.chart-body {
  width: 100%;
  position: relative;
  margin-top: 0.6rem;
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
  background-color: rgba(0,0,0,0.85);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  max-width: 260px;
  word-wrap: break-word;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  border: 1px solid rgba(255,255,255,0.1);
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tooltip-label {
  font-weight: bold;
  font-size: 13px;
  border-bottom: 1px solid rgba(255,255,255,0.2);
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
</style>
