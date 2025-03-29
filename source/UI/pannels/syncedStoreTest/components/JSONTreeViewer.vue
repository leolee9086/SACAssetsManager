<template>
  <div class="json-tree-container" :class="{ 'readonly': readOnly }">
    <div class="json-tree-toolbar" v-if="!readOnly">
      <button @click="formatJSON" title="格式化">
        <span>格式化</span>
      </button>
      <button @click="minifyJSON" title="压缩">
        <span>压缩</span>
      </button>
      <button @click="parseFromSource" title="从编辑器更新">
        <span>解析</span>
      </button>
    </div>
    
    <div class="json-tree-viewer" ref="treeContainerRef">
      <div class="json-tree-root">
        <json-node 
          v-if="jsonData !== undefined" 
          :data="jsonData" 
          :path="'root'" 
          :level="0" 
          :read-only="readOnly"
          :is-root="true"
          @update:value="handleNodeUpdate"
          @expand-all="expandAll"
          @collapse-all="collapseAll"
        />
        <div v-else class="json-error">
          {{ error || '无有效JSON数据' }}
        </div>
      </div>
    </div>
    
    <!-- 源码编辑器 (隐藏) -->
    <div class="source-editor" v-if="showSourceEditor">
      <textarea 
        ref="sourceEditorRef"
        v-model="jsonSource"
        @input="handleSourceInput"
        :readonly="readOnly"
        placeholder="在此输入JSON数据..."
      ></textarea>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, provide } from 'vue'
import JsonNode from './JsonNode.vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  readOnly: {
    type: Boolean,
    default: false
  },
  expandLevel: {
    type: Number,
    default: 1 // 默认展开一层
  },
  showSourceEditor: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'error', 'change'])

// 引用
const treeContainerRef = ref(null)
const sourceEditorRef = ref(null)

// 状态
const jsonData = ref(undefined)
const jsonSource = ref('')
const error = ref('')
const expandedNodes = reactive(new Set())

// JSON源码变更处理
const handleSourceInput = () => {
  parseJSON()
}

// 解析JSON
const parseJSON = () => {
  const source = jsonSource.value.trim()
  
  if (!source) {
    jsonData.value = undefined
    error.value = ''
    return
  }
  
  try {
    jsonData.value = JSON.parse(source)
    error.value = ''
    emit('change', { valid: true, data: jsonData.value })
  } catch (err) {
    error.value = `JSON解析错误: ${err.message}`
    emit('error', error.value)
    emit('change', { valid: false, error: error.value })
  }
}

// 从编辑器更新树
const parseFromSource = () => {
  parseJSON()
}

// 从树更新源码
const updateSource = () => {
  try {
    jsonSource.value = JSON.stringify(jsonData.value, null, 2)
    emit('update:modelValue', jsonSource.value)
  } catch (err) {
    console.error('更新源代码失败:', err)
  }
}

// 处理节点更新
const handleNodeUpdate = (path, newValue) => {
  // 解析路径并更新JSON数据
  const pathParts = path.split('.')
  
  if (pathParts[0] === 'root') {
    pathParts.shift() // 移除'root'
  }
  
  if (pathParts.length === 0) {
    // 根节点更新
    jsonData.value = newValue
  } else {
    // 嵌套节点更新
    let current = jsonData.value
    const lastPart = pathParts.pop()
    
    for (const part of pathParts) {
      if (current[part] === undefined) {
        current[part] = {}
      }
      current = current[part]
    }
    
    // 更新值
    current[lastPart] = newValue
  }
  
  // 更新源码
  updateSource()
}

// 格式化JSON
const formatJSON = () => {
  if (!jsonData.value) return
  
  try {
    jsonSource.value = JSON.stringify(jsonData.value, null, 2)
    emit('update:modelValue', jsonSource.value)
  } catch (err) {
    console.error('格式化JSON失败:', err)
  }
}

// 压缩JSON
const minifyJSON = () => {
  if (!jsonData.value) return
  
  try {
    jsonSource.value = JSON.stringify(jsonData.value)
    emit('update:modelValue', jsonSource.value)
  } catch (err) {
    console.error('压缩JSON失败:', err)
  }
}

// 展开所有节点
const expandAll = () => {
  // 递归遍历JSON结构并记录所有路径
  const traverseAndCollect = (obj, path = 'root') => {
    if (obj === null || typeof obj !== 'object') return
    
    expandedNodes.add(path)
    
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        if (item !== null && typeof item === 'object') {
          traverseAndCollect(item, `${path}.${index}`)
        }
      })
    } else {
      Object.keys(obj).forEach(key => {
        if (obj[key] !== null && typeof obj[key] === 'object') {
          traverseAndCollect(obj[key], `${path}.${key}`)
        }
      })
    }
  }
  
  traverseAndCollect(jsonData.value)
}

// 收起所有节点
const collapseAll = () => {
  expandedNodes.clear()
}

// 自动展开节点到指定层级
const expandToLevel = (level = 1) => {
  collapseAll()
  
  if (level <= 0) return
  
  const traverseAndExpand = (obj, path = 'root', currentLevel = 0) => {
    if (obj === null || typeof obj !== 'object') return
    
    if (currentLevel < level) {
      expandedNodes.add(path)
    }
    
    if (currentLevel >= level) return
    
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        if (item !== null && typeof item === 'object') {
          traverseAndExpand(item, `${path}.${index}`, currentLevel + 1)
        }
      })
    } else {
      Object.keys(obj).forEach(key => {
        if (obj[key] !== null && typeof obj[key] === 'object') {
          traverseAndExpand(obj[key], `${path}.${key}`, currentLevel + 1)
        }
      })
    }
  }
  
  traverseAndExpand(jsonData.value)
}

// 监听输入变化
watch(() => props.modelValue, (newValue) => {
  jsonSource.value = newValue
  parseJSON()
}, { immediate: true })

// 监听展开级别变化
watch(() => props.expandLevel, (newLevel) => {
  expandToLevel(newLevel)
})

// 组件挂载
onMounted(() => {
  jsonSource.value = props.modelValue
  parseJSON()
  
  // 自动展开到指定层级
  if (jsonData.value) {
    expandToLevel(props.expandLevel)
  }
})

// 提供expandedNodes给JsonNode组件
provide('expandedNodes', expandedNodes)

// 暴露方法
defineExpose({
  formatJSON,
  minifyJSON,
  expandAll,
  collapseAll,
  expandToLevel,
  getData: () => jsonData.value,
  getSource: () => jsonSource.value,
  isValid: () => error.value === ''
})
</script>

<script>
// 子组件: JsonNode
export default {
  name: 'JsonNode',
  props: {
    data: {
      type: [Object, Array, String, Number, Boolean],
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
  },
  emits: ['update:value', 'expand-all', 'collapse-all'],
  inject: ['expandedNodes'],
  
  setup(props, { emit }) {
    const { ref, computed, reactive } = require('vue')
    
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
    
    // 数据类型标签
    const dataTypeLabel = computed(() => {
      return {
        'object': '对象',
        'array': '数组',
        'string': '字符串',
        'number': '数字',
        'boolean': '布尔值',
        'null': '空值',
        'undefined': '未定义'
      }[dataType.value] || dataType.value
    })
    
    // 子项数量
    const childCount = computed(() => {
      if (!isObject.value) return 0
      return Object.keys(props.data).length
    })
    
    // 是否展开
    const isExpanded = computed({
      get: () => props.expandedNodes.has(props.path),
      set: (value) => {
        if (value) {
          props.expandedNodes.add(props.path)
        } else {
          props.expandedNodes.delete(props.path)
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
    const handleValueEdit = (newValue) => {
      emit('update:value', props.path, newValue)
    }
    
    return {
      isObject,
      isArray,
      dataType,
      dataTypeLabel,
      childCount,
      isExpanded,
      getChildPath,
      toggleExpand,
      expandAll,
      collapseAll,
      handleValueEdit
    }
  },
  
  render() {
    // 创建渲染函数（在实际组件中应使用模板）
    // 这里仅提供一个简化的实现示例
    const { h } = require('vue')
    
    const renderToggle = () => {
      return h('span', {
        class: ['toggle', this.isExpanded ? 'expanded' : 'collapsed'],
        onClick: this.toggleExpand
      }, this.isExpanded ? '▼' : '►')
    }
    
    const renderItemValue = () => {
      if (this.isObject) {
        return h('span', {
          class: ['item-summary', `type-${this.dataType}`]
        }, `${this.isArray ? '数组' : '对象'} [${this.childCount}]`)
      }
      
      let valueDisplay = ''
      
      if (this.dataType === 'string') {
        valueDisplay = `"${this.data}"`
      } else if (this.dataType === 'null') {
        valueDisplay = 'null'
      } else {
        valueDisplay = String(this.data)
      }
      
      return h('span', {
        class: ['item-value', `type-${this.dataType}`]
      }, valueDisplay)
    }
    
    const renderChildren = () => {
      if (!this.isObject || !this.isExpanded) return null
      
      const children = []
      
      if (this.isArray) {
        this.data.forEach((item, index) => {
          children.push(h('div', { class: 'json-node-item' }, [
            h('span', { class: 'item-key' }, `${index}:`),
            h('json-node', {
              data: item,
              path: this.getChildPath(index),
              level: this.level + 1,
              readOnly: this.readOnly,
              onUpdateValue: this.handleValueEdit
            })
          ]))
        })
      } else {
        Object.keys(this.data).forEach(key => {
          children.push(h('div', { class: 'json-node-item' }, [
            h('span', { class: 'item-key' }, `${key}:`),
            h('json-node', {
              data: this.data[key],
              path: this.getChildPath(key),
              level: this.level + 1,
              readOnly: this.readOnly,
              onUpdateValue: this.handleValueEdit
            })
          ]))
        })
      }
      
      return h('div', { class: 'json-node-children' }, children)
    }
    
    // 主渲染
    return h('div', { class: 'json-node' }, [
      h('div', { class: 'json-node-header' }, [
        this.isObject ? renderToggle() : h('span', { class: 'toggle-spacer' }),
        renderItemValue(),
        this.isRoot ? h('div', { class: 'root-actions' }, [
          h('button', { onClick: this.expandAll }, '展开全部'),
          h('button', { onClick: this.collapseAll }, '收起全部')
        ]) : null
      ]),
      renderChildren()
    ])
  }
}
</script>

<style scoped>
.json-tree-container {
  display: flex;
  flex-direction: column;
  border: 1px solid #ddd;
  border-radius: 4px;
  height: 100%;
  font-family: 'Source Code Pro', monospace;
  font-size: 14px;
  background-color: #fff;
  overflow: hidden;
}

.json-tree-toolbar {
  display: flex;
  padding: 8px;
  gap: 8px;
  border-bottom: 1px solid #ddd;
  background-color: #f5f5f5;
}

.json-tree-toolbar button {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  font-size: 12px;
}

.json-tree-toolbar button:hover {
  background-color: #f0f0f0;
}

.json-tree-viewer {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

.json-tree-root {
  min-height: 100%;
}

.json-error {
  color: #e53935;
  padding: 8px;
  border: 1px dashed #e53935;
  border-radius: 4px;
  margin: 8px 0;
}

.source-editor {
  height: 200px;
  border-top: 1px solid #ddd;
}

.source-editor textarea {
  width: 100%;
  height: 100%;
  padding: 8px;
  border: none;
  resize: none;
  font-family: 'Source Code Pro', monospace;
  font-size: 14px;
  outline: none;
}

.json-tree-container.readonly .json-tree-toolbar {
  display: none;
}

.json-tree-container.readonly .source-editor textarea {
  background-color: #f5f5f5;
}
</style>

<style>
/* JsonNode组件样式 */
.json-node {
  margin: 2px 0;
}

.json-node-header {
  display: flex;
  align-items: center;
  height: 24px;
}

.json-node-children {
  margin-left: 20px;
  border-left: 1px dashed #ddd;
  padding-left: 8px;
}

.json-node-item {
  display: flex;
  margin: 2px 0;
}

.toggle {
  display: inline-block;
  width: 16px;
  height: 16px;
  text-align: center;
  line-height: 16px;
  cursor: pointer;
  user-select: none;
  color: #666;
}

.toggle-spacer {
  display: inline-block;
  width: 16px;
}

.item-key {
  margin-right: 8px;
  color: #881280;
  font-weight: bold;
}

.item-summary {
  color: #666;
  font-style: italic;
}

.item-value {
  display: inline-block;
}

.type-string {
  color: #a31515;
}

.type-number {
  color: #09885a;
}

.type-boolean {
  color: #0000ff;
  font-weight: bold;
}

.type-null, .type-undefined {
  color: #808080;
  font-style: italic;
}

.root-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.root-actions button {
  padding: 2px 6px;
  font-size: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
}

.root-actions button:hover {
  background-color: #f0f0f0;
}
</style> 