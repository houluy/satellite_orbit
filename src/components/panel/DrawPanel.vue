<template>
  <div>
    <el-drawer
      v-model="modelValue"
      :with-header="false"
      direction="ltr"
      :show-close="true"
      class="cesium-drawer"
    >
      <span>Hi, there!</span>
    </el-drawer>
  </div>
</template>

<script lang="ts" setup>
import { ElDrawer } from 'element-plus'

const modelValue = defineModel<boolean>()
</script>

<style scoped>
:deep(.cesium-drawer.el-drawer__wrapper) {
  background: transparent;
}

:deep(.cesium-drawer.el-drawer__header) {
  background: rgba(12, 14, 16, 0.72);
  color: #e6eef8;
  padding: 8px 14px;
  height: 48px;
  display: flex;
  align-items: center;
  font-size: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(6px) saturate(120%);
  -webkit-backdrop-filter: blur(6px) saturate(120%);
}

:deep(.cesium-drawer.el-drawer__title) {
  color: #dfe9fb;
  font-weight: 600;
}

:deep(.cesium-drawer.el-drawer__body) {
  background: linear-gradient(180deg, rgba(1, 32, 63, 0.66), rgba(0, 3, 7, 0.6));
  color: #d7e6ff;
  padding: 12px 14px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
  font-size: 13px;
}

:deep(.cesium-drawer.el-drawer__close-btn) {
  color: rgba(220, 230, 255, 0.8);
}

:deep(.cesium-drawer.el-drawer__close-btn:hover) {
  color: #fff;
}

:deep(.cesium-drawer.el-drawer__body::-webkit-scrollbar) {
  width: 8px;
}

:deep(.cesium-drawer.el-drawer__body::-webkit-scrollbar-thumb) {
  background: rgba(255,255,255,0.06);
  border-radius: 6px;
}

:deep(.cesium-drawer.el-drawer__body::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(.cesium-drawer) {
  --cesium-drawer-width: 360px;
}

@media (max-width: 600px) {
  :deep(.cesium-drawer) {
    --cesium-drawer-width: 100%;
  }
}
</style>