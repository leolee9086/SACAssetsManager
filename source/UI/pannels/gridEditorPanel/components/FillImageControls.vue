<template>
  <div class="control-section">
    <div class="image-controls">
      <div class="image-upload fn__flex-1">
        <h4>填充图片</h4>
        <div class="fn__flex-1"></div>
        <input type="file" ref="fillFileInput" @change="handleFillImageUpload" accept="image/*"
          style="display: none">
        <button class="upload-btn" @click="triggerFillFileInput">
          选择填充图片
        </button>
      </div>
      <div class="preview-container" v-if="previewUrl">
        <img :src="previewUrl" alt="预览图" class="preview-image">
      </div>
      <div class="transform-controls">
        <div class="control-group">
          <span>缩放:</span>
          <input type="range" :value="modelValue.scale" @input="updateTransform" min="0.1" max="2"
            step="0.1">
          <span>{{ modelValue.scale.toFixed(1) }}</span>
        </div>
        <div class="control-group">
          <span>旋转:</span>
          <input type="range" :value="modelValue.rotation" @input="updateTransform" min="0" max="360"
            step="1">
          <span>{{ modelValue.rotation }}°</span>
        </div>
        <div class="control-group">
          <span>位移:</span>
          <div class="vector-inputs">
            <input type="number" v-model.number="modelValue.translate.x" @input="updateTransform"
              placeholder="X">
            <input type="number" v-model.number="modelValue.translate.y" @input="updateTransform"
              placeholder="Y">
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'imageUpload'])

const fillFileInput = ref(null)

const previewUrl = ref(null)

const triggerFillFileInput = () => {
  fillFileInput.value.click()
}

const handleFillImageUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    previewUrl.value = URL.createObjectURL(file)
    emit('imageUpload', file)
  }
}

const updateTransform = (e) => {
  const target = e.target;
  const newTransform = { ...props.modelValue }
  
  if (target.type === 'range') {
    if (target.parentElement.querySelector('span').textContent.includes('缩放')) {
      newTransform.scale = Number(target.value)
    } else if (target.parentElement.querySelector('span').textContent.includes('旋转')) {
      newTransform.rotation = Number(target.value)
    }
  } else if (target.type === 'number') {
    newTransform.translate = {
      ...newTransform.translate,
      x: Number(props.modelValue.translate.x),
      y: Number(props.modelValue.translate.y)
    }
  }
  
  emit('update:modelValue', newTransform)
}

onBeforeUnmount(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
})
</script>

<style scoped>
.preview-container {
  margin: 10px 0;
  width: 100%;
  height: 150px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style> 