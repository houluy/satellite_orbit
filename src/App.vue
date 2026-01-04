<template>
  <Viewer />
  <Tooltip :visible="tooltipVisible" :styleObject="tooltipStyle" :html="tooltipHtml" />
  <DrawPanel v-model="showDetail" />
</template>

<script lang="ts" setup>

import Viewer from '@/components/viewer/viewer.vue'
import Tooltip from '@/components/panel/Tooltip.vue'
import { useViewerStore } from './store/viewer'
import { GUI } from 'lil-gui'
import * as Cesium from 'cesium'
import * as satellite from 'satellite.js'
import { orbit, constellation, geoOrbit, type SatelliteRec, calcElevation } from '@/components/satellite/orbit'
import { onMounted, watch, ref } from 'vue'
import { TLEString, singleTLE } from './data/tle';
import DataPanel from '@/components/panel/DataPanel.vue'
import DrawPanel from './components/panel/DrawPanel.vue'

const tooltipVisible = ref(false)
const showDetail = ref(false)
const panel = ref<HTMLElement|null>(null)
const tooltipHtml = ref("")
const tooltipStyle = { left: '0px', top: '0px' }

async function loadConfig() {
  const url = import.meta.env.BASE_URL + "LTESAT/config/dump.ENB-gnb-imt2030-ntn.cfg"
  const response = await fetch(url)
  const cfg = await response.json()
  return cfg
}

const gui = new GUI()

const config = {
  cesium: {
    depthDetection: false
  },
  satellite: {
    pointSize: 20,
    pointColor: "#ECE4B7",
    orbitSize: 1,
    orbitColor: "#EF3054",
    velocityLength: 5,
    velocitySize: 5,
    velocityColor: "#f7ece1",
    running: false,
    showOrbit: false,
    showVelocity: false,
    showSatellite: true,
  }
}

const orbitsEntities: Cesium.Entity[] = []
const satelliteEntities: Cesium.Entity[] = []
const velocityEntities: Cesium.Entity[] = []
const connectionEntities: Cesium.Entity[] = []

let satellites: SatelliteRec = {}
const cesiumFolder = gui.addFolder("cesium")
cesiumFolder.add(config.cesium, "depthDetection").onChange((value: boolean) => {
  const viewerStore = useViewerStore()
  const viewer = viewerStore.viewer
  viewer!.scene.globe.depthTestAgainstTerrain = value
})
const satFolder = gui.addFolder("satellite")
const velocityFolder = satFolder.addFolder("velocity")

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

onMounted(async () => {
  const cfg =  await loadConfig()
  console.log(cfg)
  const ntnCfg = cfg.nr_cell_default.ntn
  const groundPositionCart = new Cesium.Cartographic(
    Cesium.Math.toRadians(ntnCfg.ground_position.longitude),
    Cesium.Math.toRadians(ntnCfg.ground_position.latitude),
    0
  )
  const groundPosition = Cesium.Cartographic.toCartesian(groundPositionCart)

  const UEPositionCart = new Cesium.Cartographic(
    Cesium.Math.toRadians(ntnCfg.channel_sim_control.ue_position.longitude),
    Cesium.Math.toRadians(ntnCfg.channel_sim_control.ue_position.latitude),
    0
  )
  const UEPosition = Cesium.Cartographic.toCartesian(UEPositionCart)

  const tleFile = ntnCfg.tle_filename

  const tleFileUrl = import.meta.env.BASE_URL + `LTESAT/tle/${tleFile}`
  const response = await fetch(tleFileUrl)
  const tleText = await response.text()

  const viewerStore = useViewerStore()
  watch(() => viewerStore.viewerReader, (newVal: boolean) => {
    if (newVal) {
      const viewer = viewerStore.viewer
      const entities = viewer?.entities

      satellites = constellation(TLEString)
      Object.keys(satellites).forEach((satName) => {
        const satrec = satellites[satName]
        if (!satrec) return
        const totalMinutesARound = Math.ceil(2 * Math.PI / satrec.no)
        const paddingBetweenPoints = 1
        const minuteSpan = 2 * Math.PI / (satrec.no * paddingBetweenPoints)

        const positionsEci: satellite.EciVec3<number>[] = []
        const velocitiesEci: satellite.EciVec3<number>[] = []

        for (let i = 0; i < totalMinutesARound; i += 1) {
          const currentMinute = i * minuteSpan
          const positionAndVelocity = satellite.sgp4(satrec, i);
          if (positionAndVelocity === null) {
            switch (satrec.error) {
              // all possible values are listed in SatRecError enum:
              case satellite.SatRecError.Decayed:
                console.log('The satellite has decayed')
              // ...
            }
          }
          const positionEci = positionAndVelocity?.position;
          const velocityEci = positionAndVelocity?.velocity;
          if (positionEci && velocityEci) {
            positionsEci.push(positionEci)
            velocitiesEci.push(velocityEci)
          }
        }
        const kmToMeter = 1000
        const positionsOfCesium: Cesium.Cartesian3[] = []
        const velocitiesOfCesium: Cesium.Cartesian3[] = []
        let elevation: number
        positionsEci.forEach((positionEci, index) => {
          const pos = new Cesium.Cartesian3(positionEci?.x, positionEci?.y, positionEci?.z)
          const posOfMeter = Cesium.Cartesian3.multiplyByScalar(pos, kmToMeter, new Cesium.Cartesian3())
          positionsOfCesium.push(posOfMeter)
          const velocityEci = velocitiesEci[index]
          const vel = new Cesium.Cartesian3(velocityEci?.x, velocityEci?.y, velocityEci?.z)
          const velOfMeter = Cesium.Cartesian3.multiplyByScalar(vel, kmToMeter, new Cesium.Cartesian3())
          velocitiesOfCesium.push(velOfMeter)
        })
        // Cyclic orbit
        if (positionsOfCesium[0]) {
          positionsOfCesium.push(positionsOfCesium[0])
        }

        // Draw Orbit
        orbitsEntities.push(entities?.add({
          name: `${satName}_orbit`,
          polyline: {
            positions: positionsOfCesium,
            width: new Cesium.CallbackProperty(() => {
              return config.satellite.orbitSize
            }, false),
            material: Cesium.Color.fromCssColorString(config.satellite.orbitColor),
          },
          show: config.satellite.showOrbit,
        })!)
        // Draw Satellite Point (time-dynamic)
        let currentPosition = positionsOfCesium[0]
        const timeDynamicPosition = new Cesium.CallbackPositionProperty((time, result) => {
          // seconds since viewer clock start
          const secondsSinceStart = Cesium.JulianDate.secondsDifference(time!, viewer!.clock.startTime)
          const minutesSinceStart = secondsSinceStart / 60
          const pv = satellite.sgp4(satrec, minutesSinceStart)
          //elevation = calcElevation(satrec, groundPositionCart, new Date(time.toString()))
          const positionEci = pv?.position
          if (positionEci) {
            const pos = new Cesium.Cartesian3(positionEci.x, positionEci.y, positionEci.z)
            currentPosition = Cesium.Cartesian3.multiplyByScalar(pos, kmToMeter, new Cesium.Cartesian3())
            return currentPosition
          }
          return currentPosition
        }, false)

        satelliteEntities.push(entities?.add({
          name: satName,
          position: timeDynamicPosition,
          point: {
            pixelSize: new Cesium.CallbackProperty(() => config.satellite.pointSize, false),
            color: Cesium.Color.fromCssColorString(config.satellite.pointColor).withAlpha(0.8),
          },
          show: config.satellite.showSatellite,
        })!)

        // Draw Velocity Arrow - compute current position & next position from velocity at given time
        velocityEntities.push(entities?.add({
          name: `${satName}_velocity`,
          polyline: {
            positions: new Cesium.CallbackProperty((time, result) => {
              const secondsSinceStart = Cesium.JulianDate.secondsDifference(time!, viewer!.clock.startTime)
              const minutesSinceStart = secondsSinceStart / 60
              const pv = satellite.sgp4(satrec, minutesSinceStart)
              if (pv && pv.position && pv.velocity) {
                const posEci = pv.position
                const velEci = pv.velocity
                const pos = Cesium.Cartesian3.multiplyByScalar(new Cesium.Cartesian3(posEci.x, posEci.y, posEci.z), kmToMeter, new Cesium.Cartesian3())
                const vel = Cesium.Cartesian3.multiplyByScalar(new Cesium.Cartesian3(velEci.x, velEci.y, velEci.z), kmToMeter, new Cesium.Cartesian3())
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

        // Draw connection between satellite and ground station
        connectionEntities.push(entities?.add({
          name: `${satName}_connection`,
          polyline: {
            positions: new Cesium.CallbackProperty((time, result) => {
              const secondsSinceStart = Cesium.JulianDate.secondsDifference(time!, viewer!.clock.startTime)
              const minutesSinceStart = secondsSinceStart / 60
              const pv = satellite.sgp4(satrec, minutesSinceStart)
              if (pv && pv.position) {
                const pos = Cesium.Cartesian3.multiplyByScalar(new Cesium.Cartesian3(pv.position.x, pv.position.y, pv.position.z), kmToMeter, new Cesium.Cartesian3())
                return [pos, groundPosition]
              }
              return [currentPosition, groundPosition]
            }, false),
            width: 2,
            material: new Cesium.PolylineDashMaterialProperty({
                  color: Cesium.Color.YELLOW,
                  dashLength: 16,
                  gapColor: Cesium.Color.TRANSPARENT,
                  dashPattern: 255,
              }),
            arcType: Cesium.ArcType.NONE
          },
        })!
        )
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

      // Draw Ground Station
      entities?.add({
        name: `GroundStation`,
        position: groundPosition,
        point: {
          pixelSize: 20,
          color: Cesium.Color.RED,
        }
      })

      // Draw UE
      entities?.add({
        name: `UE`,
        position: UEPosition,
        point: {
          pixelSize: 20,
          color: Cesium.Color.BLUE,
        }
      })

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
    }
  })
})

//
//modelFolder.add(toggles, 'connection').onChange((value: boolean) => {
//  if (value) {
//    entities.satellites.forEach((satelliteEntity: Cesium.Entity, index: number) => {
//      const connection = viewer.entities.add({
//        polyline: {
//          positions: new Cesium.CallbackProperty(() => {
//            return connectionPositionArray[index]
//          }, false),
//          width: 10,
//          material: new Cesium.PolylineGlowMaterialProperty({
//            glowPower: 0.2,
//            color: Cesium.Color.fromCssColorString('#FF0000')
//          }),
//          arcType: Cesium.ArcType.NONE
//        }
//      })
//      entities.connections.push(connection)
//    })
//  } else {
//    entities.connections.forEach((connection) => {
//      viewer.entities.remove(connection)
//    })
//  }
//})
</script>

<style scoped>
.panel {
  position: relative;
  z-index: 10;
  size: small;
}

</style>

