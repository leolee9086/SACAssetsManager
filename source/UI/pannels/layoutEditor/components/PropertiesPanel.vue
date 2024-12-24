<template>
  <div class="properties-panel" v-if="layer">
    <div class="panel-header">
      <h3>{{ layer.name }} 属性</h3>
    </div>

    <!-- 基础属性 -->
    <div class="property-group">
      <label>图层名称</label>
      <input 
        type="text" 
        v-model="localLayer.name" 
        class="property-input"
        @change="emitUpdate"
      >
    </div>
    <!-- 动态渲染图层声明的调整参数 -->
    <div class="property-group" v-if="layerAdjustments.length">
      

      <template v-for="adj in filteredAdjustments" :key="adj.key">
        <label>{{ adj.label }}</label>
        <!-- 修改组件渲染方式 -->
        <component
          :is="components[adj.component]"
          v-model="localLayer.config[adj.key]"
          v-bind="getAdjustmentProps(adj)"
          @change="emitUpdate"
          @adjust="val => adjustValue(adj.key, val)"
        />
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import NumberInput from './NumberInput.vue'
import ColorPicker from './ColorPicker.vue'
import TextInput from './TextInput.vue'
import Selecter from './Select.vue'
import Slider from './Slider.vue'
import Switch from './Switch.vue'
import TextArea from './TextArea.vue'
import { getLayerAdjustments } from '../core/LayerManager.js'

// 将 components 改为响应式引用
const components = {
  NumberInput,
  ColorPicker,
  TextInput,
  Selecter,
  Slider,
  Switch,
  TextArea
}

const props = defineProps({
  layer: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:layer'])

// 创建本地副本以避免直接修改 props
const localLayer = ref(JSON.parse(JSON.stringify(props.layer)))

// 确保 layerAdjustments 计算属性正确计算
const layerAdjustments = computed(() => {
  if (!props.layer || !props.layer.layerType) return []
  console.log(props.layer)
  return getLayerAdjustments(props.layer.layerType) || []
})

// 添加 filteredAdjustments 计算属性
const filteredAdjustments = computed(() => {
  if (!layerAdjustments.value) return []
  
  return layerAdjustments.value.filter(adj => {
    // 如果没有 showIf 条件，始终显示
    if (!adj.showIf) return true
    
    // 如果有 showIf 条件，执行条件函数判断
    try {
      return adj.showIf(localLayer.value.config)
    } catch (error) {
      console.warn('执行 showIf 条件时出错:', error)
      return false
    }
  })
})

// 获取调整参数的属性
const getAdjustmentProps = (adjustment) => {
  const props = { ...adjustment }
  delete props.key
  delete props.label
  delete props.component
  return props
}

// 监听 props 变化更新本地数据
watch(() => props.layer, (newLayer) => {
  localLayer.value = JSON.parse(JSON.stringify(newLayer))
}, { deep: true })

// 更新处理函数
const emitUpdate = () => {
  emit('update:layer', JSON.parse(JSON.stringify(localLayer.value)))
}

// 数值调整函数
const adjustValue = (property, delta) => {
  if (localLayer.value.config[property] !== undefined) {
    localLayer.value.config[property] += delta
    emitUpdate()
  }
}
</script>

<style scoped>
.properties-panel {
  width: 280px;
  padding: 16px;
  background: var(--cc-theme-surface, #ffffff);
  border-left: 1px solid var(--cc-border-color, #e0e0e0);
  overflow-y: auto;
}

.panel-header {
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--cc-border-color, #e0e0e0);
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--cc-theme-on-background, #333333);
}

.property-group {
  margin-bottom: 16px;
}

.property-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--cc-theme-on-background-muted, #666666);
}

.property-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--cc-border-color, #e0e0e0);
  border-radius: 4px;
  background: var(--cc-theme-surface-light, #ffffff);
  color: var(--cc-theme-on-background, #333333);
  font-size: 14px;
  margin-bottom: 8px;
}

.property-input[type="color"] {
  height: 32px;
  padding: 2px;
}

.color-input-wrapper {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.color-input {
  width: 60px;
  margin-bottom: 0;
}

.color-text {
  flex: 1;
  margin-bottom: 0;
}

.range-input {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: var(--cc-border-color, #e0e0e0);
  outline: none;
  margin: 8px 0 16px;
}

.range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--cc-theme-primary, #4a90e2);
  cursor: pointer;
}

.range-input::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--cc-theme-primary, #4a90e2);
  cursor: pointer;
  border: none;
}
</style> 