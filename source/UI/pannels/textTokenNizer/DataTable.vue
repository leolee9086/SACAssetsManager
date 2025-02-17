<template>
  <div class="result-container">
    <div class="result-header">
      <div class="header-left">
        查询结果 ({{ data.length }} 条记录)
      </div>
      <div class="header-right">
        <button class="btn-settings" @click="showColumnSettings = !showColumnSettings">
          <span>列设置</span>
        </button>
      </div>
    </div>

    <!-- 列设置弹窗 -->
    <div v-if="showColumnSettings" class="column-settings">
      <div class="settings-header">
        <h3>列设置</h3>
        <div class="settings-actions">
          <button class="btn-text" @click="toggleAllColumns">
            {{ allColumnsVisible ? '全部隐藏' : '全部显示' }}
          </button>
        </div>
      </div>
      <VueDraggable 
        v-model="columnSettings" 
        item-key="key"
        handle=".drag-handle"
        class="column-list"
      >
        <template v-for="element in columnSettings" :key="element.key">
          <div class="column-item">
            <span class="drag-handle">⋮⋮</span>
            <input 
              type="checkbox" 
              :checked="element.visible"
              @change="toggleColumn(element)"
            >
            <span class="column-name">{{ element.key }}</span>
          </div>
        </template>
      </VueDraggable>
    </div>

    <div class="result-table">
      <table>
        <thead>
          <tr>
            <th v-for="col in visibleColumns" :key="col.key">
              {{ col.key }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in data" :key="index">
            <td v-for="col in visibleColumns" :key="col.key">
              {{ formatValue(row[col.key]) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { VueDraggable } from '../../../../static/vue-draggable-plus.js'

const props = defineProps({
  data: {
    type: Array,
    required: true,
    default: () => []
  }
})

const showColumnSettings = ref(false)
const columnSettings = ref([])

// 监听数据变化，更新列设置
watch(() => props.data, (newData) => {
  if (newData && newData.length > 0) {
    // 获取第一行数据的所有键
    const firstRow = newData[0]
    const allKeys = Object.keys(firstRow)
    
    // 如果列设置为空，初始化所有列为可见
    if (columnSettings.value.length === 0) {
      columnSettings.value = allKeys.map(key => ({
        key,
        visible: true
      }))
      console.log('Initialized column settings:', columnSettings.value)
      return
    }
    
    // 保持现有列的设置
    const existingSettings = new Map(
      columnSettings.value.map(col => [col.key, col.visible])
    )
    
    // 更新列设置
    columnSettings.value = allKeys.map(key => ({
      key,
      visible: existingSettings.has(key) ? existingSettings.get(key) : true
    }))
    
    console.log('Updated column settings:', columnSettings.value)
  } else {
    columnSettings.value = []
  }
}, { immediate: true })

// 计算可见列
const visibleColumns = computed(() => {
  return columnSettings.value.filter(col => col.visible)
})

// 计算是否所有列都可见
const allColumnsVisible = computed(() => {
  return columnSettings.value.every(col => col.visible)
})

// 切换列显示状态
const toggleColumn = (column) => {
  column.visible = !column.visible
  console.log('Toggled column:', column)
}

// 切换所有列显示状态
const toggleAllColumns = () => {
  const newValue = !allColumnsVisible.value
  columnSettings.value.forEach(col => {
    col.visible = newValue
  })
  console.log('Toggled all columns:', columnSettings.value)
}

const formatValue = (value) => {
  if (value === null) return 'NULL'
  if (value instanceof Date) return value.toLocaleString()
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}
</script>

<style scoped>
.result-container {
  margin-top: 20px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  overflow: hidden;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
}

.result-header {
  padding: 12px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  font-weight: 500;
  flex: 0 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-table {
  overflow: auto;
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
  max-height: 100%;
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: white;
}

thead {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f8f9fa;
}

th {
  position: sticky;
  top: 0;
  background: #f8f9fa;
  font-weight: 500;
  z-index: 2;
  box-shadow: 0 2px 2px -1px rgba(0, 0, 0, 0.1);
}

tbody {
  position: relative;
}

th, td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
  white-space: normal;
  word-break: break-word;
  min-width: 150px;
}

tr:last-child td {
  border-bottom: 1px solid #e9ecef;
}

tr:hover {
  background-color: #f8f9fa;
}

td {
  font-family: monospace;
  font-size: 0.9em;
}

.btn-settings {
  padding: 4px 8px;
  background: transparent;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.btn-settings:hover {
  background: #f0f0f0;
}

.column-settings {
  position: absolute;
  right: 16px;
  top: 50px;
  width: 300px;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.settings-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.settings-header h3 {
  margin: 0;
  font-size: 16px;
}

.btn-text {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 4px 8px;
}

.btn-text:hover {
  color: #333;
}

.column-list {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px 0;
}

.column-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  gap: 8px;
  cursor: default;
  background: white;
}

.column-item:hover {
  background: #f8f9fa;
}

.drag-handle {
  cursor: move;
  color: #999;
  user-select: none;
  font-size: 16px;
}

.column-name {
  flex: 1;
  font-size: 14px;
}
</style> 