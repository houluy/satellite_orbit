<template>
  <Viewer />
</template>

<script lang="ts" setup>

import Viewer from '@/components/viewer/viewer.vue'
import { useViewerStore } from './store/viewer'
import { GUI } from 'lil-gui'
import * as Cesium from 'cesium'
import * as satellite from 'satellite.js'
import { orbit, constellation, geoOrbit, type SatelliteRec } from '@/components/satellite/orbit'
import { onMounted, watch } from 'vue'
import { TLEString, singleTLE } from './data/tle';

const gui = new GUI()

const config = {
  satellite: {
    pointSize: 20,
    pointColor: "#ECE4B7",
    orbitSize: 1,
    orbitColor: "#EF3054",
    velocityLength: 5,
    velocitySize: 5,
    velocityColor: "#f7ece1",
    running: false,
    showVelocity: {
      toggle: true,
      value: null
    },
  }
}

function drawUE(position: Cesium.Cartesian3, viewer: Cesium.Viewer) {
  const UE = viewer.entities.add({
    position: position,
    model: {
      uri: '/Cesium/models/UE/UE.gltf',
      scale: 10.0,
    }
  })
}

let satellites: SatelliteRec = {}
const satFolder = gui.addFolder("satellite")
const velocityFolder = satFolder.addFolder("velocity")

satFolder.add(config.satellite, "pointSize", 1, 50)
satFolder.add(config.satellite, "orbitSize", 1, 50)
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
satFolder.addColor(config.satellite, "velocityColor").onChange((value: string) => {
  const viewerStore = useViewerStore()
  const viewer = viewerStore.viewer
  const entities = viewer?.entities
  entities?.values.forEach((entity) => {
    if (entity.name?.endsWith('_velocity') && entity.polyline) {
      entity.polyline.material = new Cesium.PolylineArrowMaterialProperty(Cesium.Color.fromCssColorString(value))
    }
  })
})
satFolder.add( config.satellite, "running" ).onChange((value: boolean) => {
  const viewerStore = useViewerStore()
  const viewer = viewerStore.viewer
  viewer!.clockViewModel.shouldAnimate = value
})
velocityFolder.add(config.satellite, "velocityLength", 1, 100)
velocityFolder.add(config.satellite, "velocitySize", 1, 100)
velocityFolder.add(config.satellite.showVelocity, "toggle").onChange((value: boolean) => {
  const viewerStore = useViewerStore()
  const viewer = viewerStore.viewer
  const entities = viewer?.entities
  entities?.values.forEach((entity) => {
    if (entity.name?.endsWith('_velocity') && entity.polyline) {
      entity.polyline.show = value
    }
  })
})

onMounted(async () => {
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
        entities?.add({
          name: `${satName}_orbit`,
          polyline: {
            positions: positionsOfCesium,
            width: new Cesium.CallbackProperty(() => {
              return config.satellite.orbitSize
            }, false),
            material: Cesium.Color.fromCssColorString(config.satellite.orbitColor),
          }
        })
        // Draw Satellite Point
        let currentPosition = positionsOfCesium[0]
        const timeDynamicPosition = new Cesium.CallbackPositionProperty((time) => {
          const currentSecond = Cesium.JulianDate.compare(time!, viewer!.clockViewModel.startTime)
          const positionAndVelocityAtTime = satellite.sgp4(satrec, currentSecond / 60);
          const positionEci = positionAndVelocityAtTime?.position
          if (positionEci) {
            const pos = new Cesium.Cartesian3(positionEci?.x, positionEci?.y, positionEci?.z)
            currentPosition = Cesium.Cartesian3.multiplyByScalar(pos, kmToMeter, new Cesium.Cartesian3())
            return currentPosition
          } else {
            return currentPosition
          }
        }, false)
        entities?.add({
          name: satName,
          position: timeDynamicPosition,
          point: {
            pixelSize: new Cesium.CallbackProperty(() => {
              return config.satellite.pointSize
            }, false),
            color: Cesium.Color.fromCssColorString(config.satellite.pointColor).withAlpha(0.8),
          },
        })

        // Draw Velocity Arrow
        const velocityVec3 = new Cesium.Cartesian3(velocitiesOfCesium[0]?.x, velocitiesOfCesium[0]?.y, velocitiesOfCesium[0]?.z)
        const velocityEciScaled = new Cesium.CallbackProperty(() => {
          return Cesium.Cartesian3.multiplyByScalar(velocityVec3!, config.satellite.velocityLength, new Cesium.Cartesian3())
        }, false)
        const nextPositionEci = new Cesium.CallbackPositionProperty(() => {
          return Cesium.Cartesian3.add(positionsOfCesium[0]!, velocityEciScaled.getValue(), new Cesium.Cartesian3())
        }, false)

        entities?.add({
          name: `${satName}_velocity`,
          polyline: {
            positions: new Cesium.CallbackProperty(() => {
              return [positionsOfCesium[0], nextPositionEci.getValue()]
            }, false),
            width: new Cesium.CallbackProperty(() => {
              return config.satellite.velocitySize
            }, false),
            material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.fromCssColorString(config.satellite.velocityColor)),
          }
        })
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
    }
  })
})

const toggles = {
  rotate: false,
  satelliteModel: false,
  groundStationModel: false,
  TLESatellite: false,
  allSatelliteModel: false,
  running: false,
  connection: false,
}


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


