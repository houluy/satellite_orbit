import * as satellite from 'satellite.js'
import * as Cesium from 'cesium'

export type SatelliteRec = {
    [key: string]: satellite.SatRec
  }

export function constellation(tles: string): SatelliteRec {
  const tleLines = tles.split('\n').filter(line => line.trim().length > 0)
  let index = 0
  
  const satellites: SatelliteRec = {}
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
    satellites[satName] = satellite.twoline2satrec(tle1, tle2)
  }
  return satellites
}


export function orbit(satrec: satellite.SatRec) {
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
  // position is in km, velocity is in km/s, both the ECI coordinate frame.
  

  return {
    positionsEci,
    velocitiesEci
  }
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
