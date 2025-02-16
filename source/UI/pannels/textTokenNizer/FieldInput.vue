<template>
  <div class="field-input-container">
    <!-- 选择器输入 -->
    <div v-if="isSelector" class="selector-container">
      <select
        v-model="localValue"
        class="field-select"
      >
        <option value="">请选择</option>
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      <button
        v-if="fieldConfig?.getOptions"
        class="refresh-button"
        @click="loadOptions"
        title="刷新选项"
      >
        🔄
      </button>
    </div>

    <!-- 日期时间输入 -->
    <template v-else-if="isDateTime">
      <input
        v-if="!isDateField && !isSubquery"
        v-model="localValue"
        type="text"
        class="value-input"
        :placeholder="placeholder"
      />
      <input
        v-else-if="isDateField && !isRange"
        v-model="localValue"
        type="datetime-local"
        class="value-input"
        step="1"
      />
      <div v-else-if="isDateField && isRange" class="range-inputs">
        <input
          v-model="rangeValues.start"
          type="datetime-local"
          class="value-input"
          step="1"
        />
        <span>至</span>
        <input
          v-model="rangeValues.end"
          type="datetime-local"
          class="value-input"
          step="1"
        />
      </div>
    </template>

    <!-- 默认文本输入 -->
    <input
      v-else
      v-model="localValue"
      type="text"
      class="value-input"
      :placeholder="placeholder"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useTables } from './useTables.js';

const props = defineProps({
  modelValue: [String, Array],
  field: String,
  operator: String,
  table: String 
});

const emit = defineEmits(['update:modelValue']);

const { tables } = useTables();
const options = ref([]);
const localValue = ref(props.modelValue);

// 计算当前字段的配置信息
const fieldConfig = computed(() => {
  return tables[props.table]?.fields.find(f => f.name === props.field);
});

// 判断是否为选择器类型
const isSelector = computed(() => fieldConfig.value?.isSelector);

// 判断是否为日期时间类型
const isDateTime = computed(() => fieldConfig.value?.type === 'datetime');

// 判断是否为日期字段
const isDateField = computed(() => ['created', 'updated'].includes(props.field));

// 判断是否为范围查询
const isRange = computed(() => ['between', 'not_between'].includes(props.operator));

const placeholder = computed(() => {
  if (props.operator === 'like_custom') return '请输入表达式（如：%value%）';
  return '请输入匹配字符串';
});

// 修改后的选项加载逻辑
const loadOptions = async () => {
  console.log('开始加载选项，当前字段:', props.field, '表:', props.table);
  if (isSelector.value && fieldConfig.value?.getOptions) {
    try {
      console.log('正在调用getOptions函数');
      options.value = await fieldConfig.value.getOptions();
      console.log('获取到选项:', options.value);
    } catch (error) {
      console.error('加载选项失败:', error);
      options.value = [];
    }
  } else {
    console.log('非选择器字段，清空选项');
    options.value = [];
  }
};

// 添加表变化监听
watch(() => props.table, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    console.log('表变化，重新加载选项');
    loadOptions();
  }
});

// 修改后的字段变化监听
watch(() => props.field, (newVal, oldVal) => {
  console.log('字段变化:', oldVal, '->', newVal);
  loadOptions();
}, { immediate: true });

// 组件挂载时也加载选项
onMounted(() => {
  console.log('组件挂载，初始加载选项');
  loadOptions();
});

// 监听值的变化
watch(localValue, (newValue) => {
  emit('update:modelValue', newValue);
});

// 监听外部值的变化
watch(() => props.modelValue, (newValue) => {
  localValue.value = newValue;
});

// 处理范围值的情况
const rangeValues = ref({
  start: '',
  end: ''
});

// 初始化和同步范围值
watch(() => props.modelValue, (newValue) => {
  if (Array.isArray(newValue)) {
    rangeValues.value.start = newValue[0];
    rangeValues.value.end = newValue[1];
  }
}, { immediate: true });

// 监听范围值变化并更新父组件
watch(rangeValues, (newValues) => {
  if (isRange.value) {
    const start = newValues.start;
    const end = newValues.end;
    if (start !== '' || end !== '') {
      emit('update:modelValue', [start, end]);
    }
  }
}, { deep: true });

// 监听操作符变化
watch(() => props.operator, (newOperator) => {
  if (['between', 'not_between'].includes(newOperator)) {
    if (!Array.isArray(props.modelValue)) {
      emit('update:modelValue', ['', '']);
    }
  } else {
    if (Array.isArray(props.modelValue)) {
      emit('update:modelValue', '');
    }
  }
}, { immediate: true });
</script>

<style scoped>
.field-input-container {
  flex: 1;
  min-width: 200px;
}

.selector-container {
  position: relative;
  display: flex;
  gap: 8px;
}

.field-select,
.value-input {
  width: 100%;
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
}

.field-select:focus,
.value-input:focus {
  outline: none;
  border-color: #1890ff;
}

.range-inputs {
  display: flex;
  gap: 8px;
  align-items: center;
}

.value-input {
  flex: 1;
  min-width: 0;
}

select.value-input {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  min-width: 120px;
  font-size: 14px;
}

select.value-input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.refresh-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  font-size: 12px;
  color: #666;
  transition: color 0.2s;
}

.refresh-button:hover {
  color: #1890ff;
}
</style> 