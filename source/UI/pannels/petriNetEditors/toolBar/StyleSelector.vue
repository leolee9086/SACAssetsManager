<template>
  <div class="editor-toolbar">
    <div class="toolbar-group">
        <slot></slot>

      <select v-model="localConnectionStyle.geometry" class="toolbar-select" @change="updateStyle">
        <option v-for="(label, value) in GEOMETRY_OPTIONS" :key="value" :value="value">{{ label }}</option>
      </select>
      <select v-model="localConnectionStyle.drawingStyle" class="toolbar-select" @change="updateStyle">
        <option v-for="(label, value) in DRAWING_STYLE_OPTIONS" :key="value" :value="value">{{ label }}</option>
      </select>
    </div>
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
.editor-toolbar {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 6;
  display: flex;
  gap: 12px;
  background: var(--b3-theme-surface);
  padding: 8px;
  border-radius: var(--b3-border-radius);
  box-shadow: var(--b3-dialog-shadow);
  border: 1px solid var(--b3-border-color);
}

.toolbar-group {
  display: flex;
  gap: 8px;
}

/* 统一的下拉框样式 */
.toolbar-select {
  padding: 4px 8px;
  border: 1px solid var(--b3-border-color);
  border-radius: var(--b3-border-radius);
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-surface);
  font-size: 14px;
  cursor: pointer;
  outline: none;
  min-width: 90px;
  height: 28px;
  transition: all 0.2s;
}

.toolbar-select:hover {
  background: var(--b3-list-hover);
  border-color: var(--b3-theme-primary);
}

.toolbar-select:focus {
  border-color: var(--b3-theme-primary);
  box-shadow: 0 0 0 2px var(--b3-theme-primary-light);
}
</style>
