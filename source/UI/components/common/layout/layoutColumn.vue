<template>
  <layout-item
    direction="column"
    :gap="gap"
    :align="align"
    :justify="justify"
    :wrap="wrap"
    :auto-grow="autoGrow"
    :fit="fit"
    :full="full"
    :width="width"
    :height="height"
  >
    <slot></slot>
  </layout-item>
</template>

<script setup>
import LayoutItem from './layoutItem.vue';

defineProps({
  // 间距控制
  gap: {
    type: [String, Number],
    default: 0
  },
  
  // 对齐方式
  align: {
    type: String,
    default: 'stretch',
    validator: (value) => ['start', 'end', 'center', 'stretch', 'baseline'].includes(value)
  },
  
  // 主轴对齐
  justify: {
    type: String,
    default: 'flex-start',
    validator: (value) => [
      'flex-start', 
      'flex-end', 
      'center', 
      'space-between', 
      'space-around', 
      'space-evenly'
    ].includes(value)
  },
  
  // 换行控制
  wrap: {
    type: Boolean,
    default: false
  },
  
  // 自动增长
  autoGrow: {
    type: Boolean,
    default: undefined
  },
  
  // 尺寸控制
  fit: {
    type: Boolean,
    default: false  // 是否自适应内容高度
  },
  full: {
    type: Boolean,
    default: true   // 列布局默认占满容器高度
  },
  width: {
    type: [String, Number],
    default: undefined
  },
  height: {
    type: [String, Number],
    default: undefined
  }
});
</script>
  