import * as satellite from "satellite.js";
import * as Cesium from "cesium";


export type Orbit = {
  id: string
  name: string
  epoch: Date
  meanMotion: number
  inclination: number
  raOfAscNode: number
  argOfPericenter: number
  meanAnomaly: number
  eccentricity: number
  semiMajorAxis: number
  bstar: number
  positions: Cesium.Cartesian3[]
  velocities: Cesium.Cartesian3[]
  entity?: Cesium.Entity
}

export type Satellite = {
  id: string
  name: string
  satrec: satellite.SatRec
  orbit: Orbit
  position: Cesium.Cartesian3
  velocity: Cesium.Cartesian3
  entity?: Cesium.Entity
}

export type Satellites = {
  [key: string]: Satellite
}

export type CommunicationCapability = {
  frequency?: number 
  eirp?: number
  antennaGain?: number
  gt?: number
}

export type CommunicationLink = {
  frequency?: number
  bandwidth?: number
  fspl?: number
  receivedPower?: number
  snr?: number
  connected: boolean
}

export type GroundObject = {
  id: string
  name: string
  type: "station" | "ue"
  position: Cesium.Cartesian3
  positionCartographic: Cesium.Cartographic
  commCap: CommunicationCapability
  entity?: Cesium.Entity
}

export type CellObject = {
  id: string
  name: string
  type: "cell"
  position: Cesium.Cartesian3
  positionCartographic: Cesium.Cartographic
  radius: number
  entity?: Cesium.Entity
}

export class Satellite2GroundLink {
  satellite: Satellite
  groundObject: GroundObject
  distance: number
  azimuth: number
  elevation: number
  range: number
  transitionTime: number
  link: CommunicationLink
  entity?: Cesium.Entity

  constructor(satellite: Satellite, groundObject: GroundObject) {
    this.satellite = satellite
    this.groundObject = groundObject
    this.distance = Cesium.Cartesian3.distance(satellite.position, groundObject.position)
    this.azimuth = this.calcAzimuth(satellite, groundObject)
    this.elevation = this.calcElevation(satellite, groundObject)
    this.elevation = Cesium.Math.toDegrees(Cesium.Cartesian3.angleBetween(satellite.position, groundObject.position))
    this.range = Cesium.Cartesian3.distance(satellite.position, groundObject.position)
    this.transitionTime = 0
    this.link = {
      connected: false
    }
  }

  calcAzimuth(satellite: Satellite, groundObject: GroundObject): number {
    return 0
  }

  calcElevation(satellite: Satellite, groundObject: GroundObject): number {
    return 0
  }

  calcFSPL(airLoss: number = 0): number {
  // Air loss includes the total losses of the free space path loss and atmospheric loss
  // @return: FSPL in dB

    return 0
  }

  update(satellite: Satellite) {
    // satellite is the Satellite object with new position
    this.distance = Cesium.Cartesian3.distance(satellite.position, this.groundObject.position)
    this.azimuth = this.calcAzimuth(satellite, this.groundObject)
    this.elevation = this.calcElevation(satellite, this.groundObject)
    this.range = Cesium.Cartesian3.distance(satellite.position, this.groundObject.position)
    this.link.connected = true
  }
}

