<template>
  <v-layer ref="mainLayer">
    <!-- 使用vue-konva声明式组件显示元素 -->
    <template v-for="element in props.elements" :key="element.id">
      <!-- 线条元素 -->
      <v-line 
        v-if="element.type === 'line'"
        :config="{
          points: element.points,
          stroke: element.stroke || 'black',
          strokeWidth: (element.strokeWidth || 2) / scale,
          draggable: element.draggable !== false,
          id: element.id,
          _isCanvasElement: true,
          ...element.config
        }"
        @dragend="handleElementDragEnd($event, element)"
        @click="handleElementClick(element)"
      />
      
      <!-- 圆形元素 -->
      <v-circle
        v-else-if="element.type === 'circle'"
        :config="{
          x: element.x || 0,
          y: element.y || 0,
          radius: element.radius || 10,
          fill: element.fill || 'blue',
          stroke: element.stroke,
          strokeWidth: element.strokeWidth,
          draggable: element.draggable !== false,
          id: element.id,
          _isCanvasElement: true,
          ...element.config
        }"
        @dragend="handleElementDragEnd($event, element)"
        @click="handleElementClick(element)"
      />
      
      <!-- 矩形元素 -->
      <v-rect
        v-else-if="element.type === 'rect'"
        :config="{
          x: element.x || 0,
          y: element.y || 0,
          width: element.width || 20,
          height: element.height || 20,
          fill: element.fill || 'green',
          stroke: element.stroke,
          strokeWidth: element.strokeWidth,
          draggable: element.draggable !== false,
          id: element.id,
          _isCanvasElement: true,
          ...element.config
        }"
        @dragend="handleElementDragEnd($event, element)"
        @click="handleElementClick(element)"
      />
      
      <!-- 文本元素 -->
      <v-text
        v-else-if="element.type === 'text'"
        :config="{
          x: element.x || 0,
          y: element.y || 0,
          text: element.text || '',
          fontSize: element.fontSize || 16,
          fontFamily: element.fontFamily || 'Arial',
          fill: element.fill || 'black',
          draggable: element.draggable !== false,
          id: element.id,
          _isCanvasElement: true,
          ...element.config
        }"
        @dragend="handleElementDragEnd($event, element)"
        @click="handleElementClick(element)"
      />
      
      <!-- 图片元素 -->
      <v-image
        v-else-if="element.type === 'image' && element.imageReady"
        :config="{
          x: element.x || 0,
          y: element.y || 0,
          width: element.width,
          height: element.height,
          image: element.image,
          draggable: element.draggable !== false,
          id: element.id,
          _isCanvasElement: true,
          ...element.config
        }"
        @dragend="handleElementDragEnd($event, element)"
        @click="handleElementClick(element)"
      />
      
      <!-- 路径元素 -->
      <v-path
        v-else-if="element.type === 'path'"
        :config="{
          data: element.data || '',
          fill: element.fill,
          stroke: element.stroke || 'black',
          strokeWidth: element.strokeWidth || 1,
          draggable: element.draggable !== false,
          id: element.id,
          _isCanvasElement: true,
          ...element.config
        }"
        @dragend="handleElementDragEnd($event, element)"
        @click="handleElementClick(element)"
      />
      
      <!-- 自定义形状组件 -->
      <!-- 已有的自定义形状 -->
      <heart-shape
        v-else-if="element.type === 'heart'"
        :element="element"
        :scale="scale"
        @dragend="handleElementDragEnd($event, element)"
        @click="handleElementClick(element)"
      />
      
      <cloud-shape
        v-else-if="element.type === 'cloud'"
        :element="element"
        :scale="scale"
        @dragend="handleElementDragEnd($event, element)"
        @click="handleElementClick(element)"
      />
      
      <diamond-shape
        v-else-if="element.type === 'diamond'"
        :element="element"
        :scale="scale"
        @dragend="handleElementDragEnd($event, element)"
        @click="handleElementClick(element)"
      />

      <cross-shape
        v-else-if="element.type === 'cross'"
        :element="element"
        :scale="scale"
        @dragend="handleElementDragEnd($event, element)"
        @click="handleElementClick(element)"
      />
      
      <crescent-shape
        v-else-if="element.type === 'crescent'"
        :element="element"
        :scale="scale"
        @dragend="handleElementDragEnd($event, element)"
        @click="handleElementClick(element)"
      />
      
      <!-- 新增多边形组件 -->
      <rectangle-shape
        v-else-if="element.type === 'rectangle'"
        :element="element"
        :scale="scale"
        @dragend="handleElementDragEnd($event, element)"
        @click="handleElementClick(element)"
      />
      
      <regular-polygon-shape
        v-else-if="element.type === 'regularPolygon'"
        :element="element"
        :scale="scale"
        @dragend="handleElementDragEnd($event, element)"
        @click="handleElementClick(element)"
      />
      
      <pentagon-shape
        v-else-if="element.type === 'pentagon'"
        :element="element"
        :scale="scale"
        @dragend="handleElementDragEnd($event, element)"
        @click="handleElementClick(element)"
      />
      
      <hexagon-shape
        v-else-if="element.type === 'hexagon'"
        :element="element"
        :scale="scale"
        @dragend="handleElementDragEnd($event, element)"
        @click="handleElementClick(element)"
      />
      
      <triangle-shape
        v-else-if="element.type === 'triangle'"
        :element="element"
        :scale="scale"
        @dragend="handleElementDragEnd($event, element)"
        @click="handleElementClick(element)"
      />
    </template>
    
    <!-- 当前正在绘制的元素 -->
    <v-line v-if="drawingElement && drawingElement.type === 'line'"
      :config="{
        points: drawingElement.points,
        stroke: drawingElement.stroke || 'black',
        strokeWidth: (drawingElement.strokeWidth || 2) / scale,
        id: drawingElement.id
      }"
    />
    
    <!-- 保留原有插槽用于自定义内容 -->
    <slot></slot>
  </v-layer>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
// 导入自定义形状组件
import HeartShape from './shapes/HeartShape.vue';
import CloudShape from './shapes/CloudShape.vue';
import DiamondShape from './shapes/DiamondShape.vue';
import CrossShape from './shapes/CrossShape.vue';
import CrescentShape from './shapes/CrescentShape.vue';
// 导入新增多边形组件
import RectangleShape from './shapes/RectangleShape.vue';
import RegularPolygonShape from './shapes/RegularPolygonShape.vue';
import PentagonShape from './shapes/PentagonShape.vue';
import HexagonShape from './shapes/HexagonShape.vue';
import TriangleShape from './shapes/TriangleShape.vue';

// 定义props
const props = defineProps({
  // 元素列表 - 这里已经是过滤好的可见元素
  elements: {
    type: Array,
    default: () => []
  },
  // 当前正在绘制的元素
  drawingElement: {
    type: Object,
    default: null
  },
  // 当前缩放级别
  scale: {
    type: Number,
    default: 1
  },
  // 视口信息 - 仍然保留这些属性以便组件内部使用
  viewport: {
    type: Object,
    default: () => ({})
  },
  // 视图状态
  viewState: {
    type: Object,
    required: true
  }
});

// 定义emit
const emit = defineEmits([
  'element-updated',
  'element-selected'
]);

// Konva图层引用
const mainLayer = ref(null);

// 添加图像加载函数
const loadImage = (element) => {
  if (!element.imageUrl || element.imageLoading) return;
  
  element.imageLoading = true;
  const imageObj = new Image();
  
  imageObj.onload = () => {
    element.image = imageObj;
    element.imageReady = true;
    element.imageLoading = false;
    // 通知外部组件更新元素
    emit('element-updated', element);
  };
  
  imageObj.onerror = () => {
    element.imageLoading = false;
    console.error('无法加载图像:', element.imageUrl);
  };
  
  imageObj.src = element.imageUrl;
};

// 处理元素拖拽结束
const handleElementDragEnd = (e, element) => {
  const node = e.target;
  
  // 根据元素类型更新数据
  if (element.type === 'line') {
    element.points = node.points();
  } else {
    element.x = node.x();
    element.y = node.y();
  }
  
  // 触发数据更新
  emit('element-updated', element);
};

// 元素点击处理
const handleElementClick = (element) => {
  emit('element-selected', element);
};

// 获取Konva层的方法
const getLayer = () => {
  return mainLayer.value ? mainLayer.value.getNode() : null;
};

// 公开方法和属性
defineExpose({
  getLayer
});
</script> 