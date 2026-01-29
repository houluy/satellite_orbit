
import { onBeforeUnmount } from 'vue'
import { useViewerStore } from '@/store/viewer'
import { Viewer, Color, Cartesian3, BingMapsImageryProvider, Scene, ClippingPlane } from "cesium"
import { loadImageries } from './testImageries'
import * as Cesium from "cesium"

type Props = Partial<{
  container: string | HTMLElement 
  sceneUrl: string
  afterInitviewer: (viewer: Cesium.Viewer) => void 
  openingAnimation: boolean
}>

async function initViewer(props: Props, callback?: () => void): Promise<Cesium.Viewer> {
  // 初始化viewerStore
  const viewerStore = useViewerStore()
  
  //仅在已有实例时销毁，避免重复销毁
  if (viewerStore.viewer) {
    viewerStore.destroyViewer()
  }

  // Cesium Ion Token
  Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2NGRlZWM1Mi1mYmFmLTQwODEtODI2ZS0wNjgxZDdjOGYzOTMiLCJpZCI6ODMzNTgsImlhdCI6MTY0NTUzNjc3Nn0.BVnIvefsZE3yGxBEToV6RsWlLL4nKgMdgG2hsp3JMsY"

  //处理容器：支持ID字符串/直接传DOM元素
  const container = props.container || "cesiumContainer"

  // 初始化Cesium Viewer
  let viewer = new Cesium.Viewer(container, {
    terrainProvider: await Cesium.CesiumTerrainProvider.fromUrl(
      Cesium.IonResource.fromAssetId(3956), {
        requestVertexNormals: true
    }),
    showRenderLoopErrors: false,
    shouldAnimate: true,
    selectionIndicator: false,
    timeline: false,
    baseLayerPicker: false,
    infoBox: false,
    navigationHelpButton: false,
    navigationInstructionsInitiallyVisible: false,
    contextOptions: {
      webgl: {
        stencil: true,
        preserveDrawingBuffer: true,
      },
    }
  })


  viewer.scene.globe.depthTestAgainstTerrain = false
  viewer.scene.postProcessStages.fxaa.enabled = true//抗锯齿

  // 相机监听函数
  const fetchCurrentCamera = (viewer: Viewer) => {
    viewer.camera.changed.addEventListener(() => {
      console.log(`Camera Position: ${viewer.scene.camera.position}`);
      console.log(`Camera Position Cartographic: ${viewer.scene.camera.positionCartographic}`);
      console.log(`Camera direction: (${viewer.scene.camera.heading}, ${viewer.scene.camera.pitch}, ${viewer.scene.camera.roll}`)
    })
  }
  // fetchCurrentCamera(viewer)
  function openingAnimation() {}

  // 执行业务逻辑
  try {
    if (props && props.openingAnimation) {
      openingAnimation()
    }
    if (props && props.afterInitviewer) {
      props.afterInitviewer(viewer)
    }
    if (callback) {
      callback()
    }
  } catch (e) {
    console.error("Init viewer business logic error:", e)
  }

  viewerStore.setViewer(viewer)

  return viewer
}

export function destroyViewerOnUnmount() {
  const viewerStore = useViewerStore()
  onBeforeUnmount(() => {
    viewerStore.destroyViewer()
  })
}

export default initViewer