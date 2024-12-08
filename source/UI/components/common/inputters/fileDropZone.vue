<template>
  <div 
    ref="dropZoneRef"
    :class="[
      'cc-file-drop-zone',
      `cc-file-drop-zone--${size}`,
      {
        'cc-file-drop-zone--dragging': isDragging,
        'cc-file-drop-zone--disabled': disabled,
        [`cc-file-drop-zone--${variant}`]: variant,
      },
      customClass
    ]"
    @dragover.prevent
    @drop.prevent="handleDrop"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @click="handleClick"
  >
    <input
      v-if="allowClick"
      ref="fileInputRef"
      type="file"
      :accept="acceptedTypes.join(',')"
      :multiple="multiple"
      class="cc-file-drop-zone__input"
      @change="handleFileSelect"
    >
    
    <slot :isDragging="isDragging">
      <div class="cc-file-drop-zone__content">
        <slot name="icon">
          <CCIcon 
            :name="isDragging ? 'upload-active' : 'upload'" 
            :size="iconSize[size]"
          />
        </slot>
        
        <div class="cc-file-drop-zone__message">
          <slot name="message">
            {{ message }}
          </slot>
        </div>
        
        <div v-if="showAcceptedTypes" class="cc-file-drop-zone__types">
          <slot name="accepted-types">
            支持的文件类型: {{ acceptedTypes.join(', ') }}
          </slot>
        </div>
      </div>
    </slot>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { CCIcon } from '../baseComponents/icons.vue';

const props = defineProps({
  // 尺寸
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  // 变体样式
  variant: {
    type: String,
    default: 'outlined',
    validator: (value) => ['outlined', 'filled', 'dashed'].includes(value)
  },
  // 是否禁用
  disabled: {
    type: Boolean,
    default: false
  },
  // 是否允许点击上传
  allowClick: {
    type: Boolean,
    default: true
  },
  // 是否显示支持的文件类型
  showAcceptedTypes: {
    type: Boolean,
    default: true
  },
  acceptedTypes: {
    type: Array,
    default: () => []
  },
  multiple: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: '拖放文件到这里或点击上传'
  },
  customClass: {
    type: String,
    default: ''
  },
  maxSize: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits([
  'files-dropped',
  'error',
  'dragenter',
  'dragleave',
  'click'
]);

const isDragging = ref(false);
let dragCounter = 0;

// 处理拖拽进入
const handleDragEnter = (event) => {
  event.preventDefault();
  dragCounter++;
  isDragging.value = true;
  emit('dragenter', event);
};

// 处理拖拽离开
const handleDragLeave = (event) => {
  event.preventDefault();
  dragCounter--;
  if (dragCounter === 0) {
    isDragging.value = false;
    emit('dragleave', event);
  }
};

// 验证文件
const validateFile = (file) => {
  // 验证文件类型
  if (props.acceptedTypes.length > 0) {
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!props.acceptedTypes.includes(fileExtension)) {
      throw new Error(`不支持的文件类型: ${fileExtension}`);
    }
  }

  // 验证文件大小
  if (props.maxSize > 0 && file.size > props.maxSize) {
    throw new Error(`文件大小超过限制: ${(props.maxSize / 1024 / 1024).toFixed(2)}MB`);
  }

  return true;
};

// 新增: 图标尺寸映射
const iconSize = {
  small: 16,
  medium: 24,
  large: 32
};

// 新增: 点击上传处理
const fileInputRef = ref(null);

const handleClick = () => {
  if (props.disabled || !props.allowClick) return;
  fileInputRef.value?.click();
  emit('click');
};

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files);
  processFiles(files);
  // 重置input以支持选择相同文件
  event.target.value = '';
};

// 统一的文件处理逻辑
const processFiles = (files) => {
  if (files.length === 0) {
    emit('error', new Error('没有检测到有效文件'));
    return;
  }

  if (!props.multiple && files.length > 1) {
    emit('error', new Error('只能上传单个文件'));
    return;
  }

  try {
    const validFiles = files.filter(file => {
      try {
        return validateFile(file);
      } catch (err) {
        emit('error', err);
        return false;
      }
    });

    if (validFiles.length > 0) {
      emit('files-dropped', props.multiple ? validFiles : validFiles[0]);
    }
  } catch (err) {
    emit('error', err);
  }
};

// 修改现有的handleDrop
const handleDrop = (event) => {
  isDragging.value = false;
  dragCounter = 0;

  const items = Array.from(event.dataTransfer.items);
  const files = items
    .filter(item => item.kind === 'file')
    .map(item => item.getAsFile());

  processFiles(files);
};

// 新增: 暴露dropZone引用,方便父组件直接操作DOM
const dropZoneRef = ref(null);
defineExpose({ dropZoneRef, fileInputRef });
</script>

<style>
.cc-file-drop-zone {
  position: relative;
  width: 100%;
  transition: var(--cc-transition);
}

/* 尺寸变体 */
.cc-file-drop-zone--small {
  padding: var(--cc-space-sm);
  font-size: var(--cc-size-icon-xs);
}

.cc-file-drop-zone--medium {
  padding: var(--cc-space-lg);
  font-size: var(--cc-size-icon-sm);
}

.cc-file-drop-zone--large {
  padding: var(--cc-space-xl);
  font-size: var(--cc-size-icon-md);
}

/* 样式变体 */
.cc-file-drop-zone--outlined {
  border: var(--cc-border-width) solid var(--cc-border-color);
  border-radius: var(--cc-border-radius);
}

.cc-file-drop-zone--filled {
  background: var(--cc-theme-surface-lighter);
  border-radius: var(--cc-border-radius);
}

.cc-file-drop-zone--dashed {
  border: var(--cc-border-width-thick) dashed var(--cc-border-color);
  border-radius: var(--cc-border-radius);
}

/* 状态 */
.cc-file-drop-zone--dragging {
  border-color: var(--cc-theme-primary);
  background: var(--cc-theme-primary-lightest);
}

.cc-file-drop-zone--disabled {
  opacity: var(--cc-opacity-disabled);
  cursor: not-allowed;
}

.cc-file-drop-zone:not(.cc-file-drop-zone--disabled) {
  cursor: pointer;
}

.cc-file-drop-zone:not(.cc-file-drop-zone--disabled):hover {
  border-color: var(--cc-theme-primary);
  transform: scale(var(--cc-scale-hover));
  transition: transform var(--cc-duration-normal) var(--cc-ease-in-out);
}

/* 隐藏文件输入 */
.cc-file-drop-zone__input {
  display: none;
}

/* 内容布局 */
.cc-file-drop-zone__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--cc-space-md);
}

.cc-file-drop-zone__message {
  color: var(--cc-theme-on-background);
}

.cc-file-drop-zone__types {
  color: var(--cc-theme-on-surface);
  font-size: 0.85em;
}

/* 图标尺寸映射 */
.cc-file-drop-zone .v-icon--small {
  font-size: var(--cc-size-icon-sm);
}

.cc-file-drop-zone .v-icon--medium {
  font-size: var(--cc-size-icon-md);
}

.cc-file-drop-zone .v-icon--large {
  font-size: var(--cc-size-icon-lg);
}
</style>
