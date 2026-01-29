<template>
  <!-- 核心修改1：给最外层容器加 v-if="results"，无数据时整个容器不渲染 -->
  <div class="link-budget-display" v-if="results">
    <h3>链路预算 - {{ results.satelliteName }}</h3>
    <div class="status" :class="{ valid: results.isVisible, invalid: !results.isVisible }">
      {{ results.isVisible ? '✓ 卫星可见' : '✗ 卫星不可见' }}
    </div>
    <div class="results-grid">
      <div class="result-item">
        <span>距离:</span>
        <span>{{ results.distance || '0.00' }} km</span>
      </div>
      <div class="result-item">
        <span>仰角:</span>
        <span>{{ results.elevationAngle || '0.00' }}°</span>
      </div>
      <div class="result-item">
        <span>自由空间损耗:</span>
        <span>{{ results.freeSpacePathLoss || '0.00' }} dB</span>
      </div>
      <div class="result-item">
        <span>大气损耗:</span>
        <span>{{ results.atmosphericLoss || '0.00' }} dB</span>
      </div>
      <div class="result-item highlight">
        <span>总路径损耗:</span>
        <span>{{ results.totalPathLoss || '0.00' }} dB</span>
      </div>
      <div class="result-item highlight">
        <span>EIRP:</span>
        <span>{{ results.eirp || '0.00' }} dBW</span>
      </div>
      <div class="result-item highlight">
        <span>接收功率:</span>
        <span>{{ results.receivedPower || '0.00' }} dBW</span>
      </div>
      <div class="result-item">
        <span>噪声功率:</span>
        <span>{{ results.noisePower || '0.00' }} dBW</span>
      </div>
      <div class="result-item highlight">
        <span>信噪比 (SNR):</span>
        <span>{{ results.snr || '0.00' }} dB</span>
      </div>
      <div class="result-item">
        <span>G/T:</span>
        <span>{{ results.gt || '0.00' }} dB/K</span>
      </div>
    </div>
    <div class="actions">
      <button @click="close" class="btn-close">关闭</button>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useViewerStore } from '@/store/viewer';

const viewerStore = useViewerStore();
const results = computed(() => viewerStore.linkBudget.results);

watch(results, (newVal) => {
  console.log('链路预算更新:', newVal);
}, { deep: true });

function close() {
  viewerStore.linkBudget.results = null;
}
</script>

<style scoped>
.link-budget-display {
  position: fixed;
  bottom: 200px;  /* 把这里的20px改大，数值越大越靠上 */
  left: 20px;
  width: 320px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #444;
  z-index: 9999;
  max-height: 50vh;
  overflow-y: auto;
  font-size: 14px;
}

.link-budget-display h3 {
  margin: 0 0 10px 0;
  color: #4fc3f7;
  font-size: 16px;
  border-bottom: 1px solid #555;
  padding-bottom: 6px;
}

.status {
  padding: 4px;
	border-radius: 4px;
	margin-bottom: 10px;
	font-weight: bold;
	text-align: center;
}

.status.valid {
	background: rgba(76, 175, 80, 0.2);
	color: #4caf50;
	border: 1px solid #4caf50;
}

.status.invalid {
	background: rgba(244, 67, 54, 0.2);
	color: #f44336;
	border: 1px solid #f44336;
}

.results-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 10px;
}

.result-item {
  display: flex;
  flex-direction: column;
  padding: 4px;
  border-bottom: 1px solid #333;
}

.result-item span:first-child {
  color: #aaa;
  font-size: 12px;
}

.result-item.highlight {
  color: #4caf50;
  font-weight: bold;
  background: rgba(76, 175, 80, 0.1);
}

.empty {
  text-align: center;
  padding: 20px 0;
  color: #aaa;
  line-height: 1.5;
}

.actions {
  text-align: center;
}

.btn-close {
  background: #666;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-close:hover {
  background: #777;
}
</style>