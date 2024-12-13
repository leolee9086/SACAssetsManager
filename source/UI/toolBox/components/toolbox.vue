<template>
  <div class="tool-panel">
    <div class="tool-group">
      <div v-for="(tool, index) in tools" 
           :key="index" 
           class="tool-item"
           :class="{ active: selectedTool === tool.name }"
           @click="selectTool(tool.name)">
        <i :class="tool.icon"></i>
        <span class="tool-name">{{ tool.name }}</span>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue';
const selectedTool = ref('');
const tools = [
  { name: '选择', icon: 'fas fa-mouse-pointer' },
  { name: '直线', icon: 'fas fa-slash' },
  { name: '矩形', icon: 'far fa-square' },
  { name: '圆形', icon: 'far fa-circle' },
  { name: '文字', icon: 'fas fa-font' },
  { name: '测量', icon: 'fas fa-ruler' }
];
const emit = defineEmits(['tool-selected']);
const selectTool = (toolName) => {
  selectedTool.value = toolName;
  emit('tool-selected', toolName);
};
defineOptions({
  name: 'ToolPanel'
});
</script>
<style scoped>
.tool-panel {
  width: 80px;
  background-color: #f0f0f0;
  border-right: 1px solid #ddd;
  height: 100vh;
  padding: 10px 0;
}
.tool-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0;
  cursor: pointer;
  transition: background-color 0.2s;
}
.tool-item:hover {
  background-color: #e0e0e0;
}
.tool-item.active {
  background-color: #d0d0d0;
}
.tool-item i {
  font-size: 20px;
  margin-bottom: 5px;
}
.tool-name {
  font-size: 12px;
}
</style>
