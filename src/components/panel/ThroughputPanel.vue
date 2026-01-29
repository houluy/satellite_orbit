<template>
  <!-- 整体三栏布局，完全匹配上图样式 -->
  <div class="throughput-container">
    <!-- 左栏：时间+下行/上行吞吐量图表 -->
    <div class="col left-col">
      <div class="panel time-panel">
        <p>2025/9/10 07:28:07</p>
        <p>Start Time: 2025/9/10 07:25:17</p>
        <p>End Time: 2025/9/10 07:31:37</p>
        <p class="countdown">Countdown: 00:03:30</p>
      </div>
      <div class="panel chart-panel">
        <h4>Downlink <span class="snr">SNR:16.68dB</span></h4>
        <div class="chart-box downlink-chart">
          <!-- 这里是下行吞吐量图表，先做样式占位，后续可加ECharts -->
          <div class="chart-placeholder">Throughput:16.83(Mbps)</div>
        </div>
      </div>
      <div class="panel chart-panel">
        <h4>Uplink <span class="snr">SNR:13.77dB</span></h4>
        <div class="chart-box uplink-chart">
          <div class="chart-placeholder">Throughput:12.10(Mbps)</div>
        </div>
      </div>
    </div>

    <!-- 中栏：缩小的Cesium+大吞吐量数字 -->
    <div class="col mid-col">
      <!-- 缩小版Cesium：直接复用你的viewer组件，限制高度 -->
      <div class="cesium-mini">
        <viewer />
      </div>
      <!-- 大吞吐量数字展示 -->
      <div class="throughput-big">
        <p>Throughput:</p>
        <h1>16.83</h1>
        <p>Mbps</p>
      </div>
    </div>

    <!-- 右栏：延迟/多普勒图表+卫星图片 -->
    <div class="col right-col">
      <div class="panel chart-panel">
        <h4>Latency</h4>
        <div class="chart-box latency-chart">
          <div class="chart-placeholder">Latency:5.54(ms)</div>
        </div>
      </div>
      <div class="panel chart-panel">
        <h4>Doppler</h4>
        <div class="chart-box doppler-chart">
          <div class="chart-placeholder">Doppler:1153.91(Hz)</div>
        </div>
      </div>
      <div class="panel img-panel">
        <!-- 卫星图片占位，后续替换为实际图片 -->
        <div class="img-placeholder">卫星图片区域</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
// 引入你的Cesium viewer组件
import viewer from "../viewer/viewer.vue"
</script>

<style scoped>
/* 整体布局：三栏等分，深蓝色背景匹配上图 */
.throughput-container {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  width: 100vw;
  height: 100vh;
  background: #003c88;
  color: white;
  padding: 10px;
  box-sizing: border-box;
}
.col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.panel {
  background: rgba(0, 50, 120, 0.8);
  border-radius: 8px;
  padding: 10px;
  box-sizing: border-box;
}

/* 左栏样式 */
.time-panel {
  font-size: 14px;
  line-height: 1.6;
}
.countdown {
  color: #00ffff;
  font-weight: bold;
}
.chart-panel h4 {
  margin: 0 0 8px 0;
  display: flex;
  justify-content: space-between;
}
.snr {
  color: #90ee90;
  font-size: 12px;
}
.chart-box {
  width: 100%;
  height: 180px;
  background: rgba(0, 20, 60, 0.6);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.downlink-chart {
  background: linear-gradient(to right, #006400, #7ccd7c);
}
.uplink-chart {
  background: linear-gradient(to right, #8b0000, #ee9a49);
}
.chart-placeholder {
  color: white;
  font-size: 14px;
}

/* 中栏样式 */
.cesium-mini {
  width: 100%;
  height: 300px; /* 缩小Cesium高度，匹配上图 */
  border-radius: 8px;
  overflow: hidden;
}
.throughput-big {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.throughput-big h1 {
  font-size: 80px;
  color: #ffd700;
  margin: 10px 0;
}
.throughput-big p {
  font-size: 24px;
  margin: 0;
}

/* 右栏样式 */
.img-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.img-placeholder {
  width: 100%;
  height: 100%;
  background: rgba(0, 20, 60, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ccc;
}
</style>