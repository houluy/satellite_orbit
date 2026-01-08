<template>

<div v-for="(selectedSatelliteEntities, index) in selectedSatelliteIds" :key="index">
  {{ selectedSatelliteEntities.name }}
</div>

</template>

<script lang="ts" setup>

import { onMounted, watch, ref } from 'vue';
import { useViewerStore } from '@/store/viewer';
import * as Cesium from "cesium"

const viewerStore = useViewerStore()

const props = defineProps<{
  selectedSatelliteIds: string[]
}>()

const selectedSatelliteEntities = ref<Cesium.Entity[]>([])

onMounted(() => {
  watch(() => viewerStore.viewerReady, (newVal: boolean) => {
    if (newVal) {
      const viewer = viewerStore.viewer
      props.selectedSatelliteIds.forEach((satId: string) => {
        const entity = viewer?.entities.getById(satId)
        if (entity !== undefined) {
          selectedSatelliteEntities.value.push(entity)
        }
      })
    }
  })
})

</script>

<style scoped>

</style>