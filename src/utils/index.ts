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