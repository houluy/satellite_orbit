import { defineStore } from 'pinia'
import * as Cesium from 'cesium'

export const useCesiumStore = defineStore('cesium', {
  state: () => ({
    viewer: null as Cesium.Viewer | null, // 存储唯一的Cesium实例
    isThroughputPage: false // 页面切换状态
  }),
  actions: {
    setViewer(viewer: Cesium.Viewer) {
      this.viewer = viewer
    },
    togglePage() {
      this.isThroughputPage = !this.isThroughputPage
    }
  }
})