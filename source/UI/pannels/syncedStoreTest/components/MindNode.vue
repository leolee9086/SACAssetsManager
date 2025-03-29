<template>
  <div 
    class="mind-node" 
    :class="{ 
      'selected': selected, 
      'root': isRoot,
      'leaf': !hasChildren
    }"
    @click.stop="onSelect"
  >
    <div class="node-content">
      <div 
        class="node-text" 
        ref="textRef"
        contenteditable="true"
        :contenteditable="!readOnly"
        @input="onTextInput"
        @blur="onTextBlur"
        @keydown.enter.prevent="onEnterKey"
      >{{ node.text }}</div>
      
      <div class="node-actions" v-if="!readOnly">
        <button 
          class="add-child" 
          title="添加子节点"
          @click.stop="onAddChild">+</button>
      </div>
    </div>
    
    <div class="node-children" v-if="hasChildren">
      <div 
        v-for="(child, index) in node.children" 
        :key="child.id || index"
        class="node-container"
      >
        <mind-node 
          :node="child" 
          :selected="isChildSelected(child)" 
          :read-only="readOnly"
          :zoom="zoom"
          @select="onChildSelect"
          @update="onChildUpdate"
          @add-child="onChildAddChild"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUpdated, nextTick } from 'vue'

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  },
  readOnly: {
    type: Boolean,
    default: false
  },
  zoom: {
    type: Number,
    default: 1
  },
  isRoot: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select', 'update', 'add-child'])

const textRef = ref(null)

// 是否有子节点
const hasChildren = computed(() => {
  return props.node.children && props.node.children.length > 0
})

// 选择当前节点
const onSelect = () => {
  emit('select', props.node)
}

// 子节点被选择
const onChildSelect = (node) => {
  emit('select', node)
}

// 文本输入
const onTextInput = (e) => {
  if (props.readOnly) return
  const newText = e.target.innerText.trim()
  if (newText !== props.node.text) {
    emit('update', props.node, newText)
  }
}

// 文本失去焦点
const onTextBlur = (e) => {
  if (props.readOnly) return
  const newText = e.target.innerText.trim()
  if (newText !== props.node.text) {
    emit('update', props.node, newText)
  }
}

// 按下回车键
const onEnterKey = () => {
  if (props.readOnly) return
  textRef.value?.blur()
}

// 添加子节点
const onAddChild = (e) => {
  e.stopPropagation()
  emit('add-child', props.node)
}

// 子节点更新
const onChildUpdate = (node, newText) => {
  emit('update', node, newText)
}

// 子节点添加新子节点
const onChildAddChild = (node) => {
  emit('add-child', node)
}

// 判断是否是选中的子节点
const isChildSelected = (child) => {
  // 这里仅是简单比较，可以根据需要调整比较逻辑
  return false
}

// 当选中时，自动聚焦文本内容
onMounted(() => {
  if (props.selected && !props.readOnly) {
    nextTick(() => {
      textRef.value?.focus()
    })
  }
})

// 当选中状态变化时，处理焦点
onUpdated(() => {
  if (props.selected && !props.readOnly) {
    nextTick(() => {
      textRef.value?.focus()
    })
  }
})
</script>

<style scoped>
.mind-node {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin: 10px;
  cursor: pointer;
}

.node-content {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  border: 2px solid #ddd;
  border-radius: 100px;
  background-color: #f5f5f5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  max-width: 220px;
  min-width: 100px;
  position: relative;
}

.node-text {
  flex: 1;
  white-space: pre-wrap;
  outline: none;
  text-align: center;
  min-width: 40px;
  min-height: 20px;
  max-height: 100px;
  overflow-y: auto;
  font-size: 14px;
}

.node-text:focus {
  border: none;
  outline: none;
}

.node-actions {
  margin-left: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.node-content:hover .node-actions {
  opacity: 1;
}

.mind-node.selected > .node-content {
  border-color: #1976d2;
  background-color: #e3f2fd;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.3);
}

.mind-node.root > .node-content {
  background-color: #e8f5e9;
  border-color: #4caf50;
  font-weight: bold;
}

.mind-node.root.selected > .node-content {
  background-color: #c8e6c9;
  border-color: #2e7d32;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.3);
}

.mind-node.leaf > .node-content {
  min-width: 80px;
}

.add-child {
  width: 18px;
  height: 18px;
  border: 1px solid #ccc;
  background-color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  padding: 0;
  line-height: 1;
  cursor: pointer;
}

.add-child:hover {
  background-color: #f0f0f0;
}

.node-children {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  padding-top: 20px;
  position: relative;
}

.node-container {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}

@media (max-width: 768px) {
  .node-content {
    max-width: 180px;
    min-width: 80px;
  }
  
  .node-text {
    font-size: 12px;
  }
}
</style> 