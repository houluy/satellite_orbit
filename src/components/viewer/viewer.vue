<template>
  <div id="cesiumContainer" ref="viewer">
    <slot></slot>
  </div>
    <!-- <draw-line-surface></draw-line-surface> -->
</template>

<script lang="ts">
export default {
  name: "viewer"
}
</script>

<script lang="ts" setup>
import { onMounted, ref } from "vue"
import { ElLoading } from "element-plus"
import initViewer from "./viewer"


const props = defineProps<{
  sceneUrl?: string
  afterInitviewer?: () => void
  openingAnimation?: boolean
}>()

onMounted(async () => {
  const loading = ElLoading.service({
    lock: true,
    text: "Loading...",
    background: "rgba(0, 0, 0, 0.3)"
  })
  await initViewer(props)
  loading.close()
})
</script>



