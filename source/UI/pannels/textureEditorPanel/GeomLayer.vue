<template>
  <v-layer ref="geomLayer">
    <!-- 遍历所有几何图形 -->
    <template v-for="geom in geoms" :key="geom.id">
      <!-- 三角形 -->
      <template v-if="geom.type === 'triangle'">
        <v-line
          :config="{
            points: getTrianglePoints(geom),
            closed: true,
            fill: geom.color.fill,
            stroke: geom.color.stroke,
            strokeWidth: 2
          }"
        />
        
        <!-- 三角形顶点标记 -->
        <template v-for="point in geom.vertices" :key="point.id">
          <v-circle
            :config="{
              x: point.x,
              y: point.y,
              radius: 4,
              fill: geom.color.pointFill,
              stroke: 'white',
              strokeWidth: 1
            }"
          />
          <v-text
            :config="{
              x: point.x + point.labelOffsetX,
              y: point.y + point.labelOffsetY,
              text: point.label,
              fontSize: 12,
              fontFamily: 'Arial',
              fill: 'rgba(0,0,0,0.8)',
              align: 'center'
            }"
          />
        </template>

        <!-- 三角形中心点标记 -->
        <v-circle
          :config="{
            x: getTriangleCenter(geom).x,
            y: getTriangleCenter(geom).y,
            radius: 4,
            fill: 'rgba(220,100,100,0.8)',
            stroke: 'white',
            strokeWidth: 1
          }"
        />
        <v-text
          :config="{
            x: getTriangleCenter(geom).x + 10,
            y: getTriangleCenter(geom).y - 10,
            text: geom.center.label,
            fontSize: 12,
            fontFamily: 'Arial',
            fill: 'rgba(0,0,0,0.8)',
            align: 'center'
          }"
        />
      </template>
      
      <!-- 这里可以添加其他类型的几何图形，如矩形、圆形等 -->
    </template>
  </v-layer>
</template>

<script setup>
import { ref, defineProps, defineExpose } from 'vue';

const props = defineProps({
  stageWidth: {
    type: Number,
    default: 500
  },
  stageHeight: {
    type: Number,
    default: 500
  },
  geoms: {
    type: Array,
    default: () => []
  }
});

const geomLayer = ref(null);

// 获取三角形的点数组，用于v-line
const getTrianglePoints = (geom) => {
  return geom.vertices.flatMap(vertex => [vertex.x, vertex.y]);
};

// 计算三角形中心点
const getTriangleCenter = (geom) => {
  const vertices = geom.vertices;
  // 计算三个顶点的平均值
  const centerX = vertices.reduce((sum, vertex) => sum + vertex.x, 0) / vertices.length;
  const centerY = vertices.reduce((sum, vertex) => sum + vertex.y, 0) / vertices.length;
  
  return {
    x: centerX,
    y: centerY
  };
};

// 将坐标系原点设为画布中心
const centerCoordinateSystem = () => {
  if (geomLayer.value && geomLayer.value.getNode()) {
    const geomLayerNode = geomLayer.value.getNode();
    geomLayerNode.x(props.stageWidth / 2);
    geomLayerNode.y(props.stageHeight / 2);
  }
};

defineExpose({
  centerCoordinateSystem,
  geomLayer
});
</script>
