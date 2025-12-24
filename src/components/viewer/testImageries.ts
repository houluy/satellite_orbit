import { Viewer, WebMapTileServiceImageryProvider} from "cesium"

let wmtsImageryProvider = new WebMapTileServiceImageryProvider({
  url: "https://arcgis.agrs.cn/agrs/rest/services/BeiJingMiYun/MiYunFengJiaYu_XZQ/MapServer/WMTS/tile/1.0.0/BeiJingMiYun_MiYunFengJiaYu_XZQ/default/default028mm/{TileMatrix}/{TileRow}/{TileCol}.png",
  layer: "冯家峪镇界",
  style: "default",
  format: "image/png",
  tileMatrixSetID: "default028mm",
});

let soilImageryProvider = new WebMapTileServiceImageryProvider({
  url: "http://arcgis.agrs.cn/agrs/rest/services/BeiJingMiYun/MiYunFengJiaYu_DLTB/MapServer/WMTS/tile/1.0.0/BeiJingMiYun_MiYunFengJiaYu_DLTB/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png",
  layer: "冯家峪土地分类",
  style: "default",
  format: "image/png",
  tileMatrixSetID: "default028mm",
});

let fjyImageryProvider2020 = new WebMapTileServiceImageryProvider({
  url: "https://arcgis.agrs.cn/agrs/rest/services/BeiJingMiYun/IMG_MiYunFengJiaYu_202010_GF7_JL1/MapServer/WMTS/tile/1.0.0/BeiJingMiYun_IMG_MiYunFengJiaYu_202010_GF7_JL1/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}",
  layer: "冯家峪2020年GF",
  style: "default",
  format: "image/png",
  tileMatrixSetID: "default028mm",
});
let fjyImageryProvider2019 = new WebMapTileServiceImageryProvider({
  url: "https://arcgis.agrs.cn/agrs/rest/services/BeiJingMiYun/IMG_MiYunFengJiaYu_201910_GF2/MapServer/WMTS/tile/1.0.0/BeiJingMiYun_IMG_MiYunFengJiaYu_201910_GF2/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}",
  layer: "冯家峪2019年GF",
  style: "default",
  format: "image/png",
  tileMatrixSetID: "default028mm",
});
let fjyImageryProviderForest = new WebMapTileServiceImageryProvider({
  url: "https://arcgis.agrs.cn/agrs/rest/services/BeiJingMiYun/MiYunFengJiaYu_DLTB_Lin/MapServer/WMTS/tile/1.0.0/BeiJingMiYun_MiYunFengJiaYu_DLTB_Lin/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png",
  layer: "冯家峪土地分类-林地",
  style: "default",
  format: "image/png",
  tileMatrixSetID: "default028mm",
});
let fjyImageryProvider4326 = new WebMapTileServiceImageryProvider({
  url: "https://arcgis.agrs.cn/agrs/rest/services/BeiJingMiYun4326/MiYunFengJiaYu_DLTB_4326/MapServer/WMTS/tile/1.0.0/BeiJingMiYun4326_MiYunFengJiaYu_DLTB_4326/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png",
  layer: "冯家峪土地分类-4326",
  style: "default",
  format: "image/png",
  tileMatrixSetID: "default028mm",
});
let fjyImageryProviderField = new WebMapTileServiceImageryProvider({
  url: "https://arcgis.agrs.cn/agrs/rest/services/BeiJingMiYun/MiYunFengJiaYu_DLTB_Tian/MapServer/WMTS/tile/1.0.0/BeiJingMiYun_MiYunFengJiaYu_DLTB_Tian/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png",
  layer: "冯家峪土地分类-田",
  style: "default",
  format: "image/png",
  tileMatrixSetID: "default028mm",
});
let fjyImageryProviderLake = new WebMapTileServiceImageryProvider({
  url: "https://arcgis.agrs.cn/agrs/rest/services/BeiJingMiYun/MiYunFengJiaYu_DLTB_Hu/MapServer/WMTS/tile/1.0.0/BeiJingMiYun_MiYunFengJiaYu_DLTB_Hu/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png",
  layer: "冯家峪土地分类-湖",
  style: "default",
  format: "image/png",
  tileMatrixSetID: "default028mm",
});
let fjyImageryProviderWater = new WebMapTileServiceImageryProvider({
  url: "https://arcgis.agrs.cn/agrs/rest/services/BeiJingMiYun/MiYunFengJiaYu_DLTB_Shui/MapServer/WMTS/tile/1.0.0/BeiJingMiYun_MiYunFengJiaYu_DLTB_Shui/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png",
  layer: "冯家峪土地分类-水",
  style: "default",
  format: "image/png",
  tileMatrixSetID: "default028mm",
});
let fjyImageryProviderFruit = new WebMapTileServiceImageryProvider({
  url: "https://arcgis.agrs.cn/agrs/rest/services/BeiJingMiYun/MiYunFengJiaYu_DLTB_GuoYuan/MapServer/WMTS/tile/1.0.0/BeiJingMiYun_MiYunFengJiaYu_DLTB_GuoYuan/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png",
  layer: "冯家峪土地分类-果园",
  style: "default",
  format: "image/png",
  tileMatrixSetID: "default028mm",
});
let fjyImageryProviderGrass = new WebMapTileServiceImageryProvider({
  url: "https://arcgis.agrs.cn/agrs/rest/services/BeiJingMiYun/MiYunFengJiaYu_DLTB_Cao/MapServer/WMTS/tile/1.0.0/BeiJingMiYun_MiYunFengJiaYu_DLTB_Cao/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png",
  layer: "冯家峪土地分类-类草",
  style: "default",
  format: "image/png",
  tileMatrixSetID: "default028mm",
});
let fjyImageryProviderUnknow = new WebMapTileServiceImageryProvider({
  url: "http://arcgis.agrs.cn/agrs/rest/services/BeiJingMiYun/MiYunFengJiaYu_DLTB/MapServer/WMTS/tile/1.0.0/BeiJingMiYun_MiYunFengJiaYu_DLTB/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png",
  layer: "冯家峪土地分类",
  style: "default",
  format: "image/png",
  tileMatrixSetID: "default028mm",
});
let fjyImageryProviderGF2020 = new WebMapTileServiceImageryProvider({
  url: "https://arcgis.agrs.cn/agrs/rest/services/BeiJingMiYun/IMG_MiYunFengJiaYu_202110_BJ2/MapServer/WMTS/tile/1.0.0/BeiJingMiYun_IMG_MiYunFengJiaYu_202110_BJ2/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}",
  layer: "冯家峪2020年10月GFJL1",
  style: "default",
  format: "image/png",
  tileMatrixSetID: "default028mm",
});

let allProviders = [
  soilImageryProvider,
  fjyImageryProvider2020,
  fjyImageryProvider2019,
  fjyImageryProviderForest,
  fjyImageryProvider4326,
  fjyImageryProviderField,
  fjyImageryProviderLake,
  fjyImageryProviderWater,
  fjyImageryProviderFruit,
  fjyImageryProviderGrass,
  // fjyImageryProviderUnknow,
  // fjyImageryProviderGF2020,
];

export function loadImageries(viewer: Viewer) {
  for (let i of allProviders) {
    viewer.imageryLayers.addImageryProvider(i);
  }
}

export function removeImageries(viewer: Viewer) {
  imgShow(false,viewer)
}

export function reloadImageries(viewer: Viewer) {
  imgShow(true,viewer)
}

function imgShow(show:boolean,viewer: Viewer){ 
  for (let i=1; i<viewer.imageryLayers.length; i++) {
    if (viewer.imageryLayers.get(i)._imageryProvider._layer == '冯家峪土地分类') {
      for (let key = i; key < i+10 ; key++)
      viewer.imageryLayers.get(key).show = show
    }
  }
}
