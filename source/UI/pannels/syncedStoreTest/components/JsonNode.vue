<template>
  <div class="json-node">
    <div class="json-node-header">
      <span 
        v-if="isObject" 
        class="toggle" 
        :class="{ 'expanded': isExpanded }"
        @click="toggleExpand"
      >
        {{ isExpanded ? '▼' : '►' }}
      </span>
      <span v-else class="toggle-spacer"></span>
      
      <!-- 对象和数组显示摘要 -->
      <span 
        v-if="isObject" 
        class="item-summary"
        :class="[`type-${dataType}`]"
      >
        {{ isArray ? '数组' : '对象' }} [{{ childCount }}]
      </span>
      
      <!-- 原始值直接显示 -->
      <span 
        v-else 
        class="item-value"
        :class="[`type-${dataType}`]"
      >
        <template v-if="dataType === 'string'">"{{ data }}"</template>
        <template v-else-if="dataType === 'null'">null</template>
        <template v-else>{{ data }}</template>
      </span>
      
      <!-- 根节点操作按钮 -->
      <div v-if="isRoot" class="root-actions">
        <button @click="expandAll">展开全部</button>
        <button @click="collapseAll">收起全部</button>
      </div>
    </div>
    
    <!-- 子节点 -->
    <div v-if="isObject && isExpanded" class="json-node-children">
      <!-- 数组子节点 -->
      <div v-if="isArray" v-for="(item, index) in data" :key="index" class="json-node-item">
        <span class="item-key">{{ index }}:</span>
        <json-node
          :data="item"
          :path="getChildPath(index)"
          :level="level + 1"
          :read-only="readOnly"
          @update:value="handleValueEdit"
        />
      </div>
      
      <!-- 对象子节点 -->
      <div v-else v-for="key in Object.keys(data)" :key="key" class="json-node-item">
        <span class="item-key">{{ key }}:</span>
        <json-node
          :data="data[key]"
          :path="getChildPath(key)"
          :level="level + 1"
          :read-only="readOnly"
          @update:value="handleValueEdit"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'

const props = defineProps({
  data: {
    type: [Object, Array, String, Number, Boolean, null],
    required: true
  },
  path: {
    type: String,
    required: true
  },
  level: {
    type: Number,
    default: 0
  },
  readOnly: {
    type: Boolean,
    default: false
  },
  isRoot: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:value', 'expand-all', 'collapse-all'])

// 从父组件注入expandedNodes
const expandedNodes = inject('expandedNodes')

// 是否是对象类型
const isObject = computed(() => {
  return props.data !== null && typeof props.data === 'object'
})

// 是否是数组类型
const isArray = computed(() => {
  return Array.isArray(props.data)
})

// 数据类型
const dataType = computed(() => {
  if (props.data === null) return 'null'
  if (Array.isArray(props.data)) return 'array'
  return typeof props.data
})

// 子项数量
const childCount = computed(() => {
  if (!isObject.value) return 0
  return Object.keys(props.data).length
})

// 是否展开
const isExpanded = computed({
  get: () => expandedNodes.has(props.path),
  set: (value) => {
    if (value) {
      expandedNodes.add(props.path)
    } else {
      expandedNodes.delete(props.path)
    }
  }
})

// 获取子节点路径
const getChildPath = (key) => {
  return `${props.path}.${key}`
}

// 切换展开状态
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

// 展开所有子节点
const expandAll = () => {
  emit('expand-all')
}

// 收起所有子节点
const collapseAll = () => {
  emit('collapse-all')
}

// 处理值编辑
const handleValueEdit = (path, newValue) => {
  emit('update:value', path, newValue)
}
</script>

<style scoped>
/* 样式在JSONTreeViewer.vue中定义 */
</style> 