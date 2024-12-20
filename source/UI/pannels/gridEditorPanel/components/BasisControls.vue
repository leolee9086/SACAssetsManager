<template>
  <div class="control-section">
    <h4>基向量设置</h4>
    <div class="constraint-info">
      <span class="constraint-type">{{ symmetryConstraints[symmetryType].constraints }}</span>
      <span class="constraint-desc">{{ symmetryConstraints[symmetryType].description }}</span>
    </div>

    <!-- 矩形控制器 -->
    <div v-if="isRectMode">
      <div class="control-group">
        <span>宽度:</span>
        <input type="number" 
               v-model.number="rectWidthValue" 
               @input="updateRectBasis">
      </div>
      <div class="control-group">
        <span>高度:</span>
        <input type="number" 
               v-model.number="rectHeightValue" 
               @input="updateRectBasis">
      </div>
    </div>

    <!-- 六边形控制器 -->
    <div v-if="isHexagonMode" class="control-group">
      <span class="label">边长:</span>
      <div class="size-control">
        <input type="range" 
               v-model.number="hexagonSizeValue" 
               :min="1"
               :max="200"
               @input="updateHexagonBasis">
        <input type="number" 
               v-model.number="hexagonSizeValue" 
               @input="updateHexagonBasis">
      </div>
    </div>

    <!-- 正方形控制器 -->
    <div v-if="isSquareMode" class="control-group">
      <span class="label">边长:</span>
      <div class="size-control">
        <input type="range" 
               v-model.number="squareSizeValue" 
               :min="1"
               :max="200"
               @input="updateSquareBasis">
        <input type="number" 
               v-model.number="squareSizeValue" 
               @input="updateSquareBasis">
      </div>
    </div>

    <!-- 菱形控制器 -->
    <div v-if="isRhombusMode">
      <div class="control-group">
        <span class="label">边长:</span>
        <div class="size-control">
          <input type="range" 
                 v-model.number="rhombusSizeValue" 
                 :min="1"
                 :max="200"
                 @input="updateRhombusBasis">
          <input type="number" 
                 v-model.number="rhombusSizeValue" 
                 @input="updateRhombusBasis">
        </div>
      </div>
      <div class="control-group" v-if="allowAngleControl">
        <span class="label">角度:</span>
        <input type="range" 
               v-model.number="rhombusAngleValue" 
               min="30" 
               max="150"
               @input="updateRhombusBasis">
        <span>{{ rhombusAngleValue }}°</span>
      </div>
    </div>

    <!-- 自由基向量控制 -->
    <div v-if="isFreeMode">
      <div class="control-group">
        <span>基向量1:</span>
        <div class="vector-inputs">
          <input type="number" 
                 v-model.number="basis1State.x" 
                 @input="updatePatternBasis">
          <input type="number" 
                 v-model.number="basis1State.y" 
                 @input="updatePatternBasis">
        </div>
      </div>
      <div class="control-group">
        <span>基向量2:</span>
        <div class="vector-inputs">
          <input type="number" 
                 v-model.number="basis2State.x" 
                 @input="updatePatternBasis">
          <input type="number" 
                 v-model.number="basis2State.y" 
                 @input="updatePatternBasis">
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { symmetryConstraints } from '../patterns.js'
import { usePatternStateByName } from '../composables/usePatternState.js'

const props = defineProps({
  symmetryType: {
    type: String,
    required: true
  },
  patternName: {
    type: String,
    default: 'main'
  }
})

const {
  basis1: basis1State,
  basis2: basis2State,
  handleBasisInput: updatePatternBasis
} = usePatternStateByName({ 
  name: props.patternName
})

// 计算不同模式的启用状态
const isHexagonMode = computed(() => {
  console.log('当前对称类型:', props.symmetryType)
  const result = ['p3', 'p31m', 'p3m1', 'p6', 'p6m'].includes(props.symmetryType?.toLowerCase() || '')
  console.log('是否为六边形模式:', result)
  return result
})

const isSquareMode = computed(() => {
  const result = ['p4', 'p4m', 'p4g'].includes(props.symmetryType?.toLowerCase() || '')
  console.log('是否为正方形模式:', result)
  return result
})

const isRhombusMode = computed(() => {
  const result = ['cm', 'cmm', 'pmg', 'pgg'].includes(props.symmetryType?.toLowerCase() || '')
  console.log('是否为菱形模式:', result)
  return result
})

const isRectMode = computed(() => {
  const rectTypes = ['pmm', 'pmg', 'pgg', 'cmm']
  return rectTypes.includes(props.symmetryType?.toLowerCase() || '')
})

const isFreeMode = computed(() => {
  const freeTypes = ['p1', 'p2', 'pm', 'pg', 'cm']
  return freeTypes.includes(props.symmetryType?.toLowerCase() || '')
})

// 本地状态
const hexagonSizeValue = ref(40)
const squareSizeValue = ref(40)
const rhombusSizeValue = ref(40)
const rhombusAngleValue = ref(60)
const rectWidthValue = ref(40)
const rectHeightValue = ref(40)

// 添加计算属性判断是否允许角度控制
const allowAngleControl = computed(() => {
  // 只有在cm和cmm模式下允许角度控制
  return ['cm', 'cmm'].includes(props.symmetryType?.toLowerCase() || '')
})

// 更新初始化函数
const initializeValues = () => {
  if (!basis1State.value || !basis2State.value) return
  
  const basis1Length = Math.sqrt(basis1State.value.x ** 2 + basis1State.value.y ** 2)
  const basis2Length = Math.sqrt(basis2State.value.x ** 2 + basis2State.value.y ** 2)
  
  if (isHexagonMode.value) {
    hexagonSizeValue.value = basis1Length
  } else if (isSquareMode.value) {
    squareSizeValue.value = basis1Length
  } else if (isRhombusMode.value) {
    rhombusSizeValue.value = basis1Length
    if (basis2State.value.x !== 0 || basis2State.value.y !== 0) {
      const angle = Math.atan2(basis2State.value.y, basis2State.value.x) * (180 / Math.PI)
      rhombusAngleValue.value = Math.max(30, Math.min(150, angle))
    }
  } else if (isRectMode.value) {
    rectWidthValue.value = basis1Length
    rectHeightValue.value = basis2Length
  }
}

// 添加更新锁
let isUpdating = false

// 修改更新方法
const updateHexagonBasis = () => {
  if (isUpdating || !isHexagonMode.value) return
  isUpdating = true
  try {
    const size = Math.max(1, hexagonSizeValue.value)
    const cos120 = -0.5
    const sin120 = Math.sqrt(3) / 2

    basis1State.value = { x: size, y: 0 }
    basis2State.value = { x: size * cos120, y: size * sin120 }
    updatePatternBasis()
  } finally {
    isUpdating = false
  }
}

const updateSquareBasis = () => {
  if (isUpdating) return
  isUpdating = true
  try {
    basis1State.value = { x: squareSizeValue.value, y: 0 }
    basis2State.value = { x: 0, y: squareSizeValue.value }
    updatePatternBasis()
  } finally {
    isUpdating = false
  }
}

const updateRhombusBasis = () => {
  if (isUpdating) return
  isUpdating = true
  try {
    const angle = (rhombusAngleValue.value * Math.PI) / 180
    basis1State.value = { x: rhombusSizeValue.value, y: 0 }
    basis2State.value = {
      x: rhombusSizeValue.value * Math.cos(angle),
      y: rhombusSizeValue.value * Math.sin(angle)
    }
    updatePatternBasis()
  } finally {
    isUpdating = false
  }
}

const updateRectBasis = () => {
  if (isUpdating || !isRectMode.value) return
  isUpdating = true
  try {
    basis1State.value = { x: rectWidthValue.value, y: 0 }
    basis2State.value = { x: 0, y: rectHeightValue.value }
    updatePatternBasis()
  } finally {
    isUpdating = false
  }
}

// 监听基向量变化
watch([basis1State, basis2State], ([newBasis1, newBasis2], [oldBasis1, oldBasis2]) => {
  if (!isUpdating && newBasis1 && newBasis2 && 
      (JSON.stringify(newBasis1) !== JSON.stringify(oldBasis1) || 
       JSON.stringify(newBasis2) !== JSON.stringify(oldBasis2))) {
    initializeValues()
  }
}, { deep: true })

// 组件挂载时初始化
onMounted(() => {
  initializeValues()
})
</script> 

<style scoped>
.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.label {
  min-width: 50px;
}

.size-control {
  display: flex;
  flex: 1;
  gap: 8px;
  align-items: center;
}

.size-control input[type="range"] {
  flex: 1;
}

.size-control input[type="number"] {
  width: 60px;
}
</style> 