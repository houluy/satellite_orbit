
//import { addScene, addS3mLayers } from "@/js/common/layerManagement.js"
//import { actions, storeDate } from '@/js/store/store'   //局部状态管理
//import EventManager from '@/js/common/eventManager/EventManager.js'   //事件管理
import { onBeforeUnmount } from 'vue'
import { useViewerStore } from '@/store/viewer'
//import createTooltip, { tooltip } from '@/js/tool/tooltip2'
//import { useViewer } from "@/js/store"
//import MeasureHandler from "../SupermapTools/analysis_3d/measure/measureHandler"
import { Viewer, FeatureDetection, Color, Cartesian3, BingMapsImageryProvider, Scene, ClippingPlane } from "cesium"
import { loadImageries } from './testImageries'
//import { add3D } from "@/data/add3DTilesets"
import * as Cesium from "cesium"

type Props = Partial<{
  sceneUrl: string
  // s3mScps: []
  afterInitviewer: () => void
  openingAnimation: boolean
}>

async function initViewer(props: Props, callback?: () => void) {
  //初始化viewer
  const viewerStore = useViewerStore()
  viewerStore.destroyViewer()
  
  Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2NGRlZWM1Mi1mYmFmLTQwODEtODI2ZS0wNjgxZDdjOGYzOTMiLCJpZCI6ODMzNTgsImlhdCI6MTY0NTUzNjc3Nn0.BVnIvefsZE3yGxBEToV6RsWlLL4nKgMdgG2hsp3JMsY"   // FIXME: Only used for Cesium Ion services.
  //let bingUrl = "http://dev.virtualearth.net"
  //let bingKey = "AjUmEACboFS3jnRO7DiuMP4IDhwCDl-IFyZ_hIOYYub9GPO2UqSQiPJkhLmYdcFL"
  let viewer = new Cesium.Viewer("cesiumContainer", {
    terrainProvider: await Cesium.CesiumTerrainProvider.fromUrl(
      Cesium.IonResource.fromAssetId(3956), {
        requestVertexNormals: true
    }),
    showRenderLoopErrors: false,
    shouldAnimate: true,
    selectionIndicator: false,
    timeline: false,
    baseLayerPicker: false,
    //shadows: true,
    infoBox: false,
    // geocoder: true,  //查询
    // skyBox: false, // 关闭天空盒会一同关闭太阳，场景会变暗
    navigationHelpButton: false,
    navigationInstructionsInitiallyVisible: false,
    // creditDisplay: false,
    //clockViewModel: false,
    contextOptions: {
      webgl: {
        stencil: true,
        preserveDrawingBuffer: true,
      },
      //getWebGLStub: (params) => {
      //  console.log("getWebGLStub")
      //  console.log(params)
      //}
    }
  })
  viewer.scene.globe.depthTestAgainstTerrain = false
  // 太阳光默认打开
  // viewer.scene.globe.enableLighting = true;
  //隐藏时间线控件
  // document.getElementsByClassName(
  //   "cesium-viewer-timelineContainer"
  // )[0].style.visibility = "hidden"

  const fetchCurrentCamera = (viewer: Viewer) => {
    viewer.camera.changed.addEventListener(() => {
      console.log(`Camera Position: ${viewer.scene.camera.position}`);
      console.log(`Camera Position Cartographic: ${viewer.scene.camera.positionCartographic}`);
      console.log(`Camera direction: (${viewer.scene.camera.heading}, ${viewer.scene.camera.pitch}, ${viewer.scene.camera.roll}`)
    })
  }
  //fetchCurrentCamera(viewer)
  function openingAnimation() {

  }

  // 添加图层
  try {
    if (props && props.openingAnimation) {
      openingAnimation()
    }
    if (props && props.afterInitviewer) {
      props.afterInitviewer()
    }
  } catch (e) {

  }
  
  viewer.scene.postProcessStages.fxaa.enabled = true//抗锯齿
  viewerStore.setViewer(viewer)

  // 销毁
  onBeforeUnmount(() => {
    viewerStore.destroyViewer()
  })
};


export default initViewer