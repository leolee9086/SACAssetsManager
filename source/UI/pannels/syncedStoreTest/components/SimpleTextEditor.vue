<template>
  <div class="simple-editor-container">
    <h3>共享文本 (Textarea)</h3>
    <textarea
      v-model="textValue"
      placeholder="输入一些文本，将自动同步到其他客户端"
      class="editor textarea-editor"
    ></textarea>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  value: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:value'])

// 本地文本值
const textValue = ref(props.value)

// 监听来自父组件的值变化
watch(() => props.value, (newValue) => {
  textValue.value = newValue
})

// 监听本地值变化并通知父组件
watch(textValue, (newValue) => {
  emit('update:value', newValue)
})
</script>

<style scoped>
.simple-editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.textarea-editor {
  width: 100%;
  height: 250px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  flex: 1;
}
</style> 