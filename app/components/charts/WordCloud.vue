<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as d3 from 'd3'
// @ts-ignore
import cloud from 'd3-cloud/build/d3.layout.cloud.js'

interface TermItem {
  term: string
  weight: number
}

const props = defineProps<{
  terms: TermItem[]
}>()

const svgRef = ref<SVGSVGElement | null>(null)
const width = ref(0)
const height = ref(0)

const minFont = 12
const maxFont = 40

let resizeObserver: ResizeObserver | null = null

const measure = () => {
  if (!svgRef.value) return
  const parent = svgRef.value.parentElement
  if (!parent) return

  const rect = parent.getBoundingClientRect()

  width.value = rect.width || 0

  const targetHeight = (rect.width || 500) * 0.35
  height.value = Math.max(150, Math.min(260, targetHeight))
}


const drawCloud = () => {
  if (!svgRef.value) return
  if (!props.terms?.length) {
    d3.select(svgRef.value).selectAll('*').remove()
    return
  }
  if (!width.value || !height.value) return

  const words = props.terms.map(t => ({
    text: t.term,
    size: minFont + t.weight * (maxFont - minFont),
  }))

  const layout = cloud()
    .size([width.value, height.value])
    .words(words)
    .padding(3)
    .rotate(() => 0)
    .font('system-ui')
    .fontSize((d: { size: number }) => d.size)
    .on('end', (placed: any[]) => {
      const svg = d3.select(svgRef.value)
      svg.selectAll('*').remove()

      svg
        .attr('width', width.value)
        .attr('height', height.value)

      const g = svg
        .append('g')
        .attr('transform', `translate(${width.value / 2}, ${height.value / 2})`)

      g.selectAll('text')
        .data(placed)
        .enter()
        .append('text')
        .text((d: any) => d.text)
        .attr('text-anchor', 'middle')
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`)
        .style('font-size', (d: any) => `${d.size}px`)
        .style('font-family', 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif')
        .style('fill', (d: any, i: number) =>
          d3.interpolateBlues(0.4 + 0.6 * (i / placed.length))
        )
        .style('opacity', (d: any) => 0.6 + 0.4 * ((d.size - minFont) / (maxFont - minFont)))
    })

  layout.start()
}

const relayout = () => {
  nextTick(() => {
    measure()
    drawCloud()
  })
}

onMounted(() => {
  measure()
  relayout()

  if (typeof ResizeObserver !== 'undefined' && svgRef.value?.parentElement) {
    resizeObserver = new ResizeObserver(() => {
      relayout()
    })
    resizeObserver.observe(svgRef.value.parentElement)
  }
})

onBeforeUnmount(() => {
  if (resizeObserver && svgRef.value?.parentElement) {
    resizeObserver.unobserve(svgRef.value.parentElement)
  }
})

watch(
  () => props.terms,
  () => {
    relayout()
  },
  { deep: true }
)
</script>

<template>
  <div class="cloud-wrapper" v-if="terms && terms.length">
    <svg ref="svgRef"></svg>
  </div>
  <p v-else class="empty">No terms available for this selection.</p>
</template>

<style scoped>
.cloud-wrapper {
  position: relative;
  width: 100%;
  min-height: 140px;

  display: flex;
  flex: 1;        
  align-items: center; 
  justify-content: center;
}

svg {
  display: block;
}

.empty {
  font-size: 0.9rem;
  color: #718096;
}
</style>
