<template>
  <div class="tester-container">
    <div class="tester-selector">
      <h1>功能测试面板</h1>
      <div class="selector-controls">
        <button 
          v-for="option in testerOptions" 
          :key="option.value"
          :class="['selector-button', { active: currentTester === option.value }]"
          @click="currentTester = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
    
    <div class="tester-content">
      <component :is="currentComponent"></component>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import EventBusTester from './eventBusTester.vue';
import RouterTester from './routerTester.vue';

const testerOptions = [
  { label: '事件总线测试', value: 'event-bus' },
  { label: '函数路由器测试', value: 'router' }
];

const currentTester = ref('event-bus');

const currentComponent = computed(() => {
  switch (currentTester.value) {
    case 'router':
      return RouterTester;
    case 'event-bus':
    default:
      return EventBusTester;
  }
});
</script>

<style scoped>
.tester-container {
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.tester-selector {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #e0e0e0;
}

h1 {
  color: #0078d7;
  margin-bottom: 20px;
}

.selector-controls {
  display: flex;
  gap: 10px;
}

.selector-button {
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: #f5f5f5;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.selector-button:hover {
  background: #e8e8e8;
}

.selector-button.active {
  background: #0078d7;
  color: white;
  border-color: #0078d7;
}

.tester-content {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}
</style>
