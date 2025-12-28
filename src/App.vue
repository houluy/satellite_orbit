<template>
  <Viewer />
</template>

<script lang="ts" setup>

import Viewer from '@/components/viewer/viewer.vue'
import { useViewerStore } from './store/viewer'
import { GUI } from 'lil-gui'
import * as Cesium from 'cesium'
import { orbit } from '@/components/satellite/orbit'
import { onMounted, watch } from 'vue'

const gui = new GUI()

const config = {
  satellite: {
    pointSize: 5,
    velocityLength: 5,
    velocitySize: 5,
    showVelocity: {
      toggle: false,
      value: null
    },
  }
}

const satFolder = gui.addFolder("satellite")
const velocityFolder = satFolder.addFolder("velocity")

satFolder.add(config.satellite, "pointSize", 1, 50)
velocityFolder.add(config.satellite, "velocityLength", 1, 100)
velocityFolder.add(config.satellite, "velocitySize", 1, 100)
velocityFolder.add(config.satellite.showVelocity, "toggle").onChange((value: boolean) => {
  const viewerStore = useViewerStore()
  const viewer = viewerStore.viewer
  const entities = viewer?.entities
  entities?.values.forEach((entity) => {
    if (entity.polyline) {
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
      const { positionsEci, velocitiesEci } = orbit()

      const conversionFactor = 1000  // km to m
      for (let i = 0; i < positionsEci.length; i++) {
        const positionEci = positionsEci[i]
        const velocityEci = velocitiesEci[i]
        const pos = new Cesium.Cartesian3(positionEci?.x, positionEci?.y, positionEci?.z)
        const posOfCesium = Cesium.Cartesian3.multiplyByScalar(pos, conversionFactor, new Cesium.Cartesian3())
        const velocityVec3 = new Cesium.Cartesian3(velocityEci?.x, velocityEci?.y, velocityEci?.z)
        const velocityEciScaled = new Cesium.CallbackProperty(() => {
          return Cesium.Cartesian3.multiplyByScalar(velocityVec3!, conversionFactor * config.satellite.velocityLength, new Cesium.Cartesian3())
        }, false)
        const nextPositionEci = new Cesium.CallbackPositionProperty(() => {
          return Cesium.Cartesian3.add(posOfCesium, velocityEciScaled.getValue(), new Cesium.Cartesian3())
        }, false)

        const point = new Cesium.Entity({
          position: posOfCesium,
          point: {
            pixelSize: new Cesium.CallbackProperty(() => {
              return config.satellite.pointSize
            }, false),
            color: Cesium.Color.YELLOW
          },
        })

        //const arrowCollection = new Cesium.PolylineCollection({
        //  debugShowBoundingVolume: true
        //})
        entities?.add({
          polyline: {
            positions: new Cesium.CallbackProperty(() => {
              return [posOfCesium, nextPositionEci.getValue()]
            }, false),
            width: new Cesium.CallbackProperty(() => {
              return config.satellite.velocitySize
            }, false),
            material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.RED),
          }
        })
      //entities?.add({
      //  polyline: arrowCollection
      //})
        entities?.add(point)
      }

      //primitives?.add(arrowCollection)
            //viewer?.flyTo(arrowCollection)
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

//modelFolder.add( toggles, "running").onChange((value: boolean) => {
//  if (value) {
//    const start = Cesium.JulianDate.now()
//    const duration = 3600
//    const stop = Cesium.JulianDate.addSeconds(start, duration, new Cesium.JulianDate())
//    viewer.clock.startTime = start.clone();
//    viewer.clock.stopTime = stop.clone();
//    viewer.clock.currentTime = start.clone();
//    viewer.clock.multiplier = 1.0;
//    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
//    viewer.clock.shouldAnimate = true;
//    entities.satellites.forEach((satelliteEntity: Cesium.Entity, index: number) => {
//      satelliteEntity.position = new Cesium.CallbackPositionProperty((time: Cesium.JulianDate | undefined, result: Cesium.Cartesian3 | undefined) => {
//        const dt = Cesium.JulianDate.secondsDifference(time, start)
//        const point = satellitePoints[index][Math.floor(dt) % satellitePoints[index].length]
//        connectionPositionArray[index] = [point!, groundStationPosition]
//        return point
//      }, !value)
//    })
//  } else {
//    entities.satellites.forEach((satelliteEntity: Cesium.Entity, index: number) => {
//      satelliteEntity.position = satellitePoints[index][0]
//    })
//  }
//})
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


