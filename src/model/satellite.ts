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
  frequency: number
  link: CommunicationLink
  entity?: Cesium.Entity

  constructor(sat: Satellite, groundObject: GroundObject, frequency?: number) {
    this.satellite = sat
    this.groundObject = groundObject
    const observer = {
      longtitude: this.groundObject.positionCartographic.longitude,
      latitude: this.groundObject.positionCartographic.latitude,
      height: this.groundObject.positionCartographic.height
    }
    const gmst = satellite.gstime(new Date())
    this.distance = Cesium.Cartesian3.distance(sat.position, groundObject.position)
    this.azimuth = this.calcAzimuth(sat, groundObject)
    this.elevation = this.calcElevation(sat, groundObject)
    this.elevation = Cesium.Math.toDegrees(Cesium.Cartesian3.angleBetween(sat.position, groundObject.position))
    this.range = Cesium.Cartesian3.distance(sat.position, groundObject.position)
    this.transitionTime = 0
    if (frequency) {
      this.frequency = frequency
    } else {
      this.frequency = 6e9  // 6 GHz
    }
    this.link = {
      connected: false
    }
  }

  calcAzimuth(satellite: Satellite = this.satellite, groundObject: GroundObject = this.groundObject): number {
    return 0
  }

  calcElevation(satellite: Satellite = this.satellite, groundObject: GroundObject = this.groundObject): number {
    return 0
  }

  calcFSPL(satellite: Satellite = this.satellite, groundObject: GroundObject = this.groundObject): number {
  // Air loss includes the total losses of the free space path loss and atmospheric loss
  // @return: FSPL in dB
    const d = Cesium.Cartesian3.distance(satellite.position, groundObject.position) // meters
    const f = this.frequency  // Hz

    const fspl = 20 * Math.log10(d) + 20 * Math.log10(f) + 20 * Math.log10(4 * Math.PI / 3e8)  // dB
    return fspl
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

