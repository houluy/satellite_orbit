
<template>
  <div class="data-panel" :style="{ top: top + 'px', left: left + 'px' }">
    <el-card class="panel-card" :class="{ collapsed: isCollapsed }">
      <template #header>
        <div class="panel-header" @mousedown.stop.prevent="startDrag">
          <div class="header-left">
            <span class="card-header">Fly To</span>
            <button class="cancel-fly-btn" @click="cancelFly">Cancel</button>
          </div>
          <button class="collapse-btn" @click.stop="isCollapsed = !isCollapsed" :aria-expanded="!isCollapsed">
            {{ isCollapsed ? '▸' : '▾' }}
          </button>
        </div>
      </template>

      <div class="panel-body" v-show="!isCollapsed">
        <el-select v-model="selectedEntityId" placeholder="Select entity">
          <el-option-group
            v-for="(selection, index) in allEntitiesName"
            :key="index"
            :label="selection"
          >
            <el-option
              v-for="item in allEntities[selection]" 
              :key="item.id"
              :label="item.name"
              :value="item.id"
            ></el-option>
          </el-option-group>
        </el-select>
      </div>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import { ElForm, ElSelect, ElOption, ElOptionGroup, ElCard } from 'element-plus'
import { useViewerStore, useEntitiesStore } from '@/store/viewer';
import { onMounted, ref, watch, reactive, onBeforeUnmount } from 'vue';
import * as Cesium from 'cesium'

const allEntities = useEntitiesStore()
const viewerStore = useViewerStore()

const viewer = viewerStore.viewer

const allEntitiesName = [
  "satellites",
  "groundStations",
  "ues",
  "cells"
]

const selectedEntityId = ref("")

// draggable + collapsible state
const isCollapsed = ref(false)
const top = ref(10)
const left = ref(10)
const dragging = ref(false)
const dragOffset = reactive({ x: 0, y: 0 })

function startDrag(e: MouseEvent) {
  dragging.value = true
  dragOffset.x = e.clientX - left.value
  dragOffset.y = e.clientY - top.value
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
}

function onDrag(e: MouseEvent) {
  if (!dragging.value) return
  left.value = Math.max(8, Math.min(window.innerWidth - 80, e.clientX - dragOffset.x))
  top.value = Math.max(8, Math.min(window.innerHeight - 40, e.clientY - dragOffset.y))
}

function stopDrag() {
  dragging.value = false
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
}

// 取消飞到方法
function cancelFly() {
  if (viewer) {
    viewer.camera.cancelFlight();
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
})

watch(selectedEntityId, async (newVal) => {
  // 去除ID前后空格 + 转为字符串
  const cleanId = newVal?.toString().trim() || "";
  console.log("清洗后的实体ID：", cleanId); 
  console.log("Viewer实例是否存在：", !!viewer); 
  if (!cleanId || !viewer) return

  let targetPosition = null

  const satellitePrimitiveCollection = viewerStore.satellitePrimitive; 
  if (satellitePrimitiveCollection) {
    // 遍历Primitive集合找卫星（统一ID格式匹配）
    for (let i = 0; i < satellitePrimitiveCollection.length; i++) {
      const point = satellitePrimitiveCollection.get(i) as any;
      // 实体ID也转字符串+去空格，确保匹配
      const pointId = point?.satelliteId?.toString().trim() || "";
      if (pointId === cleanId) {
        console.log("找到Primitive中的卫星：", point);
        targetPosition = point.position; // 获取卫星位置
        break;
      }
    }
  }
  // 地面站/UE/小区从entitiesStore找
  if (!targetPosition) {
    for (const type of ["groundStations", "ues", "cells"]) {
      const entityList = (allEntities as any)[type] || [];
      const targetEntity = entityList.find((item: { id: any }) => {
        // 所有ID统一转字符串+去空格匹配
        return String(item.id).trim() === cleanId;
      });
      if (targetEntity) {
        console.log("找到地面站/UE：", targetEntity);
        targetPosition = Cesium.Cartesian3.fromDegrees(
          targetEntity.lng || targetEntity.longitude || 0,
          targetEntity.lat || targetEntity.latitude || 0,
          targetEntity.alt || 1000 // 加高度偏移，避免飞到地面
        );
        break;
      }
    }
  }

  // 执行飞行
  if (targetPosition) {
    console.log("目标位置：", targetPosition);
    viewer.camera.flyTo({
      destination: targetPosition,
      duration: 2,
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0
      }
    });
  } else {
    console.warn(`未找到ID=${cleanId}的卫星/地面站/UE！`);
    
    //const testPos = Cesium.Cartesian3.fromDegrees(116.4, 39.9, 1000);
    //viewer.camera.flyTo({ destination: testPos, duration: 2 });
  }
})
</script>

<style scoped>
.data-panel {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 9999;
  pointer-events: auto;
  -webkit-font-smoothing: antialiased;
}

.data-panel .panel-card {
  min-width: 180px;
  max-width: 320px;
  background: rgba(12, 16, 20, 0.55);
  color: #e6eef8;
  border-radius: 8px;
  padding: 6px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px) saturate(120%);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.card-header {
  font-size: 13px;
  font-weight: 600;
  color: #dbe9ff;
}

.data-panel :deep(.el-select) {
  width: 100%;
  font-size: 13px;
}

.data-panel :deep(.el-select .el-input__inner) {
  background: transparent;
  color: inherit;
  border: 1px solid rgba(255,255,255,0.06);
  padding: 6px 10px;
  border-radius: 6px;
}

.data-panel :deep(.el-select .el-input__inner:hover),
.data-panel :deep(.el-select .el-input__inner:focus) {
  border-color: rgba(255,255,255,0.12);
}

.data-panel :deep(.el-option) {
  color: #e6eef8;
}

.data-panel :deep(.el-select-dropdown) {
  background: rgba(8,10,12,0.85) !important;
  color: #e6eef8 !important;
  border-radius: 6px !important;
  border: 1px solid rgba(255,255,255,0.04) !important;
}

/* header + drag */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: grab;
  user-select: none;
}
.panel-header:active {
  cursor: grabbing;
}

/* 新增：左侧标题+按钮容器 */
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0; /* 防止容器被压缩 */
}

/* 新增：Cancel按钮样式 */
.cancel-fly-btn {
  appearance: none;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #dbe9ff;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0; /* 防止按钮被压缩 */
}
.cancel-fly-btn:hover {
  background: rgba(255, 255, 255, 0.18);
}

.collapse-btn {
  appearance: none;
  background: transparent;
  border: none;
  color: #dbe9ff;
  font-size: 13px;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
}
.collapse-btn:hover { background: rgba(255,255,255,0.02); }

.panel-card.collapsed {
  width: auto; /* 让面板宽度自适应内容 */
  height: 36px;
  padding: 6px;
  overflow: visible;
}

.panel-body {
  margin-top: 6px;
}

.data-panel {
  transition: transform 120ms ease, opacity 160ms ease;
}
</style>