import * as Cesium from 'cesium'
import type { GroundObject } from '@/model/satellite'


export async function loadConfig(name: string) {
  const url = import.meta.env.BASE_URL + `LTESAT/config/${name}`
  const response = await fetch(url)
  const cfg = await response.json()
  return cfg
}


export async function processLtesatCfg(): Promise<{
  tleFilename: string
  groundObjects: GroundObject[]
}> {
  const gNBName = `dump.ENB-gnb-imt2030-ntn.cfg`
  const cfg = await loadConfig(gNBName)
  const ntnCfg = cfg.nr_cell_default.ntn
  const groundObjects: GroundObject[] = []
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

  const groundStation: GroundObject = {
    id: 'GS001',
    name: 'Ground Station 001',
    type: "station",
    position: groundPosition,
    positionCartographic: groundPositionCart,
    commCap: {
      eirp: 50,
      gt: 30,
    }
  }

  const UE: GroundObject = {
    id: 'UE001',
    name: 'UE 001',
    type: "ue",
    position: UEPosition,
    positionCartographic: UEPositionCart,
    commCap: {
      eirp: 20,
      gt: 20,
    }
  }

  groundObjects.push(groundStation)
  groundObjects.push(UE)
  const tleFilename = ntnCfg.tle_filename
  return {
    tleFilename,
    groundObjects,
  }
}