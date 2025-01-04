<template>
  <div class="processor-params" v-if="params.length">
    <div v-for="param in params" :key="param.name" class="param-control">
      <!-- 数值类型参数 -->
      <template v-if="param.type === 'number'">
        <label>
          {{ param.label }}
          <div class="number-input">
            <input 
              type="range"
              v-model.number="values[param.name]"
              :min="param.min"
              :max="param.max"
              :step="param.step"
            >
            <input 
              type="number"
              v-model.number="values[param.name]"
              :min="param.min"
              :max="param.max"
              :step="param.step"
            >
          </div>
        </label>
      </template>

      <!-- 布尔类型参数 -->
      <template v-if="param.type === 'boolean'">
        <label>
          <input 
            type="checkbox"
            v-model="values[param.name]"
          >
          {{ param.label }}
        </label>
      </template>

      <!-- 选择类型参数 -->
      <template v-if="param.type === 'select'">
        <label>
          {{ param.label }}
          <select v-model="values[param.name]">
            <option 
              v-for="option in param.options" 
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  params: {
    type: Array,
    default: () => []
  },
  initialValues: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:params'])

// 参数值存储
const values = ref({...props.initialValues})

// 初始化默认值
props.params.forEach(param => {
  if (!(param.name in values.value)) {
    values.value[param.name] = param.default
  }
})

// 监听值变化并发出事件
watch(values, (newValues) => {
  emit('update:params', newValues)
}, { deep: true })
</script>

<style scoped>
.processor-params {
  margin-top: 10px;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
}

.param-control {
  margin-bottom: 8px;
}

.param-control label {
  display: block;
  font-size: 0.9em;
  color: #666;
}

.number-input {
  display: flex;
  gap: 8px;
  align-items: center;
}

.number-input input[type="range"] {
  flex: 1;
}

.number-input input[type="number"] {
  width: 60px;
}

select {
  width: 100%;
  padding: 4px;
  border-radius: 4px;
  border: 1px solid #ddd;
}
</style> 