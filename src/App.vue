<script setup lang="ts">
(window as any).CESIUM_BASE_URL = '/Cesium'
import * as Cesium from 'cesium'

import { onMounted, ref } from 'vue';
import GUI from "lil-gui"
import { rotateCam, processTLEData, motionToSemiMajorAxis, type TLEData } from './utils';
import { reqTLE } from './request';
import { TLEString, singleTLE } from './data/tle';

const gui = new GUI()
const toggles = {
  rotate: false,
  satelliteModel: false,
  groundStationModel: false,
  TLESatellite: false
}

const eventListener: {
  [key: string]: null | EventListener
} = {
  rotate: null,
}

const entities: {
  [key: string]: Cesium.Entity | null | Cesium.Entity[]
} = {
  satellite: null,
  groundStation: null,
  orbits: []
}

const flyToEntity = {
  flyToModel: 'satellite'
}

onMounted(async () => {
  const viewer = new Cesium.Viewer('cesiumContainer', {
  })

  //const TLEString = await reqTLE("qianfan")
  const tle = TLEString.split('\n')
  //const tle = singleTLE.split('\n')
  const satelliteData: TLEData[] = []
  for (let i = 0; i < tle.length / 3; i++) {
    satelliteData.push(processTLEData(tle.splice(3*i, 3*i + 3)))
  }

  gui.add(toggles, "TLESatellite").onChange((value: boolean) => {
    if (value) {
      satelliteData.forEach((satellite) => {
        const earthRadius = 6378137
        const a = motionToSemiMajorAxis(satellite.meanMotion)
        const b = a * Math.pow(1 - satellite.eccentricity ** 2, 1 / 2)
        const perigee = a * (1 - satellite.eccentricity)
        const apogee = a * (1 + satellite.eccentricity)
        const r = a * (1 - satellite.eccentricity ** 2) / (1 + satellite.eccentricity * Math.cos(satellite.meanAnomaly))
        const height = r - earthRadius

        const orbitEllipseGraphic = new Cesium.EllipseGraphics({
          semiMajorAxis: a,
          semiMinorAxis: b,
          rotation: Cesium.Math.toRadians(satellite.argumentOfPerigee),
          outline: true,
          outlineColor: Cesium.Color.RED,
          outlineWidth: 200,
          height: height,
          material: Cesium.Color.RED.withAlpha(0)
        })
        const orbitEntity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(0, 0, height),
          ellipse: orbitEllipseGraphic,
          show: true,
        })
        entities.orbits!.push(orbitEntity)
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

  modelFolder.add(toggles, 'satelliteModel').onChange((value: boolean) => {
    if (value) {
      entities.satellite = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(116.39, 39.9, 2000000),
        model: {
          uri: '/Models/simple_satellite_low_poly_free.glb',
          minimumPixelSize: 100,
          maximumScale: 20
        }
      })
    } else {
      viewer.entities.remove(entities.satellite!)
    }
  })

  modelFolder.add(toggles, 'groundStationModel').onChange((value: boolean) => {
    if (value) {
      entities.groundStation = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(116.358103, 39.961554, 0),
        model: {
          uri: '/Models/ground_satellite_station_ii.glb',
          minimumPixelSize: 100,
          maximumScale: 20
        }
      })
    } else {
      viewer.entities.remove(entities.groundStation!)
    }
  })

  modelFolder.add( flyToEntity, "flyToModel", ['satellite', 'groundStation']).onChange((value: string) => {
    if (entities[value]) {
      viewer.flyTo(entities[value]!)
    }
  })

})


</script>

<template>
  <div id="cesiumContainer"></div>
</template>

<style scoped>

</style>
