<template>
  <div class="control-section">
    <div class='fn__flex'>
      <h4>晶格点设置</h4>
      <div class="fn__space fn__flex-1"></div>
      <div class="image-upload">
        <input type="file" ref="nodeFileInput" @change="handleNodeImageUpload" accept="image/*" style="display: none">
        <button class="upload-btn" @click="triggerNodeFileInput">
          选择晶格点图片
        </button>
      </div>
    </div>
    
    <div class="control-group">
      <span>点形状:</span>
      <select v-model="nodeShape" @change="updateNodeShape">
        <option value="circle">圆形</option>
        <option value="square">正方形</option>
        <option value="rectangle">矩形</option>
        <option value="hexagon">六边形</option>
        <option value="triangle">三角形</option>
        <option value="star">五角星</option>
        <option value="diamond">菱形</option>
        <option value="octagon">八边形</option>
        <option value="ellipse">椭圆形</option>
        <option value="cross">十字形</option>
        <option value="arrow">箭头</option>
        <option value="heart">心形</option>
        <option value="cloud">云形</option>
        <option value="polygon">正多边形</option>
      </select>
    </div>

    <div class="image-controls">
      <div class="transform-controls">
        <RangeControl
          label="缩放"
          v-model="nodeTransform.scale"
          :min="0.1"
          :max="2"
          :step="0.1"
          @update:modelValue="updateTransformScale"
        />
        
        <RangeControl
          label="旋转"
          v-model="nodeTransform.rotation"
          :min="0"
          :max="360"
          :step="1"
          unit="°"
          @update:modelValue="updateTransformRotation"
        />

        <div class="control-group">
          <span>位移:</span>
          <div class="vector-inputs">
            <input type="number" v-model.number="nodeTransform.translate.x" @input="updateNodeTransform" placeholder="X">
            <input type="number" v-model.number="nodeTransform.translate.y" @input="updateNodeTransform" placeholder="Y">
          </div>
        </div>
      </div>
      
      <RangeControl
        v-if="nodeShape === 'polygon'"
        label="边数"
        v-model="polygonSettings.sides"
        :min="3"
        :max="32"
        :step="1"
        @update:modelValue="updatePolygonShape"
      />
      
      <RangeControl
        label="描边宽度"
        v-model="nodeStrokeWidth"
        :min="0"
        :max="10"
        :step="0.5"
        unit="px"
        @update:modelValue="updateStrokeWidth"
      />
    </div>

    <div class="control-group">
      <span>描边颜色:</span>
      <input type="color" :value="nodeStrokeColor" @input="updateNodeStroke">
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import RangeControl from '../../components/common/baseComponents/rangeControl.vue'

const props = defineProps({
  nodeTransform: {
    type: Object,
    required: true
  },
  nodeShape: {
    type: String,
    required: true
  },
  nodeStrokeWidth: {
    type: Number,
    required: true
  },
  nodeStrokeColor: {
    type: String,
    required: true
  },
  polygonSettings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits([
  'update:nodeTransform',
  'update:nodeShape',
  'update:nodeStrokeWidth', 
  'update:nodeStrokeColor',
  'update:polygonSettings',
  'nodeImageUpload',
  'update'
])

const nodeFileInput = ref(null)

const triggerNodeFileInput = () => {
  nodeFileInput.value.click()
}

const handleNodeImageUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    emit('nodeImageUpload', file)
  }
}

const updateNodeTransform = (e) => {
  const target = e.target
  const newTransform = { ...props.nodeTransform }
  
  if (target.type === 'range') {
    if (target.parentElement.querySelector('span').textContent.includes('缩放')) {
      newTransform.scale = Number(target.value)
    } else if (target.parentElement.querySelector('span').textContent.includes('旋转')) {
      newTransform.rotation = Number(target.value)
    }
  }
  
  emit('update:nodeTransform', newTransform)
  emit('update')
}

const updateNodeShape = (e) => {
  emit('update:nodeShape', e.target.value)
  emit('update')
}

const updateNodeStroke = (e) => {
  const target = e.target
  if (target.type === 'range') {
    emit('update:nodeStrokeWidth', Number(target.value))
  } else if (target.type === 'color') {
    emit('update:nodeStrokeColor', target.value)
  }
  emit('update')
}

const updatePolygonShape = () => {
  emit('update:polygonSettings', { ...props.polygonSettings })
  emit('update')
}

const updateTransformScale = (value) => {
  emit('update:nodeTransform', { 
    ...props.nodeTransform,
    scale: value
  })
  emit('update')
}

const updateTransformRotation = (value) => {
  emit('update:nodeTransform', {
    ...props.nodeTransform,
    rotation: value
  })
  emit('update')
}

const updateStrokeWidth = (value) => {
  emit('update:nodeStrokeWidth', value)
  emit('update')
}
</script>

<style scoped>
.control-section {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 12px;
  margin-bottom: 12px;
}

.control-section h4 {
  margin: 0 0 10px 0;
  font-size: 0.9em;
  color: #ddd;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-group span {
  font-size: 0.9em;
  min-width: 80px;
}

.control-group input[type="range"] {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  height: 6px;
  -webkit-appearance: none;
}

.control-group input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
}

.control-group input[type="color"] {
  width: 40px;
  height: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  padding: 0;
}

.control-group span:last-child {
  min-width: 45px;
  text-align: right;
  font-size: 0.85em;
  color: #aaa;
}
</style> 