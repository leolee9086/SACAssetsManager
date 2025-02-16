<template>
  <div class="query-builder">
    <!-- 头部查询结构 -->
    <div class="query-header">
      <div class="query-clause">
        <span class="keyword">SELECT</span>
        <div 
          ref="triggerElement"
          class="field-selector-trigger" 
          @click.stop="toggleFieldSelector"
        >
          <template v-if="selectedFields.filter(f => f.selected).length > 0">
            <span v-for="(field, index) in selectedFields.filter(f => f.selected)" 
                  :key="field.name" 
                  class="selected-field-tag">
              {{ field.name }}
              <span v-if="field.alias" class="alias">AS {{ field.alias }}</span>
              <span v-if="index < selectedFields.filter(f => f.selected).length - 1">, </span>
            </span>
          </template>
          <span v-else class="placeholder">选择字段...</span>
        </div>
        
        <div 
          v-if="isFieldSelectorOpen" 
          class="field-selector-dropdown"
          :style="dropdownPosition"
          v-click-outside="closeFieldSelector"
        >
          <div class="selected-fields">
            <div v-for="(field, index) in selectedFields" 
                 :key="index" 
                 class="field-item">
              <label>
                <input 
                  type="checkbox" 
                  v-model="field.selected"
                  class="field-checkbox"
                >
                {{ field.name }}
              </label>
              <input
                v-model="field.alias"
                type="text"
                placeholder="别名"
                class="alias-input"
              >
              <button 
                class="remove-field"
                @click="removeField(index)"
                title="移除字段"
              >×</button>
            </div>
          </div>
          <select 
            v-model="newFieldToAdd" 
            class="add-field-select"
            @change="addFieldToSelection"
          >
            <option value="">添加新字段...</option>
            <option 
              v-for="field in availableFields" 
              :key="field.name" 
              :value="field.name"
            >
              {{ field.displayName || field.name }}
            </option>
          </select>
        </div>

        <span class="keyword">FROM</span>
        <select v-model="selectedTable" class="table-select">
          <option v-for="tableName in tableNames" 
                  :key="tableName" 
                  :value="tableName">
            {{ tableName }}
          </option>
        </select>
      </div>
    </div>

    <!-- 主条件选择器 -->
    <div class="main-condition">
      <select v-model="matchType" class="main-select">
        <option value="IS">满足</option>
        <option value="IS NOT">不满足</option>
      </select>
      <select v-model="logicOperator" class="main-select">
        <option value="OR">任意</option>
        <option value="AND">所有</option>
      </select>
    </div>

    <!-- 查询条件构建器 -->
    <div class="conditions-container">
      <div v-for="(condition, index) in conditions" :key="index" class="condition-row">
        <FieldSelect
          v-model="condition.field"
          :fields="fields"
          class="field-select"
        />

        <select v-model="condition.operator" class="operator-select">
          <option v-if="condition.field !== 'created' && condition.field !== 'updated' && condition.field !== 'subquery'" value="=">等于</option>
          <option v-if="condition.field !== 'created' && condition.field !== 'updated' && condition.field !== 'subquery'" value="!=">不等于</option>
          <optgroup v-if="condition.field !== 'created' && condition.field !== 'updated' && condition.field !== 'subquery'" label="类似">
            <option value="like_prefix">前缀匹配</option>
            <option value="like_suffix">后缀匹配</option>
            <option value="like_contains">任意匹配</option>
            <option value="like_custom">详细匹配</option>
          </optgroup>
          <option v-if="condition.field === 'created' || condition.field === 'updated'" value="=">等于</option>
          <option v-if="condition.field === 'created' || condition.field === 'updated'" value="<">早于</option>
          <option v-if="condition.field === 'created' || condition.field === 'updated'" value=">">晚于</option>
          <option v-if="condition.field === 'created' || condition.field === 'updated'" value="between">介于</option>
          <option v-if="condition.field === 'created' || condition.field === 'updated'" value="not_between">以外</option>
          <option v-if="condition.field === 'subquery'" value="IN">包含</option>
          <option v-if="condition.field === 'subquery'" value="NOT IN">不包含</option>
          <option v-if="condition.field === 'subquery'" value="EXISTS">存在</option>
          <option v-if="condition.field === 'subquery'" value="NOT EXISTS">不存在</option>
        </select>

        <FieldInput
          v-model="condition.value"
          :field="condition.field"
          :operator="condition.operator"
          :table="selectedTable"
        />

        <div class="condition-buttons">
          <button type="button" class="icon-btn remove-btn" @click="removeCondition(index)">
            －
          </button>
          <button type="button" class="icon-btn add-btn" @click="addCondition">
            ＋
          </button>
        </div>
      </div>
    </div>

    <button type="button" class="generate-btn" @click="generateQuery">生成查询</button>

    <!-- 预览 SQL -->
    <div v-if="generatedSQL" class="sql-preview">
      <pre>{{ generatedSQL }}</pre>
    </div>

    <div v-if="queryResult" class="result-container">
      <div class="result-header">
        查询结果 ({{ queryResult.length }} 条记录)
      </div>
      <div class="result-table">
        <table>
          <thead>
            <tr>
              <th v-for="(value, key) in queryResult[0]" :key="key">
                {{ key }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in queryResult" :key="index">
              <td v-for="(value, key) in row" :key="key">
                {{ formatValue(value) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed, nextTick } from 'vue'
import { useTables,kernelApi } from './useTables.js'
import FieldSelect from './FieldSelect.vue'
import FieldInput from './FieldInput.vue'

const { getTableFields, getTableNames } = useTables()
const selectedTable = ref('blocks')
const tableNames = getTableNames()

// 根据选择的表动态获取字段
const fields = computed(() => getTableFields(selectedTable.value))

const matchType = ref('IS')
const logicOperator = ref('AND')
const conditions = ref([{
  field: '',
  operator: '=',
  value: ''
}])
const generatedSQL = ref('')

const selectedFields = ref([]) // 改为数组存储选中字段和别名
const newFieldToAdd = ref('')

// 计算可用字段（排除已选择的）
const availableFields = computed(() => {
  return fields.value.filter(f => 
    !selectedFields.value.some(sf => sf.name === f.name)
  )
})

// 添加字段到选择列表
const addFieldToSelection = () => {
  if (newFieldToAdd.value) {
    selectedFields.value.push({
      name: newFieldToAdd.value,
      alias: '',
      selected: true
    })
    newFieldToAdd.value = ''
  }
}

const addCondition = () => {
  conditions.value.push({
    field: '',
    operator: '=',
    value: ''
  })
}

const removeCondition = (index) => {
  if (conditions.value.length > 1) {
    conditions.value.splice(index, 1)
  }
}

// 监听 operator 变化，当切换到范围查询时初始化数组
watch(conditions, (newConditions) => {
  newConditions.forEach(condition => {
    if (['between', 'not_between'].includes(condition.operator) && !Array.isArray(condition.value)) {
      condition.value = ['', ''];
    } else if (!['between', 'not_between'].includes(condition.operator) && Array.isArray(condition.value)) {
      condition.value = '';
    }
  });
}, { deep: true });

const generateQuery = async () => {
  try {
    // 构建SELECT部分
    const selectedColumns = selectedFields.value
      .filter(f => f.selected)
      .map(f => {
        const alias = f.alias ? ` AS "${f.alias}"` : ''
        return `${f.name}${alias}`
      })
    
    const columns = selectedColumns.length > 0 
      ? selectedColumns.join(', ') 
      : '*'

    let query = `SELECT ${columns} FROM ${selectedTable.value}`
    
    if (conditions.value.length > 0) {
      query += ' WHERE '
      if (matchType.value === 'IS NOT') {
        query += 'NOT ('
      }
      query += conditions.value
        .map(c => {
          const field = fields.value.find(f => f.name === c.field);
          const formatValue = (value) => {
            if (field?.formatter) {
              return field.formatter.toStorage(value);
            }
            return value;
          };

          if (c.field === 'subquery') {
            return `(${c.value})`;
          } else if (c.field === 'created' || c.field === 'updated') {
            switch(c.operator) {
              case '=':
                return `${c.field} = '${formatValue(c.value)}'`;
              case '<':
                return `${c.field} < '${formatValue(c.value)}'`;
              case '>':
                return `${c.field} > '${formatValue(c.value)}'`;
              case 'between':
                if (!Array.isArray(c.value) || c.value.length !== 2) return '';
                return `${c.field} BETWEEN '${formatValue(c.value[0])}' AND '${formatValue(c.value[1])}'`;
              case 'not_between':
                if (!Array.isArray(c.value) || c.value.length !== 2) return '';
                return `(${c.field} < '${formatValue(c.value[0])}' OR ${c.field} > '${formatValue(c.value[1])}')`;
              default:
                return `${c.field} ${c.operator} '${formatValue(c.value)}'`;
            }
          } else {
            let value = c.value;
            switch(c.operator) {
              case 'like_prefix':
                return `${c.field} LIKE '${value}%'`;
              case 'like_suffix':
                return `${c.field} LIKE '%${value}'`;
              case 'like_contains':
                return `${c.field} LIKE '%${value}%'`;
              case 'like_custom':
                return `${c.field} LIKE '${value}'`;
              default:
                return `${c.field} ${c.operator} '${value}'`;
            }
          }
        })
        .filter(Boolean) // 移除空字符串
        .join(` ${logicOperator.value} `)
      if (matchType.value === 'IS NOT') {
        query += ')'
      }
    }
    
    generatedSQL.value = query
    
    // 调用API获取数据
    const response = await kernelApi.sql({ stmt: query })
    console.log(response)
    queryResult.value = response
  } catch (error) {
    console.error('查询失败:', error)
    queryResult.value = null
  }
}

// 新增响应式状态
const isFieldSelectorOpen = ref(false)

// 移除字段方法
const removeField = (index) => {
  selectedFields.value.splice(index, 1)
}

// 新增元素引用和位置计算
const triggerElement = ref(null)
const dropdownPosition = reactive({
  top: '0px',
  left: '0px'
})

const toggleFieldSelector = async () => {
  isFieldSelectorOpen.value = !isFieldSelectorOpen.value
  if (isFieldSelectorOpen.value) {
    await nextTick()
    const rect = triggerElement.value.getBoundingClientRect()
    dropdownPosition.top = `${rect.bottom + window.scrollY + 4}px`
    dropdownPosition.left = `${rect.left + window.scrollX}px`
  }
}

const closeFieldSelector = () => {
  isFieldSelectorOpen.value = false
}

// 修改后的点击外部指令
const vClickOutside = {
  beforeMount(el, binding) {
    el.clickOutsideEvent = function(event) {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value()
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el) {
    document.removeEventListener('click', el.clickOutsideEvent)
  }
}

// 新增响应式数据
const queryResult = ref(null)

// 新增格式化方法
const formatValue = (value) => {
  if (value === null) return 'NULL'
  if (value instanceof Date) return value.toLocaleString()
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}
</script>

<style scoped>
.query-builder {
  padding: 16px;
  font-family: system-ui, -apple-system, sans-serif;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 查询构建部分 */
.query-section {
  flex: 0 0 auto; /* 不会被压缩，保持原有大小 */
  overflow-y: auto;
  padding-bottom: 16px;
}

/* 结果显示部分 */
.result-container {
  margin-top: 20px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  overflow: hidden;
  flex: 1 1 auto; /* 允许伸缩，占据剩余空间 */
  display: flex;
  flex-direction: column;
  min-height: 0; /* 确保flex布局正常工作 */
}

.result-header {
  padding: 12px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  font-weight: 500;
  flex: 0 0 auto;
}

.result-table {
  overflow: auto;
  flex: 1 1 auto;
  min-height: 0;
  position: relative; /* 为固定表头提供定位上下文 */
  max-height: 100%;
}

.query-header {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  border: 1px solid #e9ecef;
}

.query-clause {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.keyword {
  font-weight: 600;
  color: #0d6efd;
  white-space: nowrap;
}

.field-selector-trigger {
  position: relative;
  flex: 1;
  min-width: 200px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  background: white;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.field-selector-trigger:hover {
  border-color: #86b7fe;
}

.placeholder {
  color: #6c757d;
  font-style: italic;
}

.selected-field-tag {
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.alias {
  color: #0d6efd;
  font-size: 0.9em;
}

.field-selector-dropdown {
  position: fixed; /* 改为fixed定位 */
  width: auto;
  min-width: 300px;
  max-width: 600px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  /* 移除之前的定位属性 */
}

.field-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
}

.remove-field {
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  padding: 0 4px;
}

.remove-field:hover {
  background: #fff5f5;
}

.table-select {
  padding: 6px 12px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background: white;
  min-width: 120px;
}

.main-condition {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.main-select {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  min-width: 100px;
}

.condition-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.field-select,
.operator-select {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  min-width: 120px;
}

.value-input {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 200px;
}

.condition-buttons {
  display: flex;
  gap: 4px;
}

.icon-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
}

.remove-btn {
  color: #ff4d4f;
}

.add-btn {
  color: #52c41a;
}

.generate-btn {
  margin-top: 20px;
  padding: 8px 16px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.sql-preview {
  margin-top: 16px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
}

select:focus,
input:focus {
  outline: none;
  border-color: #1890ff;
}

button:hover {
  opacity: 0.8;
}

.subquery-container {
  flex: 1;
}

.subquery-input {
  width: 100%;
  min-height: 100px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
}

.field-selector {
  margin-bottom: 16px;
  border-bottom: 1px solid #eee;
  padding-bottom: 12px;
}

.selected-fields {
  margin-bottom: 8px;
}

.field-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.field-checkbox {
  margin-right: 6px;
}

.alias-input {
  flex: 1;
  max-width: 200px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 3px;
  font-size: 12px;
}

.add-field-select {
  width: 100%;
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
}

.dropdown-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.confirm-btn {
  padding: 6px 12px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn {
  padding: 6px 12px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

table {
  width: 100%;
  border-collapse: separate; /* 改为separate以支持固定表头 */
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
  /* 添加边框阴影效果 */
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

/* 确保最后一行底部边框可见 */
tr:last-child td {
  border-bottom: 1px solid #e9ecef;
}
</style>
