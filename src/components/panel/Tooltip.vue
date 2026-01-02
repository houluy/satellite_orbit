<template>
  <div v-if="visible" :style="styleObject" class="cesium-tooltip" v-html="html"></div>
</template>

<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
  visible: boolean,
  styleObject: {},
  html: string
}>(), {
  visible: false,
  styleObject: () => ({ left: '0px', top: '0px'}),
  html: ''
})
  
</script>

<style scoped>
.cesium-tooltip{
  position: fixed;
  transform: translate(12px, 12px);
  pointer-events: none;
  background: rgba(0,0,0,0.8);
  color: #fff;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 13px;
  max-width: 300px;
  z-index: 9999;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
</style>