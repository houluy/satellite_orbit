import * as Cesium from 'cesium'
import type { GroundObject, CellObject } from '@/model/satellite'


export async function loadConfig(name: string) {
  const url = import.meta.env.BASE_URL + `LTESAT/config/${name}`
  const response = await fetch(url)
  const cfg = await response.json()
  return cfg
}


export async function processLtesatCfg(): Promise<{
  tleFilename: string
  groundObjects: GroundObject[]
  cellObjects: CellObject[]
}> {
  const gNBCfgName = `dump.ENB-gnb-imt2030-ntn.cfg`
  const satCfgName = `dump.SAT-sat-imt2030-leo.cfg`
  const ueCfgName = `dump.UE0-ue-imt2030-ntn.cfg`
  const cfg = await loadConfig(gNBCfgName)
  const satCfg = await loadConfig(satCfgName)
  const ueCfg = await loadConfig(ueCfgName)
  const ntnCfg = cfg.nr_cell_default.ntn
  const satCellCfg = satCfg.cells_list[0]
  const groundObjects: GroundObject[] = []
  const cellObjects: CellObject[] = []
  const groundPositionCart = new Cesium.Cartographic(
    Cesium.Math.toRadians(ntnCfg.ground_position.longitude),
    Cesium.Math.toRadians(ntnCfg.ground_position.latitude),
    0
  )
  const groundPosition = Cesium.Cartographic.toCartesian(groundPositionCart)

  const simUePositionCart = new Cesium.Cartographic(
    Cesium.Math.toRadians(ntnCfg.channel_sim_control.ue_position.longitude),
    Cesium.Math.toRadians(ntnCfg.channel_sim_control.ue_position.latitude),
    0
  )
  const ueCellCfg = ueCfg.cell_groups[0]
  const cellPositionCart = new Cesium.Cartographic(
    Cesium.Math.toRadians(satCellCfg.ground_position.longitude),
    Cesium.Math.toRadians(satCellCfg.ground_position.latitude),
    0
  )
  const cellPosition = Cesium.Cartographic.toCartesian(cellPositionCart)
  const realUePositionCart = new Cesium.Cartographic(
    Cesium.Math.toRadians(ueCellCfg.ground_position.longitude),
    Cesium.Math.toRadians(ueCellCfg.ground_position.latitude),
    0
  )
  const simUePosition = Cesium.Cartographic.toCartesian(simUePositionCart)
  const realUePosition = Cesium.Cartographic.toCartesian(realUePositionCart)

  const groundStation: GroundObject = {
    id: 'GS',
    name: 'Ground Station',
    type: "station",
    position: groundPosition,
    positionCartographic: groundPositionCart,
    commCap: {
      eirp: 50,
      gt: 30,
    }
  }

  const simUe: GroundObject = {
    id: 'SimUE0',
    name: 'Simulated UE',
    type: "ue",
    position: simUePosition,
    positionCartographic: simUePositionCart,
    commCap: {
      eirp: 20,
      gt: 20,
    }
  }

  const realUe: GroundObject = {
    id: 'RealUE0',
    name: 'Real UE',
    type: "ue",
    position: realUePosition,
    positionCartographic: realUePositionCart,
    commCap: {
      eirp: 20,
      gt: 20,
    }
  }

  const cell: CellObject = {
    id: 'Cell0',
    name: 'Cell0',
    type: "cell",
    position: cellPosition,
    positionCartographic: cellPositionCart,
    radius: satCellCfg.radius,
  }

  groundObjects.push(groundStation)
  groundObjects.push(simUe)
  groundObjects.push(realUe)
  cellObjects.push(cell)
  const tleFilename = ntnCfg.tle_filename
  return {
    tleFilename,
    groundObjects,
    cellObjects,
  }
}