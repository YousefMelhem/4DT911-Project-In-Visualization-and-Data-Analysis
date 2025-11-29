import { ref, onMounted, onUnmounted } from 'vue'

export interface TooltipData {
  label: string
  count: number
  total: number
  clusterNote?: string
}

export function useChartTooltip() {
  const tooltipVisible = ref(false)
  const tooltipX = ref(0)
  const tooltipY = ref(0)
  const tooltipData = ref<TooltipData | null>(null)

  const showTooltip = (event: MouseEvent, data: TooltipData) => {
    tooltipData.value = data
    tooltipX.value = event.pageX
    tooltipY.value = event.pageY
    tooltipVisible.value = true
  }

  const hideTooltip = () => {
    tooltipVisible.value = false
    tooltipData.value = null
  }

  const updatePosition = (event: MouseEvent) => {
    if (tooltipVisible.value) {
      tooltipX.value = event.pageX
      tooltipY.value = event.pageY
    }
  }

  return {
    tooltipVisible,
    tooltipX,
    tooltipY,
    tooltipData,
    showTooltip,
    hideTooltip,
    updatePosition
  }
}
