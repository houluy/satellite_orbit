import * as satellite from 'satellite.js'
import * as Cesium from 'cesium'

import type { Satellite, Satellites, Orbit, GroundObject } from '@/model/satellite'

export function eciToCartesian3(positionEci: satellite.EciVec3<number>[], factor: number = 1000): Cesium.Cartesian3[] {
  const positions: Cesium.Cartesian3[] = []
  for (const position of positionEci) {
    positions.push(Cesium.Cartesian3.multiplyByScalar(new Cesium.Cartesian3(position.x, position.y, position.z), factor, new Cesium.Cartesian3()))
  }
  return positions
}

export function constellation(tles: string): Satellites{
  const tleLines = tles.split('\n').filter(line => line.trim().length > 0)
  let index = 0
  const satellites: Satellites = {}
  while (index < tleLines.length) {
    let satName = tleLines[index]
    let tle1: string
    let tle2: string
    if (satName?.startsWith("1")) { // No satellite name line in this TLE
      satName = `SAT-${index / 2 + 1}`
      tle1 = tleLines[index]
      tle2 = tleLines[index + 1]
      index = index + 2
    } else {
      tle1 = tleLines[index + 1]
      tle2 = tleLines[index + 2]
      index = index + 3
    }
    const satrec = satellite.twoline2satrec(tle1, tle2)
    console.log(satrec)
    const orbit = calcOrbit(satrec, satName)
    const sat: Satellite = {
      id: satrec.satnum,
      name: satName!,
      satrec,
      orbit,
      position: orbit.positions[0]!,
      velocity: orbit.velocities[0]!,
    }
    satellites[sat.name] = sat
  }
  return satellites
}


export function calcOrbit(satrec: satellite.SatRec, satName?: string): Orbit {
  //const tle1 = `1 60379U 24140A   25348.91457039  .00000095  00000+0  12833-3 0  9999`
  //const tle2 = `2 60379  88.9761 299.0549 0016230 203.7248 156.3156 13.50978418 67648`
  const totalMinutesARound = Math.ceil(2 * Math.PI / satrec.no)
  const paddingBetweenPoints = 1
  const minuteSpan = 2 * Math.PI / (satrec.no * paddingBetweenPoints)

  const positionsEci = []
  const velocitiesEci = []

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
    positionsEci.push(positionEci)
    velocitiesEci.push(velocityEci)
  }
  // Cyclic orbit
  if (positionsEci[0]) {
    positionsEci.push(positionsEci[0])
  }

  const currentOrbit: Orbit = {
    id: satrec.satnum,
    name: satName || satrec.satnum,
    epoch: satellite.invjday(satrec.jdsatepoch),
    meanMotion: satrec.no,
    inclination: satrec.inclo,
    raOfAscNode: satrec.nodeo,
    argOfPericenter: satrec.argpo,
    meanAnomaly: satrec.mo,
    eccentricity: satrec.ecco,
    semiMajorAxis: satrec.a,
    bstar: satrec.bstar,
    positions: eciToCartesian3(positionsEci),
    velocities: eciToCartesian3(velocitiesEci),
  }
  // position is in km, velocity is in km/s, both the ECI coordinate frame.
  

  return currentOrbit
}


export function geoOrbit(longtitude: number): Cesium.Cartesian3[] {
  const geoHeight = 35786 + 6371 // km
  const latitude = 0
  const positions: Cesium.Cartesian3[] = []
  for (let lon = -180; lon <= 180; lon += 1) {
    const currentLon = (longtitude + lon) % 360 - 180
    const position = Cesium.Cartesian3.fromDegrees(currentLon, latitude, geoHeight * 1000)
    positions.push(position)
  }
  return positions
}


export function calcSubSatellitePoint(satRec: satellite.SatRec, when = new Date()): Cesium.Cartographic {
  const pv = satellite.propagate(satRec, when)
  if (pv) {
    const positionEci = pv.position
    const gmst = satellite.gstime(when)
    const geodetic = satellite.eciToGeodetic(positionEci, gmst)
    const latDeg = geodetic.latitude * (180 / Math.PI)
    let lonDeg = geodetic.longitude * (180 / Math.PI)
    if (lonDeg < -180) {
      lonDeg += 360
    } else if (lonDeg > 180) {
      lonDeg -= 360
    }
    return new Cesium.Cartographic(Cesium.Math.toRadians(lonDeg), Cesium.Math.toRadians(latDeg), geodetic.height * 1000)
  } else {
    return new Cesium.Cartographic(0, 0, 0)
  }
}


export function calcElevation(satRec: satellite.SatRec, groundStation: Cesium.Cartographic, when = new Date()): number {
  // Calculate the elevation angle of the satellite from the ground station
  // Formulation
  // α = arccos(sin(φ1)sin(φ2) + cos(φ1)cos(φ2)cos(λ1 - λ2))
  // E = arccos[(h + Re)/d * sin(α)]
  // d = sqrt((h + Re)² + Re² - 2(h + Re)Re * cos(α))
  const subSatellitePoint = calcSubSatellitePoint(satRec, when)
  const halfGeocentricAngle = Math.acos(
    Math.sin(groundStation.latitude) * Math.sin(subSatellitePoint.latitude) +
    Math.cos(groundStation.latitude) * Math.cos(subSatellitePoint.latitude) * Math.cos(groundStation.longitude - subSatellitePoint.longitude)
  )

  const Re = 6371 // km
  const h = subSatellitePoint.height / 1000 // km
  const d = Math.sqrt((h + Re) ** 2 + Re ** 2 - 2 * (h + Re) * Re * Math.cos(halfGeocentricAngle))
  const elevation = Math.acos((h + Re) / d * Math.sin(halfGeocentricAngle))
  return elevation * (180 / Math.PI)
}
  
