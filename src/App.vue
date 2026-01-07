<template>
  <Viewer />
  <Tooltip :visible="tooltipVisible" :styleObject="tooltipStyle" :html="tooltipHtml" />
  <DrawPanel v-model="showDetail" />
  <DataPanel v-if="dataReady"></DataPanel>
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
import DataPanel from '@/components/panel/DataPanel.vue'
import DrawPanel from './components/panel/DrawPanel.vue'
import { processLtesatCfg } from '@/components/data/processLtesat'

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
    pointSize: 10,
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

const orbitsEntities: Cesium.Entity[] = []
const satelliteEntities: Cesium.Entity[] = []
const velocityEntities: Cesium.Entity[] = []
const ueLinkEntities: Cesium.Entity[] = []
const stationLinkEntities: Cesium.Entity[] = []

const cesiumFolder = gui.addFolder("cesium")
cesiumFolder.add(config.cesium, "depthDetection").onChange((value: boolean) => {
  const viewerStore = useViewerStore()
  const viewer = viewerStore.viewer
  viewer!.scene.globe.depthTestAgainstTerrain = value
})
const satFolder = gui.addFolder("satellite")
const velocityFolder = satFolder.addFolder("velocity")
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

satFolder.add(config.satellite, "pointSize", 1, 50)
satFolder.add(config.satellite, "orbitSize", 1, 50)
satFolder.add(config.satellite, "showOrbit").name("Show Orbit").onChange((value: boolean) => {
  orbitsEntities.forEach((entity) => {
    entity.show = value
  })
})
satFolder.add(config.satellite, "showSatellite").name("Show Satellite").onChange((value: boolean) => {
  satelliteEntities.forEach((entity) => {
    entity.show = value
  })
})
satFolder.addColor(config.satellite, "orbitColor").onChange((value: string) => {
  const viewerStore = useViewerStore()
  const viewer = viewerStore.viewer
  const entities = viewer?.entities
  entities?.values.forEach((entity) => {
    if (entity.name?.endsWith('_orbit') && entity.polyline) {
      entity.polyline.material = Cesium.Color.fromCssColorString(value)
    }
  })
})
satFolder.addColor(config.satellite, "pointColor").onChange((value: string) => {
  const viewerStore = useViewerStore()
  const viewer = viewerStore.viewer
  const entities = viewer?.entities
  entities?.values.forEach((entity) => {
    if (entity.point) {
      entity.point.color = Cesium.Color.fromCssColorString(value)
    }
  })
})
satFolder.add( config.satellite, "running" ).onChange((value: boolean) => {
  const viewerStore = useViewerStore()
  const viewer = viewerStore.viewer
  viewer!.clockViewModel.shouldAnimate = value
})
velocityFolder.addColor(config.satellite, "velocityColor").onChange((value: string) => {
  const viewerStore = useViewerStore()
  const viewer = viewerStore.viewer
  const entities = viewer?.entities
  entities?.values.forEach((entity) => {
    if (entity.name?.endsWith('_velocity') && entity.polyline) {
      entity.polyline.material = new Cesium.PolylineArrowMaterialProperty(Cesium.Color.fromCssColorString(value))
    }
  })
})

velocityFolder.add(config.satellite, "velocityLength", 1, 100)
velocityFolder.add(config.satellite, "velocitySize", 1, 100)
velocityFolder.add(config.satellite, "showVelocity").name("Show Velocity").onChange((value: boolean) => {
  velocityEntities.forEach((entity) => {
    entity.show = value
  })
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
  
})

onMounted(async () => {
  const { tleFilename, groundObjects, cellObjects } = await processLtesatCfg()
  const tlePath = `LTESAT/tle/${tleFilename}`
  const tleString = await fetch(tlePath).then((res) => res.text())
  
  const viewerStore = useViewerStore()
  const links: Satellite2GroundLink[] = []

  watch(() => viewerStore.viewerReady, (newVal: boolean) => {
    if (newVal) {
      const viewer = viewerStore.viewer
      const entities = viewer?.entities
      allEntities.satellites = constellation(tleString)
      // Draw cell
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

      allEntities.satellites.forEach((sat: Satellite) => {
        // Draw Orbit
        orbitsEntities.push(entities?.add({
          name: `${sat.name}_orbit`,
          polyline: {
            positions: sat.orbit.positions,
            width: new Cesium.CallbackProperty(() => {
              return config.satellite.orbitSize
            }, false),
            material: Cesium.Color.fromCssColorString(config.satellite.orbitColor),
          },
          show: config.satellite.showOrbit,
        })!)
        // Draw Satellite Point (time-dynamic)
        let currentPosition = sat.position

        const timeDynamicPosition = new Cesium.CallbackPositionProperty((time, result) => {
          // seconds since viewer clock start
          const secondsSinceStart = Cesium.JulianDate.secondsDifference(time!, viewer!.clock.startTime)
          const minutesSinceStart = secondsSinceStart / 60
          const pv = satellite.sgp4(sat.satrec, minutesSinceStart)
          //elevation = calcElevation(satrec, groundPositionCart, new Date(time.toString()))
          const positionEci = pv?.position
          if (positionEci) {
            currentPosition = eciToCartesian3([positionEci])[0]
          }
          return currentPosition
        }, false)

        const satEntity = entities?.add({
          name: sat.name,
          position: timeDynamicPosition,
          point: {
            pixelSize: new Cesium.CallbackProperty(() => config.satellite.pointSize, false),
            color: Cesium.Color.fromCssColorString(config.satellite.pointColor).withAlpha(1),
          },
          show: config.satellite.showSatellite,
        })!
        sat.entity = satEntity
        sat.id = satEntity!.id

        // Draw Velocity Arrow - compute current position & next position from velocity at given time
        velocityEntities.push(entities?.add({
          name: `${sat.name}_velocity`,
          polyline: {
            positions: new Cesium.CallbackProperty((time, result) => {
              const secondsSinceStart = Cesium.JulianDate.secondsDifference(time!, viewer!.clock.startTime)
              const minutesSinceStart = secondsSinceStart / 60
              const pv = satellite.sgp4(sat.satrec, minutesSinceStart)
              if (pv && pv.position && pv.velocity) {
                const posEci = pv.position
                const velEci = pv.velocity
                const pos = Cesium.Cartesian3.multiplyByScalar(new Cesium.Cartesian3(posEci.x, posEci.y, posEci.z), 1000, new Cesium.Cartesian3())
                const vel = Cesium.Cartesian3.multiplyByScalar(new Cesium.Cartesian3(velEci.x, velEci.y, velEci.z), 1000, new Cesium.Cartesian3())
                const velScaled = Cesium.Cartesian3.multiplyByScalar(vel, config.satellite.velocityLength, new Cesium.Cartesian3())
                const nextPos = Cesium.Cartesian3.add(pos, velScaled, new Cesium.Cartesian3())
                return [pos, nextPos]
              }
              // fallback to initial sample
              return [currentPosition, Cesium.Cartesian3.add(currentPosition!, new Cesium.Cartesian3(0, 0, 0), new Cesium.Cartesian3())]
            }, false),
            width: new Cesium.CallbackProperty(() => config.satellite.velocitySize, false),
            material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.fromCssColorString(config.satellite.velocityColor)),
          },
          show: config.satellite.showVelocity,
        })!)
      })
      // Draw GEO
      const geoPositions = geoOrbit(0)
      entities?.add({
        name: `GEO_orbit`,
        polyline: {
          positions: geoPositions,
          width: 2,
          material: Cesium.Color.GREEN,
        }
      })

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

      allEntities.satellites.forEach((sat: Satellite) => {
        for (const gndObj of groundObjects) {
          const link = new Satellite2GroundLink(sat, gndObj)
          // Draw connection between satellite and ground station
          const linkEntity = entities?.add({
            name: `${sat.name}-${gndObj.name}_link`,
            polyline: {
              positions: new Cesium.CallbackProperty((time, result) => {
                const secondsSinceStart = Cesium.JulianDate.secondsDifference(time!, viewer!.clock.startTime)
                const minutesSinceStart = secondsSinceStart / 60
                const pv = satellite.sgp4(sat!.satrec, minutesSinceStart)
                if (pv && pv.position) {
                  const pos = Cesium.Cartesian3.multiplyByScalar(new Cesium.Cartesian3(pv.position.x, pv.position.y, pv.position.z), 1000, new Cesium.Cartesian3())
                  return [pos, gndObj.position]
                }
                return [sat?.position, gndObj.position]
              }, false),
              width: 2,
              material: new Cesium.PolylineDashMaterialProperty({
                  color: Cesium.Color.fromCssColorString((gndObj.type === 'station')? config.link.GroundStationLinkColor : config.link.UELinkColor),
                  dashLength: 16,
                  gapColor: Cesium.Color.TRANSPARENT,
                  dashPattern: 255,
                }),
              arcType: Cesium.ArcType.NONE
            },
            show: config.link.show,
          })
          if (linkEntity) {
            if (gndObj.type === 'station') {
              stationLinkEntities.push(linkEntity)
            } else {
              ueLinkEntities.push(linkEntity)
            }
          }
        }
      })
      
      //// Draw Ground Station
      //entities?.add({
      //  name: `GroundStation`,
      //  position: groundPosition,
      //  point: {
      //    pixelSize: 20,
      //    color: Cesium.Color.RED,
      //  }
      //})

      //// Draw UE
      //entities?.add({
      //  name: `UE`,
      //  position: UEPosition,
      //  point: {
      //    pixelSize: 20,
      //    color: Cesium.Color.BLUE,
      //  }
      //})

      // Draw Connection

      const handler = new Cesium.ScreenSpaceEventHandler(viewer!.scene.canvas)
      handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const pickedObject = viewer!.scene.pick(movement.position)
        if (Cesium.defined(pickedObject)) {
          console.log('Picked object:', pickedObject)
          showDetail.value = true
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

      const scratch = new Cesium.Cartesian2();
      handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        const pickedObject = viewer!.scene.pick(movement.endPosition)
        //const screenPosition = viewer!.scene.cartesianToCanvasCoordinates(movement.position, scratch)
        //console.log(screenPosition)
        if (Cesium.defined(pickedObject)) {
          console.log('Picked object:', pickedObject)
          tooltipVisible.value = true
          tooltipStyle.left = `${movement.endPosition.x + 10}px`
          tooltipStyle.top = `${movement.endPosition.y + 10}px`
          tooltipHtml.value = `<strong>${pickedObject.id.name}</strong>`
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
  size: small;
}

</style>

