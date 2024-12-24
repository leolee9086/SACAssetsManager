<template>
  <input 
    v-model="localSize" 
    style="box-sizing: border-box;width: 200px;" 
    class="b3-slider fn__block" 
    :max="max" 
    min="32" 
    step="1" 
    type="range"
    @wheel.ctrl.stop.prevent="handleWheel"
  >
</template>

<script setup>
import { ref, watch } from 'vue'
import { 从滚轮事件计算 } from '../../../utils/scroll.js'

const props = defineProps({
  modelValue: {
    type: Number,
    required: true
  },
  max: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const localSize = ref(props.modelValue)

watch(() => props.modelValue, (newVal) => {
  localSize.value = newVal
})

watch(localSize, (newVal) => {
  emit('update:modelValue', parseInt(newVal))
})

const handleWheel = (event) => {
  localSize.value = 从滚轮事件计算(localSize.value, event, props.max, 32)
}
</script>
