import { createApp } from 'vue'
import './style.css'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import App from './App.vue'
import type { Viewer } from 'cesium'

// @ts-ignore
window.CESIUM_BASE_URL = '/Cesium'


declare global {
  interface Window {
    viewer: Viewer | null
  }
}

createApp(App).mount('#app')
