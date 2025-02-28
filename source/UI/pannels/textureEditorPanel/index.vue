<template>
  <div class="canvas-test-container">
    <h1 class="test-title">无限画布测试</h1>
    
    <div class="canvas-grid">
      <!-- 使用独立组件替代原有的内嵌测试 -->
      <BasicCanvasTest />
      <GridSystemTest />
      <ElementInteractionTest />
      <ExportFunctionTest />
      <LodAndPanTest />
      <PerformanceTest />
      <HexagonGridTest />
      <ElementLodTest />
      <TimeTunnelTest />
    </div>
  </div>
</template>

<script setup>
import BasicCanvasTest from './tests/BasicCanvasTest.vue';
import GridSystemTest from './tests/GridSystemTest.vue';
import ElementInteractionTest from './tests/ElementInteractionTest.vue';
import ExportFunctionTest from './tests/ExportFunctionTest.vue';
import LodAndPanTest from './tests/LodAndPanTest.vue';
import PerformanceTest from './tests/PerformanceTest.vue';
import HexagonGridTest from './tests/HexagonGridTest.vue';
import ElementLodTest from './tests/ElementLodTest.vue';
</script>

<style scoped>
.canvas-test-container {
  padding: 20px;
  font-family: Arial, sans-serif;
}

.test-title {
  text-align: center;
  margin-bottom: 20px;
  color: #333;
}

.canvas-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: minmax(400px, auto);
  gap: 20px;
}
</style>