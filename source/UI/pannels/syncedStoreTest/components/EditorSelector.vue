<template>
  <div class="editor-selector">
    <div class="editor-selector-header">
      <h3>{{ title }}</h3>
      <div class="editor-tabs">
        <button 
          v-for="type in availableTypes" 
          :key="type.id"
          class="editor-tab" 
          :class="{ 'active': activeType === type.id }"
          @click="setActiveType(type.id)"
        >
          {{ type.label }}
        </button>
      </div>
    </div>
    
    <div class="editor-container">
      <!-- DOM 富文本编辑器 -->
      <div v-if="activeType === 'dom'" class="editor-wrapper">
        <dom-editor 
          v-model="localContent" 
          :read-only="readOnly"
          @change="handleContentChange"
        />
      </div>
      
      <!-- 代码编辑器 -->
      <div v-else-if="activeType === 'code'" class="editor-wrapper">
        <code-editor 
          v-model="localContent" 
          :read-only="readOnly"
          :language="codeLanguage"
          @change="handleContentChange"
        />
      </div>
      
      <!-- JSON树编辑器 -->
      <div v-else-if="activeType === 'json'" class="editor-wrapper">
        <json-tree-viewer 
          v-model="localContent"
          :read-only="readOnly"
          :expand-level="2"
          :show-source-editor="false"
          @change="handleJsonChange"
        />
      </div>
      
      <!-- 思维导图编辑器 -->
      <div v-else-if="activeType === 'mindmap'" class="editor-wrapper">
        <mind-map-viewer 
          v-model="localContent"
          :read-only="readOnly"
          @change="handleMindMapChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import DOMEditor from './DOMEditor.vue'
import CodeEditor from './CodeEditor.vue'
import JSONTreeViewer from './JSONTreeViewer.vue'
import MindMapViewer from './MindMapViewer.vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  readOnly: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '文档编辑器'
  },
  defaultType: {
    type: String,
    default: 'dom'
  },
  availableTypes: {
    type: Array,
    default: () => [
      { id: 'dom', label: '富文本' },
      { id: 'code', label: '源代码' },
      { id: 'json', label: 'JSON树' },
      { id: 'mindmap', label: '思维导图' }
    ]
  },
  codeLanguage: {
    type: String,
    default: 'javascript'
  }
})

const emit = defineEmits(['update:modelValue', 'type-change', 'change'])

// 状态
const localContent = ref(props.modelValue || '')
const activeType = ref(props.defaultType)

// 当外部内容变化时更新本地内容
watch(() => props.modelValue, (newValue) => {
  localContent.value = newValue
})

// 设置活动编辑器类型
const setActiveType = (type) => {
  activeType.value = type
  emit('type-change', type)
}

// 处理内容变化
const handleContentChange = (value) => {
  localContent.value = value
  emit('update:modelValue', value)
  emit('change', { value, type: activeType.value })
}

// 处理JSON变化
const handleJsonChange = (data) => {
  if (data.valid) {
    emit('change', { 
      value: localContent.value,
      type: activeType.value,
      data: data.data 
    })
  }
}

// 处理思维导图变化
const handleMindMapChange = (data) => {
  emit('change', { 
    value: localContent.value,
    type: activeType.value,
    data: data 
  })
}

// 监听内容变化，向上传递更新
watch(localContent, (newValue) => {
  emit('update:modelValue', newValue)
})

// 初始化类型
watch(
  () => props.defaultType,
  (newType) => {
    activeType.value = newType
  },
  { immediate: true }
)
</script>

<style scoped>
.editor-selector {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  background-color: #fff;
}

.editor-selector-header {
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #ddd;
  background-color: #f5f5f5;
}

.editor-selector-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: normal;
  color: #333;
}

.editor-tabs {
  display: flex;
  margin-left: auto;
  gap: 5px;
}

.editor-tab {
  padding: 5px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.editor-tab:hover {
  background-color: #f0f0f0;
}

.editor-tab.active {
  background-color: #e3f2fd;
  border-color: #2196f3;
  color: #1976d2;
}

.editor-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.editor-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: white;
}
</style> 