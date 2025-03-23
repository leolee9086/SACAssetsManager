<template>
  <div class="template-selector-card">
    <div class="card-header">
      <h3>选择模板</h3>
    </div>
    <div class="template-grid">
      <div 
        v-for="(template, index) in templates" 
        :key="index"
        class="template-item"
        :class="{ active: selectedIndex === index }"
        @click="$emit('select', index)"
      >
        <div class="template-preview" v-html="generatePreview(template)"></div>
        <div class="template-name">{{ template.name }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSvgTemplates } from '../composables/useSvgTemplates.js';

const props = defineProps({
  templates: {
    type: Array,
    required: true
  },
  selectedIndex: {
    type: Number,
    default: 0
  }
});

defineEmits(['select']);

const { generatePreview } = useSvgTemplates();
</script>

<style scoped>
.template-selector-card {
  background-color: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  height: auto;
  display: flex;
  flex-direction: column;
}

.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  padding: 16px;
  overflow-y: auto;
  max-height: 200px;
}

.template-item {
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  background-color: #f8f9fa;
  display: flex;
  flex-direction: column;
}

.template-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
  height: 90px;
  background-color: white;
  transition: background-color 0.2s;
}

.template-preview svg {
  max-width: 100%;
  max-height: 100%;
}

.template-name {
  padding: 10px;
  font-size: 14px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background-color: #f8f9fa;
  color: #555;
  font-weight: 500;
}

.template-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-color: #3a86ff;
}

.template-item.active {
  border-color: #3a86ff;
  background-color: #f0f7ff;
}

.template-item.active .template-name {
  background-color: #3a86ff;
  color: white;
}

@media (max-width: 600px) {
  .template-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px;
    padding: 12px;
  }
  
  .template-preview {
    height: 80px;
  }
  
  .template-name {
    padding: 8px;
    font-size: 12px;
  }
}
</style> 