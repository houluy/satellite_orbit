import { createApp } from 'vue'
import './style.css'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import App from './App.vue'
import { createPinia } from 'pinia'
import type { Viewer } from 'cesium'

// @ts-ignore
window.CESIUM_BASE_URL = '/Cesium'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)

//declare global {
//  interface Window {
//    viewer: Viewer | null
//  }
//}

app.mount('#app')
