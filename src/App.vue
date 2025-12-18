<script setup lang="ts">
(window as any).CESIUM_BASE_URL = '/Cesium'
import * as Cesium from 'cesium'

import { onMounted, ref } from 'vue';
import GUI from "lil-gui"
import { rotateCam, processTLEData, motionToSemiMajorAxis, type TLEData, sixToPoints } from './utils';
import { reqTLE } from './request';
import { TLEString, singleTLE } from './data/tle';

function createSatellite() {
  const satellite = new Cesium.EllipsoidGraphics({
    fill: true,
    material: Cesium.Color.fromCssColorString('#FF0000'),
    
  })
}

const gui = new GUI()
const toggles = {
  rotate: false,
  satelliteModel: false,
  groundStationModel: false,
  TLESatellite: false,
  allSatelliteModel: false,
  running: false,
  connection: false,
}

const eventListener: {
  [key: string]: null | EventListener
} = {
  rotate: null,
}

const entities  = {
  satellite: null,
  groundStation: null,
  orbits: [],
  satellites: [],
  connections: [],
}

const flyToEntity = {
  flyToModel: 'satellite'
}

const flyToEntities = ref<Cesium.Entity[]>([])

const connectionPositionArray: [Cesium.Cartesian3, Cesium.Cartesian3][] = []

const groundStationPosition = Cesium.Cartesian3.fromDegrees(116.358103, 39.961554, 0)

onMounted(async () => {
  const viewer = new Cesium.Viewer('cesiumContainer', {
  })

  //const TLEString = await reqTLE("qianfan")
  const tle = TLEString.split('\n')
  //const tle = singleTLE.split('\n')
  const satelliteData: TLEData[] = []
  const satellitePoints: Cesium.Cartesian3[][] = []
  for (let i = 0; i < tle.length / 3; i++) {
    const six = processTLEData(tle.splice(3*i, 3*i + 3))
    satelliteData.push(six)
    const point = sixToPoints(six)
    satellitePoints.push(point)
    connectionPositionArray.push([point[0]!, groundStationPosition])
  }

  gui.add(toggles, "TLESatellite").onChange((value: boolean) => {
    if (value) {
      satelliteData.forEach((satellite, index) => {
        const points = satellitePoints[index]
        const orbitEntity = viewer.entities.add({
          polyline: {
            positions: points,
            width: 2,
            material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.2,
                color: Cesium.Color.fromCssColorString('#00FFFF')
            }),
            arcType: Cesium.ArcType.NONE
          }
        })
        entities.orbits!.push(orbitEntity)
      })
    } else {
      entities.orbits!.forEach((orbit) => {
        viewer.entities.remove(orbit)
      })
    }
  })

  // Camera Rotation
  gui.add(toggles, "rotate").onChange((value: boolean) => {
    if (value) {
      eventListener.rotate = viewer.scene.preRender.addEventListener(() => rotateCam(viewer.scene.camera, 1000, toggles.rotate))
    } else {
      if (eventListener.rotate) {
        viewer.scene.preRender.removeEventListener(eventListener.rotate)
      }
    }
  })

  // Add Satellite 3D Model
  const modelFolder = gui.addFolder('Models')

  const satelliteEntityCollection = new Cesium.EntityCollection()
  modelFolder.add(toggles, 'satelliteModel').onChange((value: boolean) => {
    if (value) {
      const satelliteGraphics = new Cesium.EllipsoidGraphics({
        fill: true,
        material: new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString('#00FFFF')),
      })
      satelliteEntityCollection.add({
        position: Cesium.Cartesian3.fromDegrees(116.39, 39.9, 2000000),
        ellipsoid: satelliteGraphics
      })
      viewer.entities.add(satelliteEntityCollection)
      //entities.satellite = viewer.entities.add({
      //  position: Cesium.Cartesian3.fromDegrees(116.39, 39.9, 2000000),
      //  model: {
      //    uri: '/Models/simple_satellite_low_poly_free.glb',
      //    minimumPixelSize: 100,
      //    maximumScale: 20
      //  }
      //})
    } else {
      viewer.entities.remove(entities.satellite!)
    }
  })

  modelFolder.add(toggles, 'allSatelliteModel').onChange((value: boolean) => {
    if (value) {
      satellitePoints.forEach((points, index) => {
        const satelliteEntity = viewer.entities.add({
          position: points[0],
          model: {
            uri: '/Models/simple_satellite_low_poly_free.glb',
            minimumPixelSize: 100,
            maximumScale: 200000
          },
          name: `satellite-${index}`
        })
        entities.satellites.push(satelliteEntity)
      })
    } else {
      entities.satellites.forEach((satellite) => {
        viewer.entities.remove(satellite)
      })
    }
  })

  modelFolder.add(toggles, 'groundStationModel').onChange((value: boolean) => {
    if (value) {
      entities.groundStation = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(116.358103, 39.961554, 0),
        model: {
          uri: '/Models/satellite_comms.glb',
          minimumPixelSize: 100,
          maximumScale: 20
        }
      })
    } else {
      viewer.entities.remove(entities.groundStation!)
    }
  })

  modelFolder.add( flyToEntity, "flyToModel", ["satellite", "groundStation"]).onChange((value: string) => {
    if (entities[value]) {
      viewer.flyTo(entities[value]!)
    }
  })

  modelFolder.add( toggles, "running").onChange((value: boolean) => {
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
      entities.satellites.forEach((satelliteEntity: Cesium.Entity, index: number) => {
        satelliteEntity.position = new Cesium.CallbackPositionProperty((time: Cesium.JulianDate | undefined, result: Cesium.Cartesian3 | undefined) => {
          const dt = Cesium.JulianDate.secondsDifference(time, start)
          const point = satellitePoints[index][Math.floor(dt) % satellitePoints[index].length]
          connectionPositionArray[index] = [point!, groundStationPosition]
          return point
        }, !value)
      })
    } else {
      entities.satellites.forEach((satelliteEntity: Cesium.Entity, index: number) => {
        satelliteEntity.position = satellitePoints[index][0]
      })
    }
  })

  modelFolder.add(toggles, 'connection').onChange((value: boolean) => {
    if (value) {
      entities.satellites.forEach((satelliteEntity: Cesium.Entity, index: number) => {
        const connection = viewer.entities.add({
          polyline: {
            positions: new Cesium.CallbackProperty(() => {
              return connectionPositionArray[index]
            }, false),
            width: 10,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.2,
              color: Cesium.Color.fromCssColorString('#FF0000')
            }),
            arcType: Cesium.ArcType.NONE
          }
        })
        entities.connections.push(connection)
      })
    } else {
      entities.connections.forEach((connection) => {
        viewer.entities.remove(connection)
      })
    }
  })
})

</script>

<template>
  <div id="cesiumContainer"></div>
</template>

<style scoped>

</style>
