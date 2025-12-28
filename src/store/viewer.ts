import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as Cesium from "cesium"

export const useViewerStore = defineStore('viewer', () => {
  const viewerReader = ref(false)
  const viewer = ref<Cesium.Viewer | null>(null)

  function setViewer(v: Cesium.Viewer) {
    viewer.value = v
    viewerReader.value = true
  }

  function destroyViewer() {
    if (viewer.value) {
      viewer.value.destroy()
      viewer.value = null
      viewerReader.value = false
    }  
  }

  return { viewerReader, viewer, setViewer, destroyViewer }
  
})