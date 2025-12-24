
//import { addScene, addS3mLayers } from "@/js/common/layerManagement.js"
//import { actions, storeDate } from '@/js/store/store'   //局部状态管理
//import EventManager from '@/js/common/eventManager/EventManager.js'   //事件管理
import { onBeforeUnmount } from 'vue'
//import createTooltip, { tooltip } from '@/js/tool/tooltip2'
import resource from '@/js/local/lang'  //语言资源
import { useViewer } from "@/js/store"
import MeasureHandler from "../SupermapTools/analysis_3d/measure/measureHandler"
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
  if (window.viewer) {
    window.viewer = null;
  }
  
  Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2NGRlZWM1Mi1mYmFmLTQwODEtODI2ZS0wNjgxZDdjOGYzOTMiLCJpZCI6ODMzNTgsImlhdCI6MTY0NTUzNjc3Nn0.BVnIvefsZE3yGxBEToV6RsWlLL4nKgMdgG2hsp3JMsY"   // FIXME: Only used for Cesium Ion services.
  let bingUrl = "http://dev.virtualearth.net"
  let bingKey = "AjUmEACboFS3jnRO7DiuMP4IDhwCDl-IFyZ_hIOYYub9GPO2UqSQiPJkhLmYdcFL"
  let viewer = new Cesium.Viewer("cesiumContainer", {
    terrainProvider: await Cesium.CesiumTerrainProvider.fromUrl(
      Cesium.IonResource.fromAssetId(3956), {
        requestVertexNormals: true
    }),
    showRenderLoopErrors:false,
    shouldAnimate:true,
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
  //const allTilesets = await add3D(viewer)
  //window.allTilesets = allTilesets
  viewer.scene.globe.depthTestAgainstTerrain = true
  //const osmBuildingsTileset = await Cesium.createOsmBuildingsAsync();
  //viewer.scene.primitives.add(osmBuildingsTileset);
  // viewer.flyTo(allTilesets[0].asset)
  // 太阳光默认打开
  // viewer.scene.globe.enableLighting = true;
  //隐藏时间线控件
  // document.getElementsByClassName(
  //   "cesium-viewer-timelineContainer"
  // )[0].style.visibility = "hidden"

  //Load Test data
  //Load imagery layers
  // viewer.imageryLayers.addImageryProvider(new Cesium.ArcGisMapServerImageryProvider({
  //   url : 'http://map.geoq.cn/ArcGIS/rest/services/ChinaOnlineCommunity/MapServer'
  // }))
  // viewer.imageryLayers.addImageryProvider(new Cesium.BingMapsImageryProvider({
  //   url: 'https://dev.virtualearth.net',
  //   mapStyle: Cesium.BingMapsStyle.AERIAL,
  //   key: 'AjUmEACboFS3jnRO7DiuMP4IDhwCDl-IFyZ_hIOYYub9GPO2UqSQiPJkhLmYdcFL'
  // }))
  // viewer.imageryLayers.addImageryProvider(new Cesium.BingMapsImageryProvider({
  //   url: 'https://dev.virtualearth.net',
  //   mapStyle: Cesium.BingMapsStyle.AERIAL_WITH_LABELS_ON_DEMAND,
  //   key: 'AjUmEACboFS3jnRO7DiuMP4IDhwCDl-IFyZ_hIOYYub9GPO2UqSQiPJkhLmYdcFL'
  // }))
  // loadImageries(viewer)
  // const testCesiumImageryLayer = Cesium.ImageryLayer.fromProviderAsync(
  //   Cesium.IonImageryProvider.fromAssetId(3954, {}),
  //   {}
  // )
  // const testCesiumImageryLayer = Cesium.ImageryLayer.fromProviderAsync(
  //   Cesium.IonImageryProvider.fromAssetId(3812, {}),
  //   {}
  // )
  // viewer.imageryLayers.add(testCesiumImageryLayer)
  // viewer.imageryLayers.add(testCesiumImageryLayer2)
  // viewer.imageryLayers.add(
  //   new Cesium.ImageryLayer(
  //     new Cesium.WebMapServiceImageryProvider({
  //       url:
  //         "https://mesonet.agron.iastate.edu/cgi-bin/wms/goes/conus_ir.cgi?",
  //       layers: "goes_conus_ir",
  //       credit: "Infrared data courtesy Iowa Environmental Mesonet",
  //       parameters: {
  //         transparent: "true",
  //         format: "image/png",
  //       },
  //     }), {}
  //   )
  // )

  //Load Terrain in viewer
  // const terrainProvider = await Cesium.createWorldTerrainAsync()
  // viewer.scene.terrainProvider = terrainProvider
  //Load 3D tiles
  // const tile3dExampleUrl = "/public/data/3dtiles/SparseImplicitQuadtree/tileset.json"
  // const cesium3dtilesAssetId = 1415196
  // const tile3dExample = Cesium.Cesium3DTileset.fromIonAssetId(cesium3dtilesAssetId, {
  //   classificationType: Cesium.ClassificationType.CESIUM_3D_TILE
  // })
  // viewer.scene.primitives.add(tile3dExample)
  // viewer.flyTo(tile3dExample)
  //Load 3D models
  // const model3dExampleUrl = "/public/data/3dmodels/house1.glb"
  // const position = Cesium.Cartesian3.fromDegrees(
  //   -123.0744619,
  //   44.0503706,
  //   0
  // )
  // const heading = Cesium.Math.toRadians(135)
  // const pitch = 0
  // const roll = 0
  // const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll)
  // const orientation = Cesium.Transforms.headingPitchRollQuaternion(
  //   position,
  //   hpr
  // )

  // const entity = viewer.entities.add({
  //   name: model3dExampleUrl,
  //   position: position,
  //   orientation: orientation,
  //   model: {
  //     uri: model3dExampleUrl,
  //     minimumPixelSize: 128,
  //     maximumScale: 1,
  //   },
  // });
  // // viewer.trackedEntity = entity;
  // // viewer.flyTo(entity)
  
   //viewer.scene.debugShowFramesPerSecond = true //帧率
   //viewer.scene.globe.baseColor = Color.BLACK // 没有影像图层时地球的底色
   //viewer.scene.globe.depthTestAgainstTerrain = true; //地形深度
  // // window.viewer = viewer;
  // // window.scene = viewer.scene;
  // viewer.scene.moon.show = false
  // viewer.eventManager = new EventManager(viewer)  //添加事件管理派发
  // let widget = viewer.cesiumWidget
  //const fetchCurrentCamera = (viewer: Viewer) => {
  //  viewer.camera.changed.addEventListener(() => {
  //    console.log(`Camera Position: ${viewer.scene.camera.position}`);
  //    console.log(`Camera Position Cartographic: ${viewer.scene.camera.positionCartographic}`);
  //    console.log(`Camera direction: (${viewer.scene.camera.heading}, ${viewer.scene.camera.pitch}, ${viewer.scene.camera.roll}`)
  //  })
  //}
  //fetchCurrentCamera(viewer)
  function openingAnimation() {
    // viewer.camera.flyTo({
    //   destination: new Cartesian3(
    //     6788287.844465209,
    //     -41980756.10214644,
    //     29619220.04004376
    //   ),
    //   duration: 0,
    //   complete: function () {
    //     viewer.camera.flyTo({
    //       destination: Cartesian3.fromDegrees(
    //         110.60396458865515,
    //         34.54408834959379,
    //         30644793.325518917
    //       ),
    //       duration: 5,
    //     });

    //   },
    // });
  }

  // 添加图层
  try {
    if (props && props.openingAnimation) {
      openingAnimation()
    }
    if (props && props.afterInitviewer) {
      props.afterInitviewer()
    }
    //if (props && props.sceneUrl) {
    //  //addScene(props.sceneUrl, {}, (layer) => {
    //  //})
    //}
    // if (props && props.s3mScps) {
    //   addS3mLayers(props.s3mScps);
    // }
  } catch (e) {
    // if (widget._showRenderLoopErrors) {
    //   let title = resource.showRenderLoopErrors
    //   widget.showErrorPanel(title, undefined, e)
    // }
  }
  
  const model =  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(120.906395,30.908471,18), //模型的加载位置,
    id:'1',
    name:'机房',
    model: {
      uri:'public/data/3dmodels/newrack2.gltf', //模型的地址 
      scale: 1, //模型缩放比例
      minimumPixelSize: 1, // 最小像素大小
      maximumScale: 300, // 模型的最大比例尺大小。 minimumPixelSize的上限
      incrementallyLoadTextures: true, // 加载模型后纹理是否可以继续流入
      runAnimations: true, // 是否应启动模型中指定的glTF动画
      clampAnimations: true, // 指定glTF动画是否应在没有关键帧的持续时间内保持最后一个姿势
      // heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,
    },
  })
  viewer.scene.postProcessStages.fxaa.enabled = true//抗锯齿
  // 销毁
  onBeforeUnmount(() => {
    viewer.destroy();
    window.viewer = null
  })
};


export default initViewer