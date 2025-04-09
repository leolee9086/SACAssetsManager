<template>
  <div class="subquery-builder">
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

    <div class="conditions-container">
      <div v-for="(condition, index) in conditions" :key="index" class="condition-row">
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
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed, nextTick } from 'vue'
import { useTables } from './useTables.js'
import FieldSelect from './FieldSelect.vue'
import FieldInput from './FieldInput.vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const { getTableFields, getTableNames } = useTables()
const selectedTable = ref('blocks')
const tableNames = getTableNames()

const fields = computed(() => getTableFields(selectedTable.value))

const matchType = ref('IS')
const logicOperator = ref('AND')
const conditions = ref([{
  field: '',
  operator: '=',
  value: ''
}])

const selectedFields = ref([])
const newFieldToAdd = ref('')

const availableFields = computed(() => {
  return fields.value.filter(f => 
    !selectedFields.value.some(sf => sf.name === f.name)
  )
})

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

watch(conditions, (newConditions) => {
  newConditions.forEach(condition => {
    if (['between', 'not_between'].includes(condition.operator) && !Array.isArray(condition.value)) {
      condition.value = ['', ''];
    } else if (!['between', 'not_between'].includes(condition.operator) && Array.isArray(condition.value)) {
      condition.value = '';
    }
  });
}, { deep: true });

const isFieldSelectorOpen = ref(false)
const removeField = (index) => {
  selectedFields.value.splice(index, 1)
}

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

// 监听条件变化，自动更新SQL
watch([conditions, selectedFields, matchType, logicOperator, selectedTable], () => {
  const sql = generateSubQuery()
  emit('update:modelValue', sql)
  emit('change', sql)
}, { deep: true })

// 生成子查询SQL
const generateSubQuery = () => {
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
        if (!c.field) return null // 跳过空字段
        
        const field = fields.value.find(f => f.name === c.field);
        const formatValue = (value) => {
          if (field?.formatter) {
            return field.formatter.toStorage(value);
          }
          return value;
        };

        if (c.field === 'created' || c.field === 'updated') {
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
          if (!c.value) return null; // 跳过空值
          
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
      .filter(Boolean) // 移除空值
      .join(` ${logicOperator.value} `)
    if (matchType.value === 'IS NOT') {
      query += ')'
    }
  }
  
  return query
}

defineExpose({
  generateSubQuery
})
</script>

<style scoped>
.subquery-builder {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  margin: 0;
}

.query-header {
  background: #fff;
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 12px;
  border: 1px solid #e9ecef;
}

.query-clause {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 0.9em;
}

.keyword {
  font-weight: 600;
  color: #0d6efd;
  white-space: nowrap;
  font-size: 0.9em;
}

.field-selector-trigger {
  position: relative;
  flex: 1;
  min-width: 150px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  background: white;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  font-size: 0.9em;
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
  padding: 2px 4px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.9em;
}

.alias {
  color: #0d6efd;
  font-size: 0.8em;
}

.field-selector-dropdown {
  position: fixed;
  width: auto;
  min-width: 250px;
  max-width: 500px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.field-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  font-size: 0.9em;
}

.remove-field {
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  padding: 0 4px;
  font-size: 0.9em;
}

.remove-field:hover {
  background: #fff5f5;
}

.table-select {
  padding: 4px 8px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background: white;
  min-width: 100px;
  font-size: 0.9em;
}

.main-condition {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.main-select {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  min-width: 80px;
  font-size: 0.9em;
}

.condition-row {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
  align-items: center;
}

.field-select,
.operator-select {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  min-width: 100px;
  font-size: 0.9em;
}

.condition-buttons {
  display: flex;
  gap: 4px;
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
  font-size: 14px;
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
</style> 