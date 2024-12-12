<template>
  <div class="doc-trend-chart">
    <div class="chart-controls">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        @change="updateChart"
      />
    </div>
    <echarts :option="chartOption" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import echarts from '../common/echarts.vue';
import { 生成文档数量趋势图 } from '@/utils/siyuanData/useKernel/analyzer.js';

const chartOption = ref({});
const dateRange = ref([]);

const updateChart = async () => {
  const [startDate, endDate] = dateRange.value || [];
  chartOption.value = await 生成文档数量趋势图(
    startDate?.toISOString().split('T')[0],
    endDate?.toISOString().split('T')[0]
  );
};

onMounted(async () => {
  await updateChart();
});
</script>

<style scoped>
.doc-trend-chart {
  width: 100%;
  padding: 16px;
  background: var(--b3-theme-background);
  border-radius: 4px;
}

.chart-controls {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
