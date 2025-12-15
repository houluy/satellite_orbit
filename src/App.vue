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
        const e = satellite.eccentricity
        const Ω = satellite.rightAscension
        const i = satellite.inclination
        const ω = satellite.argumentOfPerigee
        const perigee = a * (1 - e)
        const apogee = a * (1 + e)
        const points = [];
        const steps = 360;
        for (let angle = 0; angle <= 360; angle += 360/steps) {
            const ν = Cesium.Math.toRadians(angle);
            const r = a * (1 - e * e) / (1 + e * Math.cos(ν));
            const x_orb = r * Math.cos(ν);
            const y_orb = r * Math.sin(ν);
            
            // 转换到ECI坐标系
            const cosΩ = Math.cos(Ω);
            const sinΩ = Math.sin(Ω);
            const cosi = Math.cos(i);
            const sini = Math.sin(i);
            const cosω = Math.cos(ω);
            const sinω = Math.sin(ω);
            
            const R11 = cosΩ * cosω - sinΩ * cosi * sinω;
            const R12 = -cosΩ * sinω - sinΩ * cosi * cosω;
            
            const R21 = sinΩ * cosω + cosΩ * cosi * sinω;
            const R22 = -sinΩ * sinω + cosΩ * cosi * cosω;
            
            const R31 = sini * sinω;
            const R32 = sini * cosω;
            
            const x_eci = R11 * x_orb + R12 * y_orb;
            const y_eci = R21 * x_orb + R22 * y_orb;
            const z_eci = R31 * x_orb + R32 * y_orb;
            
            points.push(new Cesium.Cartesian3(x_eci, y_eci, z_eci));
        }
    
        const v = 2 * Math.atan(Math.sqrt((1 + satellite.eccentricity) / (1 - satellite.eccentricity)) * Math.tan(satellite.meanAnomaly / 2))
        const r = a * (1 - satellite.eccentricity ** 2) / (1 + satellite.eccentricity * Math.cos(v))
        const height = r - earthRadius
        const x_orb = r * Math.cos(v);
        const y_orb = r * Math.sin(v);
        
        // 轨道平面坐标系 -> 地心惯性坐标系 (ECI)
        // 旋转矩阵: R = Rz(-Ω) * Rx(-i) * Rz(-ω)
        const cosΩ = Math.cos(satellite.rightAscension);
        const sinΩ = Math.sin(satellite.rightAscension);
        const cosi = Math.cos(satellite.inclination);
        const sini = Math.sin(satellite.inclination);
        const cosω = Math.cos(satellite.argumentOfPerigee);
        const sinω = Math.sin(satellite.argumentOfPerigee);
        
        // 计算旋转矩阵元素
        const R11 = cosΩ * cosω - sinΩ * cosi * sinω;
        const R12 = -cosΩ * sinω - sinΩ * cosi * cosω;
        const R13 = sinΩ * sini;
        
        const R21 = sinΩ * cosω + cosΩ * cosi * sinω;
        const R22 = -sinΩ * sinω + cosΩ * cosi * cosω;
        const R23 = -cosΩ * sini;
        
        const R31 = sini * sinω;
        const R32 = sini * cosω;
        const R33 = cosi;
        
        // 转换到ECI坐标系
        const x_eci = R11 * x_orb + R12 * y_orb;
        const y_eci = R21 * x_orb + R22 * y_orb;
        const z_eci = R31 * x_orb + R32 * y_orb;
        
        const position = new Cesium.Cartesian3(x_eci, y_eci, z_eci);
    
        const cartographic = Cesium.Cartographic.fromCartesian(position);
        const longitude = Cesium.Math.toDegrees(cartographic.longitude);
        const latitude = Cesium.Math.toDegrees(cartographic.latitude);

        const centerLon = satellite.rightAscension; // 升交点赤经对应经度
        const centerLat = 0; // 赤道上
        const orbitEllipseGraphic = new Cesium.EllipseGraphics({
          semiMajorAxis: a,
          semiMinorAxis: b,
          rotation: Cesium.Math.toRadians(satellite.rightAscension),
          outline: true,
          outlineColor: Cesium.Color.RED,
          outlineWidth: 200,
          height: height,
          material: Cesium.Color.RED.withAlpha(0)
        })
        const orbitEntity = viewer.entities.add({
          //position: Cesium.Cartesian3.fromDegrees(centerLon, centerLat),
          polyline: {
            positions: points,
                        width: 2,
            material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.2,
                color: Cesium.Color.fromCssColorString('#00FFFF')
            }),
            arcType: Cesium.ArcType.NONE
          }
          //ellipse: orbitEllipseGraphic,
        })
        //entities.orbits!.push(orbitEntity)
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
