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

    <!-- 文本图层属性 -->
    <template v-if="layer.layerType === 'text'">
      <div class="property-group">
        <label>文本内容</label>
        <input 
          type="text" 
          v-model="localLayer.config.text" 
          class="property-input"
          @change="emitUpdate"
        >
        <label>字体大小</label>
        <NumberInput
          v-model="localLayer.config.size"
          :min="1"
          :max="200"
          @change="emitUpdate"
          @adjust="adjustValue('size', $event)"
        />
        <label>颜色</label>
        <div class="color-input-wrapper">
          <input 
            type="color" 
            v-model="localLayer.config.color" 
            class="property-input color-input"
            @change="emitUpdate"
          >
          <input 
            type="text" 
            v-model="localLayer.config.color" 
            class="property-input color-text"
            @change="emitUpdate"
          >
        </div>
      </div>
    </template>

    <!-- 矩形图层属性 -->
    <template v-else-if="layer.layerType === 'rect'">
      <div class="property-group">
        <label>颜色</label>
        <div class="color-input-wrapper">
          <input 
            type="color" 
            v-model="localLayer.config.color" 
            class="property-input color-input"
            @change="emitUpdate"
          >
          <input 
            type="text" 
            v-model="localLayer.config.color" 
            class="property-input color-text"
            @change="emitUpdate"
          >
        </div>
        <label>宽度</label>
        <NumberInput
          v-model="localLayer.config.width"
          :min="1"
          @change="emitUpdate"
          @adjust="adjustValue('width', $event)"
        />
        <label>高度</label>
        <NumberInput
          v-model="localLayer.config.height"
          :min="1"
          @change="emitUpdate"
          @adjust="adjustValue('height', $event)"
        />
      </div>
    </template>

    <!-- 网格图层属性 -->
    <template v-else-if="layer.layerType === 'grid'">
      <div class="property-group">
        <label>网格大小</label>
        <NumberInput
          v-model="localLayer.config.size"
          :min="1"
          :max="100"
          @change="emitUpdate"
          @adjust="adjustValue('size', $event)"
        />
        <label>网格颜色</label>
        <div class="color-input-wrapper">
          <input 
            type="color" 
            v-model="localLayer.config.color" 
            class="property-input color-input"
            @change="emitUpdate"
          >
          <input 
            type="text" 
            v-model="localLayer.config.color" 
            class="property-input color-text"
            @change="emitUpdate"
          >
        </div>
      </div>
    </template>

    <!-- 图片图层属性 -->
    <template v-else-if="layer.layerType === 'image'">
      <div class="property-group">
        <label>宽度</label>
        <NumberInput
          v-model="localLayer.config.width"
          :min="1"
          @change="emitUpdate"
          @adjust="adjustValue('width', $event)"
        />
        <label>高度</label>
        <NumberInput
          v-model="localLayer.config.height"
          :min="1"
          @change="emitUpdate"
          @adjust="adjustValue('height', $event)"
        />
      </div>
    </template>

    <!-- 调整图层属性 -->
    <template v-else-if="layer.layerType === 'adjustment'">
      <div class="property-group">
        <label>亮度 {{ localLayer.config.brightness }}</label>
        <input 
          type="range" 
          v-model.number="localLayer.config.brightness"
          min="-1"
          max="1"
          step="0.1"
          class="property-input range-input"
          @change="emitUpdate"
        >
        
        <label>对比度 {{ localLayer.config.contrast }}</label>
        <input 
          type="range" 
          v-model.number="localLayer.config.contrast"
          min="-100"
          max="100"
          step="1"
          class="property-input range-input"
          @change="emitUpdate"
        >
        
        <label>饱和度 {{ localLayer.config.saturation }}</label>
        <input 
          type="range" 
          v-model.number="localLayer.config.saturation"
          min="-2"
          max="2"
          step="0.1"
          class="property-input range-input"
          @change="emitUpdate"
        >
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import NumberInput from './NumberInput.vue'

const props = defineProps({
  layer: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:layer'])

// 创建本地副本以避免直接修改 props
const localLayer = ref(JSON.parse(JSON.stringify(props.layer)))

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