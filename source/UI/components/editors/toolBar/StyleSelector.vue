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
    <slot>
        
    </slot>
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
  gap: 8px;
  background: var(--theme-background-color, #2b2b2b);
  padding: 8px;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transition: background 0.3s ease;
}

.style-select {
  padding: 4px 10px;
  border: 1px solid var(--theme-border-color, #3a3a3a);
  border-radius: 2px;
  background-color: var(--theme-select-background-color, #3a3a3a);
  font-size: 13px;
  color: var(--theme-font-color, #e0e0e0);
  cursor: pointer;
  outline: none;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.style-select:hover {
  border-color: var(--theme-hover-border-color, #1e90ff);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.style-select:focus {
  border-color: var(--theme-focus-border-color, #1e90ff);
  box-shadow: 0 0 0 1px rgba(30, 144, 255, 0.2);
}
</style>
