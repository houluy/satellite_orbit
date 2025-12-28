import * as satellite from 'satellite.js'

export function orbit() {
  const tle1 = `1 60379U 24140A   25348.91457039  .00000095  00000+0  12833-3 0  9999`
  const tle2 = `2 60379  88.9761 299.0549 0016230 203.7248 156.3156 13.50978418 67648`
  const satrec = satellite.twoline2satrec(tle1, tle2)

  const totalMinutesARound = Math.ceil(2 * Math.PI / satrec.no)
  const paddingBetweenPoints = 1
  const minuteSpan = 2 * Math.PI / (satrec.no * paddingBetweenPoints)

  const positionsEci = []
  const velocitiesEci = []
  console.log('Minute span: ', minuteSpan)

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