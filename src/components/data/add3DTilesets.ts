import type { Cesium3DTileset, Viewer } from "cesium"

type Tileset = {
  assetId: number
  assetName: string
  asset: Cesium3DTileset
}

export async function add3D (viewer: Viewer): Promise<Tileset[]> {
  const assetIdList = [
    2306597,
    2306571,
    2306570,
    1415196,
    354307,
  ]

  const assetName = [
    "PSFS",
    "AGI_HQ",
    "Office",
    "San",
    "Denver"
  ]

  let allTilesets = []

  for (let i = 0;i < assetIdList.length;i++) {
    let assetId = assetIdList[i]
    let currentTileset = viewer.scene.primitives.add(
      await Cesium.Cesium3DTileset.fromIonAssetId(assetId)
    )
    allTilesets.push({
      assetId: assetId,
      assetName: assetName[i],
      asset: currentTileset
    })
  }
  return allTilesets
}