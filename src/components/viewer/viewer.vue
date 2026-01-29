<template>
  <!-- 切换按钮 
  <div class="page-switch-btn">
    <button @click="togglePage" :class="{ active: !cesiumStore.isThroughputPage }">卫星轨道</button>
    <button @click="togglePage" :class="{ active: cesiumStore.isThroughputPage }">吞吐量监控</button>
  </div>
 -->
  <!-- 唯一的 Cesium 容器：CSS 控制大小 -->
  <div 
    id="cesiumContainer" 
    ref="viewerRef" 
    :class="{ 'cesium-mini': cesiumStore.isThroughputPage }"
  >
    <slot></slot>
  </div>

  <!-- 吞吐量面板 -->
  <ThroughputPanel v-if="cesiumStore.isThroughputPage" />
</template>

<script lang="ts">
export default {
  name: "viewer"
}
</script>

<script lang="ts" setup>
import { onMounted, ref } from "vue"
import { ElLoading } from "element-plus"
import * as Cesium from 'cesium'
import initViewer from "./viewer"
import ThroughputPanel from "../panel/ThroughputPanel.vue"
import { useCesiumStore } from "@/store"

// 1. 初始化 store
const cesiumStore = useCesiumStore()
const viewerRef = ref<HTMLElement | null>(null)
let loading: ReturnType<typeof ElLoading.service> | null = null

// 页面切换逻辑
const togglePage = () => {
  cesiumStore.togglePage()
}

// 2. 定义 props
const props = defineProps<{
  sceneUrl?: string
  afterInitviewer?: (viewer: Cesium.Viewer) => void
  openingAnimation?: boolean
}>()

// 3. 初始化 Cesium
onMounted(async () => {
  // 已有实例，直接返回
  if (cesiumStore.viewer) return

  loading = ElLoading.service({
    lock: true,
    text: "Loading...",
    background: "rgba(0, 0, 0, 0.3)"
  })

  try {
    // 校验 DOM 存在
    if (!viewerRef.value) {
      throw new Error("Cesium container DOM element is null!")
    }

    // 4. 调用 initViewer：传完整的 options 对象（解决 HTMLElement 类型不匹配）
    const viewerInstance: Cesium.Viewer = await initViewer({
      container: viewerRef.value,       // 必传容器
      sceneUrl: props.sceneUrl,         // 业务配置
      openingAnimation: props.openingAnimation // 业务配置
    })

    // 5. 存入 store
    cesiumStore.setViewer(viewerInstance)

    // 触发回调
    if (typeof props.afterInitviewer === 'function') {
      props.afterInitviewer(viewerInstance)
    }
  } catch (error) {
    console.error("Cesium init failed:", error)
  } finally {
    loading?.close()
  }
})
</script>

<style scoped>
#cesiumContainer {
  /* 删掉 width: 100vw; height: 100vh; */
  width: 100%; /* 继承父容器宽度 */
  height: calc(100vh - 40px); /* 保持你之前的高度 */
  transition: all 0.3s ease;
}

/* 小窗口 Cesium 样式（吞吐量页面） */
#cesiumContainer.cesium-mini {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 400px;
  height: 300px;
  border-radius: 8px;
  z-index: 10;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
}

/* 切换按钮样式 */
.page-switch-btn {
  position: fixed;
  top: 20px;         /* 距离顶部的距离 */
  left: 50%;         /* 左移50% */
  transform: translateX(-50%);  /* 向左偏移自身宽度的50% → 实现水平居中 */
  z-index: 9999;     /* 确保在最上层 */
  display: flex;
  gap: 10px;         /* 按钮之间的间距 */
}
.page-switch-btn button {
  padding: 8px 16px;
  background: rgba(0, 60, 136, 0.8);
  color: #fff;
  border: 1px solid #1E90FF;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}
.page-switch-btn button:hover {
  background: #1E90FF;
}
.page-switch-btn button.active {
  background: #1E90FF;
  border-color: #87CEFA;
}
</style>