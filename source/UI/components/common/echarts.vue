<template>
  <div ref="chartRef" style="width: 100%; height: 400px;"></div>
</template>
<script src="/stage/protyle/js/echarts/echarts.min.js?v=5.3.2" ></script>
<script src="/stage/protyle/js/echarts/echarts-gl.min.js?v=2.0.9" ></script>
<script setup>
import { ref, onMounted, watch, onBeforeUnmount ,shallowRef} from 'vue';


// Props 定义
const props = defineProps({
  option: {
    type: Object,
    required: true
  }
});

const chartRef = shallowRef(null);
const chartInstance = shallowRef (null);
const updateTimer = ref(null);
const resizeObserver = ref(null);

// 初始化图表
const initChart = () => {
  if (!chartRef.value || !props.option) return;
  chartInstance.value = echarts.init(chartRef.value);
  const validOption = {
    ...props.option,
    series: Array.isArray(props.option.series) ? props.option.series.map(serie => ({
      type: serie.type || 'line',
      ...serie
    })).filter(serie=>serie) : []
  };
  chartInstance.value.setOption(validOption);
};

// 处理图表大小调整
const handleResize = () => {
    const validOption = {
    ...props.option,
    series: Array.isArray(props.option.series) ? props.option.series.map(serie => ({
      type: serie.type || 'line',
      ...serie
    })).filter(serie=>serie) : []
  };
  if (chartInstance.value && chartRef.value) {
    chartInstance.value.resize(validOption);
  }
};

// 防抖更新
const debouncedUpdate = (option) => {
  if (!option || !chartInstance.value) return;
  cancelAnimationFrame(updateTimer.value);
  updateTimer.value = requestAnimationFrame(() => {
    const validOption = {
      ...option,
      series: Array.isArray(option.series) ? option.series.map(serie => ({
        type: serie.type || 'line',
        ...serie
      })) : []
    };
    chartInstance.value.setOption(validOption, true);
  });
};

// 初始化 ResizeObserver
const initResizeObserver = () => {
  resizeObserver.value = new ResizeObserver(() => {
    handleResize();
  });
  resizeObserver.value.observe(chartRef.value);
};

// 生命周期钩子
onMounted(() => {
  initChart();
  initResizeObserver();
});

// 监听 option 变化
watch(
  () => props.option,
  (newOption) => {
    if (chartInstance.value) {
      debouncedUpdate(newOption);
    }
  },
  { deep: true }
);

// 组件销毁前清理
onBeforeUnmount(() => {
  if (chartInstance.value) {
    chartInstance.value.dispose();
  }
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
  }
  cancelAnimationFrame(updateTimer.value);
});
</script>

<style scoped>
/* 样式部分 */
</style>
