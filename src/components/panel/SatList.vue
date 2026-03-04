<template>

<div v-for="(selectedSatelliteEntity, index) in selectedSatelliteEntities" :key="index">
  {{ selectedSatelliteEntity.name }}
</div>

</template>

<script lang="ts" setup>

import { computed, onMounted, watch, ref } from 'vue';
import { useViewerStore } from '@/store/viewer';
import * as Cesium from "cesium"

const viewerStore = useViewerStore()

const props = defineProps<{
  selectedSatelliteIds: string[]
}>()

let selectedSatelliteEntities = ref<Cesium.Entity[]>([])

watch(() => props.selectedSatelliteIds, (newVal: string[]) => {
  selectedSatelliteEntities.value = []
  console.log(newVal)
  const viewer = viewerStore.viewer
  newVal.forEach((satId: string) => {
    const entity = viewer?.entities.getById(satId)
    if (entity !== undefined) {
      selectedSatelliteEntities.value.push(entity)
    }
  })
})

//onMounted(() => {
  //watch(() => viewerStore.viewerReady, (newVal: boolean) => {
  //  if (newVal) {
  //    const viewer = viewerStore.viewer
  //    
  //  }
  //})
//})

</script>

<style scoped>

</style>