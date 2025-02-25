<template>
  <div class="repeat-unit-controls">
    <h3>重复单元设置</h3>
    
    <div class="control-group">
      <div class="control-item" v-for="(point, index) in trianglePoints" :key="index">
        <div class="point-label">顶点 {{ ['A', 'B', 'C'][index] }}</div>
        <div class="point-inputs">
          <v-text-field
            v-model.number="point.x"
            label="X"
            type="number"
            dense
            @change="updateTrianglePoints"
          />
          <v-text-field
            v-model.number="point.y"
            label="Y"
            type="number"
            dense
            @change="updateTrianglePoints"
          />
        </div>
      </div>
    </div>
    
    <div class="control-actions">
      <v-btn @click="resetTriangle">重置三角形</v-btn>
      <v-btn @click="applyEquilateralTriangle">等边三角形</v-btn>
    </div>
    
    <div class="symmetry-options">
      <h4>对称选项</h4>
      <v-checkbox v-model="showRotationalSymmetry" label="显示旋转对称" @change="updateGrid" />
      <v-checkbox v-model="showMirrorSymmetry" label="显示镜像对称" @change="updateGrid" />
      <v-checkbox v-model="showTranslationalSymmetry" label="显示平移重复" @change="updateGrid" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  trianglePoints: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['update:trianglePoints', 'update:grid'])

// 本地状态
const trianglePoints = ref(JSON.parse(JSON.stringify(props.trianglePoints)))
const showRotationalSymmetry = ref(true)
const showMirrorSymmetry = ref(true)
const showTranslationalSymmetry = ref(false)

// 监听外部传入的三角形点变化
watch(() => props.trianglePoints, (newPoints) => {
  trianglePoints.value = JSON.parse(JSON.stringify(newPoints))
}, { deep: true })

// 更新三角形点
const updateTrianglePoints = () => {
  emit('update:trianglePoints', trianglePoints.value)
  emit('update:grid')
}

// 重置三角形
const resetTriangle = () => {
  trianglePoints.value = [
    { x: 100, y: 100 },
    { x: 200, y: 100 },
    { x: 150, y: 100 + Math.sqrt(3) * 50 }
  ]
  updateTrianglePoints()
}

// 应用等边三角形
const applyEquilateralTriangle = () => {
  const centerX = (trianglePoints.value[0].x + trianglePoints.value[1].x + trianglePoints.value[2].x) / 3
  const centerY = (trianglePoints.value[0].y + trianglePoints.value[1].y + trianglePoints.value[2].y) / 3
  
  const radius = 100 // 等边三角形外接圆半径
  
  trianglePoints.value = [
    { x: centerX + radius * Math.cos(0), y: centerY + radius * Math.sin(0) },
    { x: centerX + radius * Math.cos(2 * Math.PI / 3), y: centerY + radius * Math.sin(2 * Math.PI / 3) },
    { x: centerX + radius * Math.cos(4 * Math.PI / 3), y: centerY + radius * Math.sin(4 * Math.PI / 3) }
  ]
  
  updateTrianglePoints()
}

// 更新网格
const updateGrid = () => {
  emit('update:grid')
}
</script>

<style scoped>
.repeat-unit-controls {
  padding: 16px;
  border-top: 1px solid #ddd;
}

.control-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}

.control-item {
  display: flex;
  flex-direction: column;
}

.point-label {
  font-weight: bold;
  margin-bottom: 4px;
}

.point-inputs {
  display: flex;
  gap: 8px;
}

.control-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.symmetry-options {
  border-top: 1px solid #eee;
  padding-top: 16px;
}
</style> 