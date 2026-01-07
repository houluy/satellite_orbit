<template>
  <div class="data-panel" :style="{ top: top + 'px', left: left + 'px' }">
    <el-card class="panel-card" :class="{ collapsed: isCollapsed }">
      <template #header>
        <div class="panel-header" @mousedown.stop.prevent="startDrag">
          <span class="card-header">Fly To</span>
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

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
})

watch(selectedEntityId, async (newVal) => {
  if (newVal) {
    const selectedEntity = viewer?.entities.getById(newVal)
    //TODO: viewer.flyTo not working
    viewer!.camera.flyTo({
      destination: selectedEntity?.position!.getValue(),
    })
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
}
.collapse-btn:hover { background: rgba(255,255,255,0.02); }

.panel-card.collapsed {
  width: 44px;
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