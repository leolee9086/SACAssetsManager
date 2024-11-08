<template>
  <div class="connection-style-selector">
    <select v-model="localConnectionStyle.geometry" class="style-select" @change="updateStyle">
      <option v-for="(label, value) in GEOMETRY_OPTIONS" 
              :key="value" 
              :value="value">{{ label }}</option>
    </select>
    <select v-model="localConnectionStyle.drawingStyle" class="style-select" @change="updateStyle">
      <option v-for="(label, value) in DRAWING_STYLE_OPTIONS" 
              :key="value" 
              :value="value">{{ label }}</option>
    </select>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { defineProps, defineEmits } from 'vue';
import { STYLES, GEOMETRY } from '../types.js';

const props = defineProps({
  connectionStyle: Object
});

const emit = defineEmits(['update:connectionStyle']);

const localConnectionStyle = ref({ ...props.connectionStyle });

watch(localConnectionStyle, (newStyle) => {
  emit('update:connectionStyle', newStyle);
});

const GEOMETRY_OPTIONS = {
  [GEOMETRY.CIRCUIT]: '电路板式',
  [GEOMETRY.BEZIER]: '贝塞尔曲线',
  [GEOMETRY.ARC]: '弧线'
};

const DRAWING_STYLE_OPTIONS = {
  [STYLES.NORMAL]: '普通',
  [STYLES.HAND_DRAWN]: '手绘'
};

const updateStyle = () => {
  emit('update:connectionStyle', localConnectionStyle.value);
};
</script>

<style scoped>
.connection-style-selector {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1000;
  display: flex;
  gap: 10px;
  background: white;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.style-select {
  padding: 6px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: white;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  outline: none;
}

.style-select:hover {
  border-color: #c0c4cc;
}

.style-select:focus {
  border-color: #409eff;
}
</style>
