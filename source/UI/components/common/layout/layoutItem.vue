<template>
  <div 
    class="cc-layout" 
    :class="[
      {
        'cc-layout--row': props.direction === 'row',
        'cc-layout--column': props.direction === 'column',
        'cc-layout--flex-grow': shouldGrow,
        'cc-layout--full-height': full
      },
      $attrs.class
    ]" 
    :id="$attrs.id"
    :style="computedStyles"
    ref="el"
    v-bind="$attrs"
  >
    <slot></slot>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

defineOptions({
  inheritAttrs: false
});

const props = defineProps({
  direction: {
    type: String,
    default: 'row',
    validator: (value) => ['row', 'column'].includes(value)
  },
  gap: {
    type: [String, Number],
    default: 0
  },
  align: {
    type: String,
    default: undefined
  },
  justify: {
    type: String,
    default: 'flex-start'
  },
  wrap: {
    type: Boolean,
    default: false
  },
  autoGrow: {
    type: Boolean,
    default: undefined
  },
  full: {
    type: Boolean,
    default: false
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

const el = ref(null);

// 计算默认的对齐方式
const minHeight = computed(() => {
  return props.direction === 'row' ? undefined : '100%';
});

// 判断是否应该扩展
const shouldGrow = computed(() => {
  if (typeof props.autoGrow !== 'undefined') {
    return props.autoGrow;
  }
  
  const parent = el.value?.parentElement;
  if (!parent) return false;
  
  const children = Array.from(parent.children);
  return children[children.length - 1] === el.value;
});

// 合并所有样式
const computedStyles = computed(() => ({
  margin: 0,
  padding: 0,
  height: props.full ? '100%' : props.height,
  width: props.width,
  minHeight: minHeight.value,
  flexGrow: shouldGrow.value ? 1 : 0,
  flexBasis: shouldGrow.value ? '0%' : 'auto',
  flexDirection: props.direction === 'row' ? 'row' : 'column',
  alignItems: props.align,
  justifyContent: props.justify,
  flexWrap: props.wrap ? 'wrap' : 'nowrap',
  gap: typeof props.gap === 'number' ? `${props.gap}px` : props.gap
}));
</script>

<style>
.cc-layout {
  display: flex;
  position: relative;
  box-sizing: border-box;
  min-width: 0;
  min-height: 0;
}

.cc-layout--row {
  flex-direction: row;
}

.cc-layout--column {
  flex-direction: column;
}

.cc-layout--flex-grow {
  flex-grow: 1;
  flex-basis: 0%;
}

.cc-layout--full-height {
  height: 100%;
}
</style>
