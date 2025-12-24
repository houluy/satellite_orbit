import * as Cesium from "cesium"

export type TLEData = {
  satelliteName: string;
  inclination: number;
  rightAscension: number;
  eccentricity: number;
  argumentOfPerigee: number;
  meanAnomaly: number;
  meanMotion: number;
}


export function rotateCam(camera: Cesium.Camera, time: number = 100, toggle: boolean = true) {
  if (!toggle) {
    //camera.look(Cesium.Cartesian3.UNIT_Z)
    camera.rotate(Cesium.Cartesian3.UNIT_Z, 0)
  } else {
    let angularSpeed = Cesium.Math.toRadians(360 / time)
    camera.rotate(Cesium.Cartesian3.UNIT_Z, angularSpeed);
  }
}

export function processTLEData(tleData: [string, string, string]): TLEData {
  const satelliteName = tleData[0];
  const tle1 = tleData[1];
  const tle2 = tleData[2];

  const tle1Elements = tle1.split(" ").map(element => element.trim()).filter(element => element?.length > 0);
  const tle2Elements = tle2.split(" ").map(element => element.trim()).filter(element => element?.length > 0);

  const inclination = parseFloat(tle2Elements[2]!);
  const rightAscension = parseFloat(tle2Elements[3]!);
  const eccentricity = parseFloat("0." + tle2Elements[4]!);
  const argumentOfPerigee = parseFloat(tle2Elements[5]!);
  const meanAnomaly = parseFloat(tle2Elements[6]!);
  const meanMotion = parseFloat(tle2Elements[7]!);

  return {
    satelliteName,
    inclination,
    rightAscension,
    eccentricity,
    argumentOfPerigee,
    meanAnomaly,
    meanMotion,
  };
}

export function motionToSemiMajorAxis(meanMotion: number): number {
  // meanMotion is in revolution/day
  const period = (1 / meanMotion) * 24 * 60 * 60; // period in seconds
  const G = 6.67430e-11; // gravitational constant
  const M = 5.965e24; // mass of the Earth
  return Math.pow(((period / (Math.PI * 2)) ** 2) * G * M, 1 / 3)
}

export function sixToPoints(satellite: TLEData, steps: number = 3600): Cesium.Cartesian3[] {
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
  for (let angle = 0; angle <= steps; angle += 360/steps) {
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
  return points
}