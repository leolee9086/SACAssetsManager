<template>
  <div class="query-builder">
    <!-- 表选择器 -->
    <div class="table-selector">
      <select v-model="selectedTable" class="table-select">
        <option v-for="tableName in tableNames" :key="tableName" :value="tableName">
          {{ tableName }}
        </option>
      </select>
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
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { useTables } from './useTables.js'
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

const generateQuery = () => {
  let query = `SELECT * FROM ${selectedTable.value}`
  
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
}
</script>

<style scoped>
.query-builder {
  padding: 16px;
  font-family: system-ui, -apple-system, sans-serif;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-selector {
  margin-bottom: 12px;
}

.table-select {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  min-width: 120px;
  font-size: 14px;
}

.table-select:focus {
  outline: none;
  border-color: #1890ff;
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
  margin-top: 16px;
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
</style>
