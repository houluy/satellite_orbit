<template>
  <Viewer />
</template>

<script lang="ts" setup>

import Viewer from '@/components/viewer/viewer.vue'
import { useViewerStore } from './store/viewer'
import { GUI } from 'lil-gui'
import * as Cesium from 'cesium'
import { orbit, constellation, geoOrbit } from '@/components/satellite/orbit'
import { onMounted, watch } from 'vue'
import type { EciVec3 } from 'satellite.js'
import { TLEString, singleTLE } from './data/tle';

const gui = new GUI()

const config = {
  satellite: {
    pointSize: 10,
    pointColor: "#ffffff",
    orbitSize: 1,
    orbitColor: "#ffff00",
    velocityLength: 5,
    velocitySize: 5,
    velocityColor: "#ff0000",
    toggle: false,
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
satFolder.add( config.satellite, "toggle").onChange((value: boolean) => {
  const viewerStore = useViewerStore()
  const viewer = viewerStore.viewer
  const entities = viewer?.entities
  if (value) {
    const start = Cesium.JulianDate.now()
    const duration = 3600
    const stop = Cesium.JulianDate.addSeconds(start, duration, new Cesium.JulianDate())
    viewer.clock.startTime = start.clone();
    viewer.clock.stopTime = stop.clone();
    viewer.clock.currentTime = start.clone();
    viewer.clock.multiplier = 1.0;
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
    viewer.clock.shouldAnimate = true;
    
  } else {
    entities?.satellites.forEach((satelliteEntity: Cesium.Entity, index: number) => {
      satelliteEntity.position = satellitePoints[index][0]
    })
  }
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
      //const { positionsEci, velocitiesEci } = orbit()

      //const conversionFactor = 1000  // km to m
      //for (let i = 0; i < positionsEci.length; i++) {
      //  const positionEci = positionsEci[i]
      //  const velocityEci = velocitiesEci[i]
      //  const pos = new Cesium.Cartesian3(positionEci?.x, positionEci?.y, positionEci?.z)
      //  const posOfCesium = Cesium.Cartesian3.multiplyByScalar(pos, conversionFactor, new Cesium.Cartesian3())
      
      //  const point = new Cesium.Entity({
      //    position: posOfCesium,
      //    point: {
      //      pixelSize: new Cesium.CallbackProperty(() => {
      //        return config.satellite.pointSize
      //      }, false),
      //      color: new Cesium.CallbackProperty(() => {
      //        return config.satellite.orbitColor
      //      }, false)
      //    },
      //  })


        //entities.add({
        //  polyline: {
        //    positions: positionsOfCesium,
        //    width: 2,
        //    material: Cesium.Color.YELLOW
        //  }
        //})

        //const arrowCollection = new Cesium.PolylineCollection({
        //  debugShowBoundingVolume: true
        //})
        //entities?.add({
        //  polyline: {
        //    positions: new Cesium.CallbackProperty(() => {
        //      return [posOfCesium, nextPositionEci.getValue()]
        //    }, false),
        //    width: new Cesium.CallbackProperty(() => {
        //      return config.satellite.velocitySize
        //    }, false),
        //    material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.RED),
        //  }
        //})
      //entities?.add({
      //  polyline: arrowCollection
      //})
        //entities?.add(point)
      //}
      const satellites = constellation(TLEString)
      Object.keys(satellites).forEach((satName) => {
        console.log(satName)
        console.log(satellites[satName])
        const { positionsEci, velocitiesEci } = orbit(satellites[satName].tle1, satellites[satName].tle2)
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
        entities?.add({
          name: satName,
          position: positionsOfCesium[0],
          point: {
            pixelSize: new Cesium.CallbackProperty(() => {
              return config.satellite.pointSize
            }, false),
            color: Cesium.Color.fromCssColorString(config.satellite.pointColor),
          },
        })

        // Draw Velocity Arrow
        const velocityVec3 = new Cesium.Cartesian3(velocitiesOfCesium[0]?.x, velocitiesOfCesium[0]?.y, velocitiesOfCesium[0]?.z)
        const velocityEciScaled = new Cesium.CallbackProperty(() => {
          return Cesium.Cartesian3.multiplyByScalar(velocityVec3!, config.satellite.velocityLength, new Cesium.Cartesian3())
        }, false)
        const nextPositionEci = new Cesium.CallbackPositionProperty(() => {
          return Cesium.Cartesian3.add(positionsOfCesium[0], velocityEciScaled.getValue(), new Cesium.Cartesian3())
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


