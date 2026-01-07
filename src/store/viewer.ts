import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as Cesium from "cesium"
import type { CellObject, GroundObject, Satellite } from '@/model/satellite'

export const useViewerStore = defineStore('viewer', () => {
  const viewerReady = ref(false)
  const viewer = ref<Cesium.Viewer | null>(null)

  function setViewer(v: Cesium.Viewer) {
    viewer.value = v
    viewerReady.value = true
  }

  function destroyViewer() {
    if (viewer.value) {
      viewer.value.destroy()
      viewer.value = null
      viewerReady.value = false
    }  
  }

  return { viewerReady, viewer, setViewer, destroyViewer }
})

export const useEntitiesStore = defineStore('entities', () => {
  const groundStations = ref<GroundObject[]>([])
  const ues = ref<GroundObject[]>([])
  const satellites = ref<Satellite[]>([])
  const cells = ref<CellObject[]>([])

  return { groundStations, ues, satellites, cells }
})