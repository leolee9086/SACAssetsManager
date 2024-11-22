<script setup>
import { ref, watch } from 'vue'

// 共享的props和事件
const props = defineProps({
  modelValue: { type: Number, default: 0 },
  min: { type: Number, default: -Infinity },
  max: { type: Number, default: Infinity },
  step: { type: Number, default: 1 },
  unit: { type: String, required: false }

})

const emit = defineEmits(['update:modelValue'])

// 共享的方法
const validateNumber = (value) => {
  const num = Number(value)
  if (isNaN(num)) return props.modelValue
  return Math.min(Math.max(num, props.min), props.max)
}

const handleInput = (value) => {
  const validValue = validateNumber(value)
  emit('update:modelValue', validValue)
}
</script>

<!-- 添加公共样式 -->
<style>
.number-input {
  display: inline-flex;
  align-items: center;
}

.number-input input {
  width: 80px;
  text-align: center;
  padding: 4px;
  -moz-appearance: textfield;
}

.number-input input::-webkit-outer-spin-button,
.number-input input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>

<!-- 基础变体 -->
<template variant="basic">
  <div class="number-input basic">
    <button @click="handleInput(modelValue - step)" :disabled="modelValue <= min">-</button>
    <input
      type="number"
      :value="modelValue"
      @input="e => handleInput(e.target.value)"
      :min="min"
      :max="max"
      :step="step"
    />
    <button @click="handleInput(modelValue + step)" :disabled="modelValue >= max">+</button>
  </div>
</template>

<style variant="basic">
.number-input.basic {
  gap: 8px;
}

.number-input.basic button {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: #fff;
  cursor: pointer;
}

.number-input.basic button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

<!-- 带单位变体 -->
<template variant="withUnit">
  <div class="number-input with-unit">
    <input
      type="number"
      :value="modelValue"
      @input="e => handleInput(e.target.value)"
      :min="min"
      :max="max"
      :step="step"
    />
    <span class="unit" v-if="props.unit">{{ unit }}</span>
  </div>
</template>
<style variant="withUnit">
.number-input.with-unit {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 4px 8px;
}

.number-input.with-unit input {
  border: none;
  outline: none;
}

.number-input.with-unit .unit {
  color: #666;
  margin-left: 4px;
}
</style>
<!-- 科学计数变体 -->
<template variant="scientific">
  <div class="number-input scientific">
    <input
      type="number"
      :value="mantissa"
      @input="e => updateMantissa(e.target.value)"
      step="0.1"
    />
    <span>×10</span>
    <sup>
      <input
        type="number"
        :value="exponent"
        @input="e => updateExponent(e.target.value)"
        class="exponent"
      />
    </sup>
  </div>
</template>

<script variant="scientific">
const mantissa = ref(1)
const exponent = ref(0)

// 计算实际值
const calculateValue = () => {
  return mantissa.value * Math.pow(10, exponent.value)
}

// 更新尾数
const updateMantissa = (value) => {
  mantissa.value = Number(value) || 1
  handleInput(calculateValue())
}

// 更新指数
const updateExponent = (value) => {
  exponent.value = Number(value) || 0
  handleInput(calculateValue())
}

// 初始化科学计数法表示
const initScientific = () => {
  if (props.modelValue === 0) {
    mantissa.value = 0
    exponent.value = 0
    return
  }
  
  const absValue = Math.abs(props.modelValue)
  exponent.value = Math.floor(Math.log10(absValue))
  mantissa.value = props.modelValue / Math.pow(10, exponent.value)
  
  if (props.modelValue < 0) {
    mantissa.value = -Math.abs(mantissa.value)
  }
}

// 监听值变化
watch(() => props.modelValue, initScientific, { immediate: true })
</script>

<style variant="scientific">
.number-input.scientific {
  gap: 4px;
}

.number-input.scientific .exponent {
  width: 40px;
  font-size: 0.8em;
}
</style>
