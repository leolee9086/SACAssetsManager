<template>
  <div class="file-upload">
    <label class="file-input-label" :class="{ 'disabled': loading }">
      {{ loading ? '加载中...' : label }}
      <input 
        type="file"
        :accept="accept"
        @change="handleChange"
        class="file-input"
        :disabled="loading"
      >
    </label>
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  label: {
    type: String,
    default: '选择文件'
  },
  accept: {
    type: String,
    default: '*'
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  maxSize: {
    type: Number,
    default: 5 * 1024 * 1024 // 默认5MB
  }
})

const emit = defineEmits(['change', 'error'])

const handleChange = (event) => {
  const file = event.target.files[0]
  if (!file) return

  // 文件大小检查
  if (file.size > props.maxSize) {
    emit('error', `文件大小不能超过${props.maxSize / 1024 / 1024}MB`)
    return
  }

  emit('change', file)
  
  // 清空input值，允许选择相同文件
  event.target.value = ''
}
</script>

<style scoped>
.file-upload {
  display: inline-block;
}

.file-input-label {
  display: inline-block;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;
}

.file-input-label:hover:not(.disabled) {
  background: rgba(0, 0, 0, 0.8);
}

.file-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
}

.file-input-label.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  color: #ff4444;
  background: rgba(0, 0, 0, 0.7);
  padding: 8px 12px;
  border-radius: 4px;
  margin-top: 8px;
  font-size: 12px;
}
</style>
  