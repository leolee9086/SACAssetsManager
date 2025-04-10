<template>
  <div class="query-builder">
    <button class="layout-toggle" @click="toggleLayout" :title="isVerticalLayout ? '切换到左右布局' : '切换到上下布局'">
      <svg v-if="isVerticalLayout" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 3h18v18H3V3zm9 0v18" />
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 3h18v18H3V3zm0 9h18" />
      </svg>
      {{ isVerticalLayout ? '左右布局' : '上下布局' }}
    </button>

    <div class="query-container" :class="isVerticalLayout ? 'vertical' : 'horizontal'">
      <div class="query-section" :class="{ horizontal: !isVerticalLayout }">
        <!-- SQL输入区域 -->
        <div class="sql-input-area" v-if="showSqlInput">
          <div class="sql-input-header">
            <span>SQL输入</span>
            <button class="close-btn" @click="toggleSqlInput">×</button>
          </div>
          <textarea
            v-model="sqlInput"
            class="sql-textarea"
            placeholder="输入SQL语句..."
            @keydown.ctrl.enter="parseSql"
          ></textarea>
          <div class="sql-input-footer">
            <button class="parse-btn" @click="parseSql">解析SQL</button>
            <span class="hint">提示: Ctrl + Enter 快捷解析</span>
          </div>
        </div>

        <!-- 查询构建部分 -->
        <div class="query-header">
          <div class="query-clause">
            <span class="keyword">SELECT</span>
            <div class="field-selector">
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
            <template v-if="condition.field === 'subquery'">
              <div class="subquery-condition">
                <div class="subquery-header">
                  <FieldSelect
                    v-model="condition.subqueryField"
                    :fields="fields"
                    class="field-select"
                  />
                  <select v-model="condition.operator" class="operator-select">
                    <option value="IN">包含</option>
                    <option value="NOT IN">不包含</option>
                    <option value="EXISTS">存在</option>
                    <option value="NOT EXISTS">不存在</option>
                  </select>
                  <div class="condition-buttons">
                    <button type="button" class="icon-btn remove-btn" @click="removeCondition(index)">
                      －
                    </button>
                    <button type="button" class="icon-btn add-btn" @click="addCondition">
                      ＋
                    </button>
                  </div>
                </div>
                <div class="subquery-body">
                  <SubQueryBuilder
                    ref="subQueryBuilders"
                    :key="index"
                    v-model="condition.value"
                  />
                </div>
              </div>
            </template>
            <template v-else>
              <FieldSelect
                v-model="condition.field"
                :fields="fields"
                class="field-select"
              />

              <select v-model="condition.operator" class="operator-select">
                <option v-if="condition.field !== 'created' && condition.field !== 'updated'" value="=">等于</option>
                <option v-if="condition.field !== 'created' && condition.field !== 'updated'" value="!=">不等于</option>
                <optgroup v-if="condition.field !== 'created' && condition.field !== 'updated'" label="类似">
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
            </template>
          </div>
        </div>
      </div>

      <div class="divider" :class="isVerticalLayout ? 'vertical' : 'horizontal'"></div>

      <div class="query-section" :class="{ horizontal: !isVerticalLayout }">
        <!-- SQL预览部分 -->
        <div class="preview-header">
          <span>SQL预览</span>
          <button class="edit-sql-btn" @click="toggleSqlInput">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            编辑SQL
          </button>
        </div>
        <div v-if="generatedSQL" class="sql-preview">
          <pre>{{ generatedSQL }}</pre>
        </div>

        <!-- 数据表格部分 -->
        <DataTable v-if="queryResult" :data="queryResult" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed, nextTick } from 'vue'
import { useTables, kernelApi } from './useTables.js'
import { computeParseSql, computeValidateSql } from './sqlParser.js'
import FieldSelect from './FieldSelect.vue'
import FieldInput from './FieldInput.vue'
import DataTable from './DataTable.vue'
import SubQueryBuilder from './SubQueryBuilder.vue'

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
  value: '',
  subqueryField: ''
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
    value: '',
    subqueryField: ''
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
    
    // 当切换到子查询时，初始化子查询相关字段
    if (condition.field === 'subquery' && !condition.subqueryField) {
      condition.subqueryField = '';
      condition.operator = 'IN';
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
      const validConditions = conditions.value.filter(c => c.field && (c.field === 'subquery' ? c.subqueryField && c.value : c.value))
      
      if (validConditions.length > 0) {
        query += ' WHERE '
        if (matchType.value === 'IS NOT') {
          query += 'NOT ('
        }
        query += validConditions
          .map(c => {
            const field = fields.value.find(f => f.name === c.field);
            const formatValue = (value) => {
              if (field?.formatter) {
                return field.formatter.toStorage(value);
              }
              return value;
            };

            if (c.field === 'subquery') {
              // 处理子查询
              if (!c.value) return null;
              
              if (c.operator === 'EXISTS' || c.operator === 'NOT EXISTS') {
                return `${c.operator} (${c.value})`;
              } else {
                return `${c.subqueryField} ${c.operator} (${c.value})`;
              }
            } else if (c.field === 'created' || c.field === 'updated') {
              if (!c.value) return null;
              
              switch(c.operator) {
                case '=':
                  return `${c.field} = '${formatValue(c.value)}'`;
                case '<':
                  return `${c.field} < '${formatValue(c.value)}'`;
                case '>':
                  return `${c.field} > '${formatValue(c.value)}'`;
                case 'between':
                  if (!Array.isArray(c.value) || c.value.length !== 2) return null;
                  return `${c.field} BETWEEN '${formatValue(c.value[0])}' AND '${formatValue(c.value[1])}'`;
                case 'not_between':
                  if (!Array.isArray(c.value) || c.value.length !== 2) return null;
                  return `(${c.field} < '${formatValue(c.value[0])}' OR ${c.field} > '${formatValue(c.value[1])}')`;
                default:
                  return `${c.field} ${c.operator} '${formatValue(c.value)}'`;
              }
            } else {
              if (!c.value) return null;
              
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
          .filter(Boolean) // 移除空条件
          .join(` ${logicOperator.value} `)
        if (matchType.value === 'IS NOT') {
          query += ')'
        }
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

// 添加防抖函数
const debounce = (fn, delay) => {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

// 自动查询的防抖处理
const debouncedQuery = debounce(generateQuery, 500)

// 监听所有可能触发查询的状态变化
watch([
  selectedFields,
  selectedTable,
  matchType,
  logicOperator,
  conditions
], () => {
  debouncedQuery()
}, { deep: true })

// 新增布局状态
const isVerticalLayout = ref(true)

const toggleLayout = () => {
  isVerticalLayout.value = !isVerticalLayout.value
}

// 新增SQL输入相关状态
const showSqlInput = ref(false)
const sqlInput = ref('')

const toggleSqlInput = () => {
  showSqlInput.value = !showSqlInput.value
  if (showSqlInput.value) {
    sqlInput.value = generatedSQL.value
  }
}

const parseSql = async () => {
  try {
    if (!computeValidateSql(sqlInput.value)) {
      alert('请输入有效的SELECT语句')
      return
    }

    const result = computeParseSql(sqlInput.value)
    if (!result) {
      alert('SQL解析失败，请检查语法')
      return
    }

    // 更新界面状态
    selectedFields.value = result.fields
    selectedTable.value = result.table
    matchType.value = result.matchType
    logicOperator.value = result.logicOperator
    conditions.value = result.conditions

    showSqlInput.value = false
  } catch (error) {
    console.error('SQL解析错误:', error)
    alert('SQL解析出错，请检查语法')
  }
}
</script>

<style scoped>
.query-builder {
  padding: 8px;
  font-family: system-ui, -apple-system, sans-serif;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 8px;
}

.layout-toggle {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 1;
}

.layout-toggle:hover {
  background: #f8f9fa;
}

.layout-toggle svg {
  width: 16px;
  height: 16px;
}

.query-container {
  display: flex;
  gap: 12px;
  height: 100%;
  transition: flex-direction 0.3s ease;
}

.query-container.vertical {
  flex-direction: column;
}

.query-container.horizontal {
  flex-direction: row;
}

.query-section {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.query-section.horizontal {
  max-width: 50%;
}

.divider {
  background: #e9ecef;
  transition: all 0.3s ease;
}

.divider.vertical {
  width: 100%;
  height: 1px;
}

.divider.horizontal {
  width: 1px;
  align-self: stretch;
}

.query-header {
  background: #fff;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 12px;
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

.field-selector {
  flex: 1;
  min-width: 200px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background: white;
  padding: 8px;
  margin: 0 8px;
}

.selected-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.field-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
  background: #f8f9fa;
  border-radius: 4px;
}

.field-checkbox {
  margin: 0;
}

.alias-input {
  flex: 1;
  min-width: 80px;
  padding: 2px 6px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 0.9em;
}

.alias-input:focus {
  outline: none;
  border-color: #86b7fe;
}

.remove-field {
  padding: 0 6px;
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  font-size: 1.1em;
  line-height: 1;
}

.remove-field:hover {
  color: #bb2d3b;
}

.add-field-select {
  width: 100%;
  padding: 4px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.add-field-select:focus {
  outline: none;
  border-color: #86b7fe;
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
  gap: 6px;
  margin: 4px 0;
}

.conditions-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.condition-row {
  display: flex;
  gap: 6px;
  align-items: center;
  width: 100%;
}

.subquery-condition {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.subquery-header {
  display: flex;
  gap: 6px;
  align-items: center;
  width: 100%;
}

.subquery-body {
  margin-left: 12px;
  border-left: 2px solid #e9ecef;
  padding-left: 12px;
}

.field-select,
.operator-select,
.main-select {
  padding: 4px 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  min-width: 80px;
  font-size: 0.9em;
}

.sql-preview {
  margin-top: 0;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 0.9em;
  border: 1px solid #e9ecef;
  flex: 1;
  overflow: auto;
  min-height: 100px;
}

.sql-preview pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.query-section :deep(.data-table) {
  flex: 1;
  overflow: auto;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  background: #fff;
}

.query-section.horizontal {
  max-width: 50%;
  min-width: 400px;
}

.query-section.horizontal .sql-preview {
  max-height: 30vh;
}

.query-section.horizontal :deep(.data-table) {
  max-height: calc(70vh - 100px);
}

@media (max-width: 1024px) {
  .query-container.horizontal {
    flex-direction: column;
  }

  .query-section.horizontal {
    max-width: 100%;
  }

  .divider.horizontal {
    width: 100%;
    height: 1px;
  }
}

.icon-btn {
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 12px;
}

.remove-btn {
  color: #ff4d4f;
}

.add-btn {
  color: #52c41a;
}

select:focus,
input:focus {
  outline: none;
  border-color: #1890ff;
}

button:hover {
  opacity: 0.8;
}

.sql-input-area {
  border: 1px solid #e9ecef;
  border-radius: 4px;
  background: #fff;
  margin-bottom: 12px;
}

.sql-input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.sql-textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border: none;
  resize: vertical;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.5;
}

.sql-textarea:focus {
  outline: none;
}

.sql-input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.parse-btn {
  padding: 4px 12px;
  background: #0d6efd;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.parse-btn:hover {
  background: #0b5ed7;
}

.hint {
  color: #6c757d;
  font-size: 0.9em;
}

.close-btn {
  background: none;
  border: none;
  color: #6c757d;
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
}

.close-btn:hover {
  color: #343a40;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.edit-sql-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  color: #495057;
  cursor: pointer;
}

.edit-sql-btn:hover {
  background: #f8f9fa;
  border-color: #ced4da;
}
</style>
