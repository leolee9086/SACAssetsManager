<template>
  <div class="histogram-panel">
    <!-- 直方图通道控制 -->
    <div class="histogram-controls">
      <label v-for="channel in channels" 
             :key="channel.key" 
             class="channel-toggle">
        <input type="checkbox" 
               v-model="channel.visible"
               :style="{ accentColor: channel.color }">
        {{ channel.label }}
      </label>
    </div>
    <!-- 直方图显示 -->
    <div class="histogram-chart">
      <ECharts ref="histogramChart"
               :option="chartOption"
               style="width: 100%; height: 200px;" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref,watch,onUnmounted  } from 'vue';
import ECharts from '../../../components/common/echarts.vue';
import { 创建经典直方图配置 } from '../../../../utils/fromDeps/echarts/presets.js';
import { getHistogramFromSharp } from '../../../../utils/image/histogram.js';
import { 防抖 } from '../../../../../src/toolBox/base/useEcma/forFunctions/forDebounce.js';
const props = defineProps({
  channels: Array,
  sharpObject: Object
});
const emit = defineEmits(['update:channels', 'histogramUpdated']);
const histogram = ref({});

// 更新直方图数据
const updateHistogram = async (sharpObj) => {
  try {
    console.log(sharpObj)
    const result = await getHistogramFromSharp(sharpObj);
    histogram.value = result.histogram;
    emit('histogramUpdated', result);
  } catch (error) {
    console.error('更新直方图失败:', error);
  }
};

// 创建防抖后的更新函数
const debouncedUpdate = 防抖(updateHistogram, 300);

// 监听 sharpObject 的变化
watch(() => props.sharpObject, (newSharpObj) => {
  if (newSharpObj) {
    debouncedUpdate(newSharpObj);
  }
}, { deep: true });

const chartOption = computed(() => 创建经典直方图配置(props.channels, histogram.value));

// 在组件卸载时清理
onUnmounted(() => {
  if (debouncedUpdate.timer) {
    clearTimeout(debouncedUpdate.timer);
  }
});
</script>

<style scoped>
.histogram-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.histogram-controls {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.channel-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.histogram-chart {
  background: #252525;
  border-radius: 4px;
  padding: 8px;
}

input[type="checkbox"] {
  width: 14px;
  height: 14px;
  cursor: pointer;
}
</style>
