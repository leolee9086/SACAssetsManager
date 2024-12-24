<template>
  <div class="cc-control-section">
    <h4>网格设置</h4>
    <div class="cc-control-group">
      <Slider
        :model-value="lineWidth"
        @update:model-value="updateLineWidth"
        :min="1"
        :max="5"
        :step="0.5"
        label="网格线宽"
        unit="px"
        :gap="12"
      />
    </div>
    <div class="cc-control-group">
      <span>网格颜色:</span>
      <input type="color" :value="lineColor" @input="updateLineColor">
    </div>
    <div class="cc-control-group">
      <Slider
        :model-value="opacity"
        @update:model-value="updateOpacity"
        :min="0"
        :max="1"
        :step="0.1"
        label="透明度"
      />
    </div>
  </div>
</template>

<script setup>
import Slider from '../layoutEditor/components/Slider.vue'

const props = defineProps({
  lineWidth: {
    type: Number,
    required: true
  },
  lineColor: {
    type: String,
    required: true
  },
  opacity: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['update:lineWidth', 'update:lineColor', 'update:opacity'])

const updateLineWidth = (value) => {
  emit('update:lineWidth', value)
}

const updateLineColor = (e) => {
  emit('update:lineColor', e.target.value)
}

const updateOpacity = (value) => {
  emit('update:opacity', value)
}
</script>

