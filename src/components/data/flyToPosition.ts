import initViewer from "@/components/viewer/viewer";
import type { Cesium3DTileset, Viewer } from "cesium";

const flyTo3DTileset = () => {
  window.viewer.trackedEntity = null;
  window.viewer.scene.globe.show = true;
  window.viewer.scene.skyAtmosphere.show = true;
  window.viewer.flyTo(window.allTilesets[0].asset as Cesium3DTileset)
}

const flyToTerrain = () => {
  window.viewer.trackedEntity = null;
  window.viewer.scene.globe.show = true;
  window.viewer.scene.skyAtmosphere.show = true;
  const position = {
    Cartesian3: {
      x: 290799.3584088167,
      y: 5654922.6616128925,
      z: 2964895.841345586
    },
    heading: 6.205059658932406,
    pitch: -0.4335396082759968,
    roll: 9.618661422905461e-10
  }
  window.viewer.camera.flyTo({
    destination: new Cesium.Cartesian3(position.Cartesian3.x, position.Cartesian3.y, position.Cartesian3.z),
    orientation: {
      header: Cesium.Math.toRadians(position.heading),
      pitch: Cesium.Math.toRadians(position.pitch),
      roll: Cesium.Math.toRadians(position.roll)
    }
  })
}

const flyToGltfModel = async () => {
    window.viewer.trackedEntity = window.viewer.entities.getById('1');
    window.viewer.scene.globe.show = false;
    window.viewer.scene.skyAtmosphere.show = false;
    window.viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(120.906395,30.908471,40)
  })
}

const flyToChina = async () => {
  window.viewer.trackedEntity = null;
  window.viewer.scene.globe.show = true;
  window.viewer.scene.skyAtmosphere.show = true;
  window.viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(116.34095942864232, 40.00357810463162, 200),
  orientation: new Cesium.HeadingPitchRoll(
    Cesium.Math.toRadians(6.260648781692243),
    Cesium.Math.toRadians(-0.5419592995557636),
    Cesium.Math.toRadians(0.000009140097539273029)),
  })
}

export {
  flyTo3DTileset,
  flyToTerrain,
  flyToGltfModel,
  flyToChina
}