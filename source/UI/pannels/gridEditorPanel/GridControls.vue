<template>
  <div class="cc-control-section">
    <h4>网格设置</h4>
    <div class="cc-control-group">
      <span>网格线宽:</span>
      <input type="range" :value="lineWidth" @input="updateLineWidth" min="1" max="5" step="0.5">
      <span>{{ lineWidth }}px</span>
    </div>
    <div class="cc-control-group">
      <span>网格颜色:</span>
      <input type="color" :value="lineColor" @input="updateLineColor">
    </div>
    <div class="cc-control-group">
      <span>透明度:</span>
      <input type="range" :value="opacity" @input="updateOpacity" min="0" max="1" step="0.1">
      <span>{{ opacity }}</span>
    </div>
  </div>
</template>
<script setup>
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
const updateLineWidth = (e) => {
  emit('update:lineWidth', Number(e.target.value))
}
const updateLineColor = (e) => {
  emit('update:lineColor', e.target.value)
}
const updateOpacity = (e) => {
  emit('update:opacity', Number(e.target.value))
}
</script>

