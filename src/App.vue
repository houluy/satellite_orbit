<template>
  <Viewer />
  <Tooltip :visible="tooltipVisible" :styleObject="tooltipStyle" :html="tooltipHtml" />
  //<DrawPanel v-model="showDetail" />
  //<DataPanel v-if="dataReady"></DataPanel>
  <LinkBudgetDisplay />
</template>

<script lang="ts" setup>
import Viewer from '@/components/viewer/viewer.vue'
import Tooltip from '@/components/panel/Tooltip.vue'
import { useViewerStore, useEntitiesStore } from './store/viewer'
import { GUI } from 'lil-gui'
import * as Cesium from 'cesium'
import * as satellite from 'satellite.js'
import { calcOrbit, constellation, geoOrbit, calcElevation, eciToCartesian3 } from '@/components/satellite/orbit'
import { onMounted, watch, ref, toRefs } from 'vue'
import { TLEString, singleTLE } from './data/tle';
import { type Satellite, type Satellites, type Orbit, type GroundObject, Satellite2GroundLink, type CommunicationCapability, type CommunicationLink } from '@/model/satellite';
//import DataPanel from '@/components/panel/DataPanel.vue'
//import DrawPanel from './components/panel/DrawPanel.vue'
import { processLtesatCfg } from '@/components/data/processLtesat'
import LinkBudgetDisplay from '@/components/panel/LinkBudgetDisplay.vue'

const tooltipVisible = ref(false)
const showDetail = ref(false)
const panel = ref<HTMLElement|null>(null)
const tooltipHtml = ref("")
const tooltipStyle = { left: '0px', top: '0px' }
const dataReady = ref(false)

const gui = new GUI()
const allEntities = useEntitiesStore()

const config = {
  cesium: {
    depthDetection: false
  },
  satellite: {
    pointSize: 2,
    pointColor: "#74D3AE",
    orbitSize: 1,
    orbitColor: "#EF3054",
    velocityLength: 5,
    velocitySize: 5,
    velocityColor: "#f7ece1",
    running: false,
    showOrbit: false,
    showVelocity: false,
    showSatellite: true,
  },
  link: {
    show: true,
    UELinkColor: "#B8336A",
    GroundStationLinkColor: "#ABDAFC",
  },
  groundStation: {
    pointSize: 10,
    pointColor: "#3BB273",
  },
  ue: {
    pointSize: 10,
    pointColor: "#E1BC29",
  },
  cell: {
    outlineColor: "#fafffe",
    fillColor: "#fab0c3"
  }
}

// 删除 Entity 数组，改用 Primitive 存储 
// const orbitsEntities: Cesium.Entity[] = []  
// const satelliteEntities: Cesium.Entity[] = [] 
// const velocityEntities: Cesium.Entity[] = [] 
const ueLinkEntities: Cesium.Entity[] = []
const stationLinkEntities: Cesium.Entity[] = []

//  Primitive 引用 
const orbitCollection = ref<any>(null) //卫星轨道
const velocityCollection = ref<any>(null) //速度箭头

const cesiumFolder = gui.addFolder("cesium")
cesiumFolder.add(config.cesium, "depthDetection").onChange((value: boolean) => {
  const viewerStore = useViewerStore()
  const viewer = viewerStore.viewer
  if(!viewer) return;
  viewer!.scene.globe.depthTestAgainstTerrain = value
})

const satFolder = gui.addFolder("satellite")
const velocityFolder = satFolder.addFolder("velocity")
const orbitFolder = satFolder.addFolder("Orbit") 
const pointFolder = satFolder.addFolder("Point") 
const linkFolder = gui.addFolder("link")
const groundStationFolder = gui.addFolder("groundStation")
const ueFolder = gui.addFolder("ue")

groundStationFolder.addColor(config.groundStation, "pointColor").onChange((value: string) => {
  
  allEntities.groundStations.forEach((groundStation) => {
    groundStation.entity.point.color = Cesium.Color.fromCssColorString(value)
  })
})
ueFolder.addColor(config.ue, "pointColor").onChange((value: string) => {
  allEntities.ues.forEach((ue) => {
    ue.entity.point.color = Cesium.Color.fromCssColorString(value)
  })
})
groundStationFolder.add(config.groundStation, "pointSize", 1, 50).onChange((value: number) => {
  allEntities.groundStations.forEach((groundStation) => {
    groundStation.entity.point.pixelSize = value
  })
})
ueFolder.add(config.ue, "pointSize", 1, 50).onChange((value: number) => {
  allEntities.ues.forEach((ue) => {
    ue.entity.point.pixelSize = value
  })
})

// 轨道显隐控制
orbitFolder.add(config.satellite, "showOrbit").name("Show Orbit").onChange((value: boolean) => {
  const viewerStore = useViewerStore() as any;
  const viewer = viewerStore.viewer;
  if(!viewer || viewer.isDestroyed()) return;
  config.satellite.showOrbit = value;
  let orbitPrimitive = null;
  const primitives = viewer.scene.primitives;
  for (let i = 0; i < primitives.length; i++) {
    const primitive = primitives.get(i);
    if (primitive && primitive.isOrbitCollection) {
      orbitPrimitive = primitive;
      break;
    }
  }
  if (orbitPrimitive) {
    orbitPrimitive.show = value;
  } else if (value) {
    viewerStore.renderSatelliteOrbits(
      allEntities.satellites,
      config.satellite.orbitColor,
      config.satellite.orbitSize,
      true
    );
  }
})
// 轨道大小控制
orbitFolder.add(config.satellite, "orbitSize", 1, 50).name("Orbit Size").onChange((value: number) => {
  config.satellite.orbitSize = value;
  const viewerStore = useViewerStore();
  if (!viewerStore.viewer || viewerStore.viewer.isDestroyed() || allEntities.satellites.length === 0) return;
  
  try {
    orbitCollection.value = viewerStore.renderSatelliteOrbits(
      allEntities.satellites,
      config.satellite.orbitColor,
      value
    );
    if (orbitCollection.value) {
      orbitCollection.value.show = config.satellite.showOrbit;
    }
  } catch (e) {
    console.warn('更新轨道大小异常:', e);
  }
});
// 轨道颜色控制
orbitFolder.addColor(config.satellite, "orbitColor").name("Orbit Color").onChange((value: string) => {
  config.satellite.orbitColor = value;
  const viewerStore = useViewerStore();
  if (!viewerStore.viewer || viewerStore.viewer.isDestroyed() || allEntities.satellites.length === 0) return;
  
  try {
    orbitCollection.value = viewerStore.renderSatelliteOrbits(
      allEntities.satellites,
      value,
      config.satellite.orbitSize
    );
    if (orbitCollection.value) {
      orbitCollection.value.show = config.satellite.showOrbit;
    }
  } catch (e) {
    console.warn('更新轨道颜色异常:', e);
  }
});

// 卫星点 running 勾选框
pointFolder.add(config.satellite, "running").name("Running").onChange((value: boolean) => {
  config.satellite.running = value;
  const viewerStore = useViewerStore();
  const entitiesStore = useEntitiesStore();
  // 调用 store 的方法控制卫星运行/停止
  if (viewerStore.viewer && entitiesStore.satellites.length > 0) {
    viewerStore.setSatelliteRunning(value, entitiesStore.satellites);
  }
})
// 卫星点显隐控制
pointFolder.add(config.satellite, "showSatellite").name("Show Satellite").onChange((value: boolean) => {
  const viewerStore = useViewerStore()
  if (viewerStore.satellitePrimitive) {
    viewerStore.satellitePrimitive.show = value
  }
})
// 卫星点颜色控制
pointFolder.addColor(config.satellite, "pointColor").name("Point Color").onChange((value: string) => {
  const viewerStore = useViewerStore()
  config.satellite.pointColor = value
  if (viewerStore.viewer && allEntities.satellites.length > 0) {
    viewerStore.renderSatellites(
      allEntities.satellites,
      value,
      config.satellite.pointSize
    )
  }
})
// 卫星点大小控制
pointFolder.add(config.satellite, "pointSize", 1, 50).name("Point Size").onChange((value: number) => {
  const viewerStore = useViewerStore()
  config.satellite.pointSize = value
  if (viewerStore.viewer && Array.isArray(allEntities.satellites) && allEntities.satellites.length > 0) {
    viewerStore.renderSatellites(
      allEntities.satellites,
      config.satellite.pointColor,
      value
    );
  }
})

// 速度箭头渲染
velocityFolder.add(config.satellite, "showVelocity").name("Show Velocity").onChange((value: boolean) => {
  const viewerStore = useViewerStore() as any;
  const viewer = viewerStore.viewer;
  if(!viewer || viewer.isDestroyed()) return;
  config.satellite.showVelocity = value;

  // 遍历Cesium原生Primitive集合，精准找到速度箭头实例
  let velocityPrimitive = null;
  const primitives = viewer.scene.primitives;
  for (let i = 0; i < primitives.length; i++) {
    const primitive = primitives.get(i);
    if (primitive && primitive.isVelocityCollection) {
      velocityPrimitive = primitive;
      break;
    }
  }
  if (velocityPrimitive) {
    // 直接控制显隐，取消勾选立刻消失
    velocityPrimitive.show = value;
  } else if (value) {
    // 未勾选不创建任何实例，彻底无残留
    viewerStore.renderSatelliteVelocities(
      allEntities.satellites,
      config.satellite.velocityColor,
      config.satellite.velocityLength,
      config.satellite.velocitySize,
      config.satellite.showVelocity,
      true
    );
  }
})
// 修改速度箭头颜色控制
velocityFolder.addColor(config.satellite, "velocityColor").onChange((value: string) => {
  config.satellite.velocityColor = value
  const viewerStore = useViewerStore()
  if (viewerStore.viewer && allEntities.satellites.length > 0) {
    velocityCollection.value = viewerStore.renderSatelliteVelocities(
      allEntities.satellites,
      value,
      config.satellite.velocityLength,
      config.satellite.velocitySize
    )
    if (velocityCollection.value) {
      velocityCollection.value.show = config.satellite.showVelocity
    }
  }
})
velocityFolder.add(config.satellite, "velocityLength", 1, 100).onChange((value: number) => {
  config.satellite.velocityLength = value
  const viewerStore = useViewerStore()
  if (viewerStore.viewer && allEntities.satellites.length > 0) {
    velocityCollection.value = viewerStore.renderSatelliteVelocities(
      allEntities.satellites,
      config.satellite.velocityColor,
      value,
      config.satellite.velocitySize
    )
    if (velocityCollection.value) {
      velocityCollection.value.show = config.satellite.showVelocity
    }
  }
})
velocityFolder.add(config.satellite, "velocitySize", 1, 100).onChange((value: number) => {
  config.satellite.velocitySize = value
  const viewerStore = useViewerStore()
  if (viewerStore.viewer && allEntities.satellites.length > 0) {
    velocityCollection.value = viewerStore.renderSatelliteVelocities(
      allEntities.satellites,
      config.satellite.velocityColor,
      config.satellite.velocityLength,
      value
    )
    if (velocityCollection.value) {
      velocityCollection.value.show = config.satellite.showVelocity
    }
  }
})

linkFolder.addColor(config.link, "UELinkColor").onChange((value: string) => {
  ueLinkEntities.forEach((entity) => {
    entity.polyline.material = new Cesium.PolylineDashMaterialProperty({
      color: Cesium.Color.fromCssColorString(value),
      dashLength: 16,
      gapColor: Cesium.Color.TRANSPARENT,
      dashPattern: 255,
    })
  })
})

linkFolder.addColor(config.link, "GroundStationLinkColor").onChange((value: string) => {
  stationLinkEntities.forEach((entity) => {
    entity.polyline.material = new Cesium.PolylineDashMaterialProperty({
      color: Cesium.Color.fromCssColorString(value),
      dashLength: 16,
      gapColor: Cesium.Color.TRANSPARENT,
      dashPattern: 255,
    })
  }) 
})

linkFolder.add(config.link, "show").name("Show Link").onChange((value: boolean) => {
  // 控制UE-卫星连线显隐
  ueLinkEntities.forEach((entity) => {
    entity.show = value;
  });
  // 控制地面站-卫星连线显隐
  stationLinkEntities.forEach((entity) => {
    entity.show = value;
  });
})

onMounted(async () => {
  const {  groundObjects, cellObjects } = await processLtesatCfg()
  const tlePath = `/LTESAT/tle/modified-imt2030-2025.tle`
  const tleString = await fetch(tlePath).then((res) => res.text())
  
  const viewerStore = useViewerStore()
  const links: Satellite2GroundLink[] = []

  watch(() => viewerStore.viewerReady, (newVal: boolean) => {
    if (newVal) {
      const viewer = viewerStore.viewer
      const entities = viewer?.entities
      allEntities.satellites = constellation(tleString)
      
      // Draw cell（保持不变）
      cellObjects.forEach((cell) => {
        const cellEntity = entities?.add({
          name: cell.name,
          position: cell.position,
          ellipse: {
            semiMinorAxis: cell.radius,
            semiMajorAxis: cell.radius,
            height: cell.positionCartographic.height,
            material: Cesium.Color.fromCssColorString(config.cell.fillColor).withAlpha(0.3),
            fill: true,
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString(config.cell.outlineColor),
          },
        })
        cell.entity = cellEntity
        cell.id = cellEntity!.id
      })

      // 只计算位置，不创建 Entity 
      allEntities.satellites.forEach((sat: Satellite) => {
        let currentPosition = sat.position

        const timeDynamicPosition = new Cesium.CallbackPositionProperty((time, result) => {
          const secondsSinceStart = Cesium.JulianDate.secondsDifference(time!, viewer!.clock.startTime)
          const minutesSinceStart = secondsSinceStart / 60
          const pv = satellite.sgp4(sat.satrec, minutesSinceStart)
          const positionEci = pv?.position
          if (positionEci) {
            currentPosition = eciToCartesian3([positionEci])[0]
          }
          return currentPosition
        }, false)

        sat.positionProperty = timeDynamicPosition
      })
      
      //使用 PrimitiveCollection 渲染所有卫星相关图形
      
      // 1. 渲染卫星点
      viewerStore.renderSatellites(
        allEntities.satellites,
        config.satellite.pointColor,
        config.satellite.pointSize
      )
      
      // 2. 渲染轨道线（Primitive 方式）
      viewerStore.renderSatelliteOrbits(
        allEntities.satellites,
        config.satellite.orbitColor,
        config.satellite.orbitSize
      )
      if (viewerStore.orbitPrimitive) {
        viewerStore.orbitPrimitive.show = config.satellite.showOrbit
      }
      
      // 3. 渲染速度箭头（Primitive 方式）
      viewerStore.renderSatelliteVelocities(
        allEntities.satellites,
        config.satellite.velocityColor,
        config.satellite.velocityLength,
        config.satellite.velocitySize
      )
      if (viewerStore.velocityPrimitive) {
        viewerStore.orbitPrimitive.show = config.satellite.showOrbit 
      }
      
      // Draw GEO（保持不变）
      const geoPositions = geoOrbit(0)
      entities?.add({
        name: `GEO_orbit`,
        polyline: {
          positions: geoPositions,
          width: 2,
          material: Cesium.Color.GREEN,
        }
      })

      // 地面站（保持不变）
      for (const gndObj of groundObjects) {
        const gndEntity = entities?.add({
          name: gndObj.name,
          position: gndObj.position,
          point: {
            pixelSize: 20,
            color: Cesium.Color.fromCssColorString((gndObj.type === "station") ? config.groundStation.pointColor : config.ue.pointColor),
          }
        })
        gndObj.entity = gndEntity
        gndObj.id = gndEntity!.id
        if (gndObj.type === "station") {
          allEntities.groundStations.push(gndObj)
        } else {
          allEntities.ues.push(gndObj)
        }
      }

      const handler = new Cesium.ScreenSpaceEventHandler(viewer!.scene.canvas)
      handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        if(!viewer) return;
        const pickedObject = viewer!.scene.pick(movement.position)
        if (Cesium.defined(pickedObject)) {
          //console.log('Picked object:', pickedObject)
          showDetail.value = true
          if (pickedObject.primitive && pickedObject.primitive.satelliteData) {
                  const sat = pickedObject.primitive.satelliteData as Satellite;
                  viewerStore.selectSatelliteForLinkBudget(sat);
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

      const scratch = new Cesium.Cartesian2();
      handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        const pickedObject = viewer!.scene.pick(movement.endPosition)
        console.log('Picked object:', pickedObject)
        if (Cesium.defined(pickedObject)) {
          tooltipVisible.value = true
          tooltipStyle.left = `${movement.endPosition.x + 10}px`
          tooltipStyle.top = `${movement.endPosition.y + 10}px`
          // 兼容 Primitive 和 Entity 两种拾取
          let pickName = "未知对象";
          // 地面站/UE/小区还是Entity
          if (pickedObject.id && pickedObject.id.name) {
            pickName = pickedObject.id.name;
          } 
          // 在viewer.ts里给Primitive挂载了satelliteData
          else if (pickedObject.primitive && pickedObject.primitive.satelliteData) {
            pickName = pickedObject.primitive.satelliteData.name;
          }
          // 处理轨道 Primitive 拾取
          else if (
            pickedObject.primitive && 
            (pickedObject.primitive as any).isOrbitCollection && 
            pickedObject.id 
          ) {
           
            const orbitInstanceId = pickedObject.id as string;
            if (orbitInstanceId.startsWith('orbit_')) {
              const satelliteId = orbitInstanceId.replace('orbit_', '');
              pickName = `${satelliteId}_orbit`; 
            }
          }
          tooltipHtml.value = `<strong>${pickName}</strong>`
        } else {
          tooltipVisible.value = false
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
      dataReady.value = true
    }
  })
})
</script>

<style scoped>
.panel {
  position: relative;
  z-index: 10;
  font-size: small;  
}
</style>