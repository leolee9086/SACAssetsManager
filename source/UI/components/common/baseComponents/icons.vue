<template>
  <span 
    :class="[
      'cc-icon',
      `cc-icon--${size}`,
      { 'cc-icon--clickable': clickable }
    ]"
    :style="style"
    @click="handleClick"
  >
    <svg
      :width="computedSize"
      :height="computedSize"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path :d="getIconPath" />
    </svg>
  </span>
</template>

<script>
// 将图标路径移到普通的 <script> 块中
export const iconPaths = {
  upload: 'M11 14.9861C11 15.5384 11.4477 15.9861 12 15.9861C12.5523 15.9861 13 15.5384 13 14.9861V7.82831L16.2428 11.0711L17.657 9.65685L12 4L6.34315 9.65685L7.75736 11.0711L11 7.82831V14.9861Z M4 14H6V18H18V14H20V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V14Z',
  download: 'M11 5C11 4.44772 11.4477 4 12 4C12.5523 4 13 4.44772 13 5V12.1578L16.2428 8.91501L17.657 10.3292L12 16L6.34315 10.3292L7.75736 8.91501L11 12.1578V5Z M4 14H6V18H18V14H20V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V14Z',
  close: 'M6.225 4.811a1 1 0 00-1.414 1.414L10.586 12 4.81 17.775a1 1 0 101.414 1.414L12 13.414l5.775 5.775a1 1 0 001.414-1.414L13.414 12l5.775-5.775a1 1 0 00-1.414-1.414L12 10.586 6.225 4.81z',
  // 可以继续添加更多图标...
};
</script>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  // 图标名称
  name: {
    type: String,
    required: true,
    validator: (value) => Object.keys(iconPaths).includes(value)
  },
  // 尺寸预设
  size: {
    type: [String, Number],
    default: 'medium',
    validator: (value) => {
      if (typeof value === 'number') return true;
      return ['small', 'medium', 'large'].includes(value);
    }
  },
  // 颜色
  color: {
    type: String,
    default: ''
  },
  // 是否可点击
  clickable: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['click']);

// 计算尺寸
const sizeMap = {
  small: 16,
  medium: 24,
  large: 32
};

const computedSize = computed(() => {
  if (typeof props.size === 'number') return props.size;
  return sizeMap[props.size];
});

// 计算样式
const style = computed(() => ({
  color: props.color || 'currentColor',
  width: `${computedSize.value}px`,
  height: `${computedSize.value}px`,
}));

// 获取图标路径
const getIconPath = computed(() => {
  return iconPaths[props.name] || '';
});

// 点击处理
const handleClick = (event) => {
  if (props.clickable) {
    emit('click', event);
  }
};
</script>

<style>
.cc-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  vertical-align: middle;
  transition: var(--cc-transition);
}

.cc-icon svg {
  width: 100%;
  height: 100%;
}

/* 尺寸变体 */
.cc-icon--small {
  font-size: var(--cc-size-icon-xs);
}

.cc-icon--medium {
  font-size: var(--cc-size-icon-md);
}

.cc-icon--large {
  font-size: var(--cc-size-icon-lg);
}

/* 可点击状态 */
.cc-icon--clickable {
  cursor: pointer;
}

.cc-icon--clickable:hover {
  opacity: var(--cc-opacity-hover);
}
</style>
