<template>
  <v-layer ref="tiledLatticeLayer" id="tiledLatticeLayer">
    <v-group ref="tiledGroup">
      <!-- 原始图像组 -->
      <v-group ref="originalImagesGroup">
        <v-group v-for="(image, index) in originalImages" :key="`original-${index}`">
          <template v-if="clipToUnit">
            <v-group :config="{ clipFunc: (ctx) => clipToBaseUnit(ctx, image) }">
              <v-image :config="{
                ...image.config,
                globalCompositeOperation: blendMode
              }" />
            </v-group>
          </template>
          <template v-else>
            <v-image :config="{
              ...image.config,
              globalCompositeOperation: blendMode
            }" />
          </template>
        </v-group>
      </v-group>

      <!-- 平铺图像组（通过动态生成） -->
      <v-group ref="tiledImagesContainer">
        <!-- 这里将由JavaScript动态生成平铺内容 -->
      </v-group>

      <!-- LOD模式下的重复单元 -->
      <v-group ref="lodUnitsContainer" v-if="useLowDetailMode">
        <!-- 这里将显示重复单元 -->
      </v-group>
    </v-group>
  </v-layer>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { clipToPath } from './utils/clipTo.js';
const clipToBaseUnit = (ctx, image) => {
  const pathVertices = props.unitDefine?.findUnitClipPath(image, props.geoms, true, 1);
  clipToPath(ctx, pathVertices);
};
const props = defineProps({
  stageWidth: {
    type: Number,
    required: true
  },
  stageHeight: {
    type: Number,
    required: true
  },
  rasterImages: {
    type: Array,
    required: true
  },
  latticeVectors: {
    type: Array,
    required: true
  },
  tilingExtent: {
    type: Number,
    default: 3
  },

  blendMode: {
    type: String,
    default: 'source-over'
  },
  clipToUnit: {
    type: Boolean,
    default: false
  },
  geoms: {
    type: Array,
    default: () => []
  },
  useLowDetailMode: {
    type: Boolean,
    default: false
  },
  seamlessUnit: {
    type: Object,
    default: null
  },
  currentScale: {
    type: Number,
    default: 100
  },
  unitDefine: {
    type: Object,

  }
});

const tiledLatticeLayer = ref(null);
const tiledGroup = ref(null);
const originalImagesGroup = ref(null);
const tiledImagesContainer = ref(null);
const lodUnitsContainer = ref(null);
const originalImages = ref([]);

// 计算舞台中心点
const stageCenter = computed(() => ({
  x: props.stageWidth / 2,
  y: props.stageHeight / 2
}));



// 监听原始图像和晶格向量的变化，以及LOD模式的变化
watch([
  () => props.rasterImages,
  () => props.latticeVectors,
  () => props.tilingExtent,
  () => props.blendMode,
  () => props.clipToUnit,
  () => props.useLowDetailMode,
  () => props.currentScale
], () => {
  if (props.useLowDetailMode) {
    generateLodUnits();
  } else {
    generateTiledImages();
  }
}, { deep: true });

// 更新叠加模式
const updateBlendMode = (mode) => {
  originalImages.value.forEach(image => {
    image.config.globalCompositeOperation = mode;
  });

  // 重新绘制图层
  if (tiledLatticeLayer.value) {
    tiledLatticeLayer.value.getNode().draw();
  }
};

// 生成平铺图像 - 使用手动创建而非克隆的方式
const generateTiledImages = () => {
  if (!props.rasterImages.length || !props.latticeVectors.length) return;

  // 处理原始图像
  originalImages.value = [];
  props.rasterImages.forEach(sourceImage => {
    if (!sourceImage.config || !sourceImage.config.image) return;

    const originalImage = {
      id: `original-${sourceImage.id}`,
      config: {
        ...JSON.parse(JSON.stringify(sourceImage.config)),
        image: sourceImage.config.image
      },
      relatedGeom: sourceImage.relatedGeom
    };

    originalImages.value.push(originalImage);
  });

  nextTick(() => {
    if (!tiledImagesContainer.value || !tiledImagesContainer.value.getNode()) return;

    try {
      // 清除之前的平铺内容
      const tiledContainer = tiledImagesContainer.value.getNode();
      tiledContainer.destroyChildren();

      // 获取晶格向量
      const vectors = props.latticeVectors;
      if (vectors.length < 2) return;

      // 计算画布边界（考虑当前缩放比例）
      const scaleRatio = props.currentScale / 100;
      const expandFactor = 2.5 / scaleRatio; // 增加扩展因子，确保覆盖所有区域

      const stageBounds = {
        left: -stageCenter.value.x * expandFactor,
        top: -stageCenter.value.y * expandFactor,
        right: props.stageWidth * expandFactor - stageCenter.value.x,
        bottom: props.stageHeight * expandFactor - stageCenter.value.y
      };
      
      // 使用更精确的几何计算确定平铺范围
      // 1. 计算舞台四个角点的坐标
      const cornerPoints = [
        { x: stageBounds.left, y: stageBounds.top },
        { x: stageBounds.right, y: stageBounds.top },
        { x: stageBounds.left, y: stageBounds.bottom },
        { x: stageBounds.right, y: stageBounds.bottom }
      ];
      
      // 2. 计算向量系统的逆变换矩阵（用于将舞台坐标转换为向量坐标系中的i,j值）
      const v1 = vectors[0];
      const v2 = vectors[1];
      const det = v1.x * v2.y - v1.y * v2.x;
      
      if (Math.abs(det) < 0.001) {
        console.error('晶格向量几乎共线，无法计算逆变换');
        return;
      }
      
      const invMatrix = {
        a: v2.y / det,
        b: -v1.y / det,
        c: -v2.x / det,
        d: v1.x / det
      };
      
      // 计算视窗在晶格空间中的范围（使用更精确的多边形裁剪算法）
      // 定义视窗多边形（笛卡尔坐标系）
      const viewPolygon = [
        { x: stageBounds.left, y: stageBounds.top },
        { x: stageBounds.right, y: stageBounds.top },
        { x: stageBounds.right, y: stageBounds.bottom },
        { x: stageBounds.left, y: stageBounds.bottom }
      ];

      // 将视窗多边形的顶点转换到晶格坐标系
      const viewPolygonInLattice = viewPolygon.map(point => ({
        i: invMatrix.a * point.x + invMatrix.b * point.y,
        j: invMatrix.c * point.x + invMatrix.d * point.y
      }));

      // 计算视窗在晶格坐标中的轴向包围盒（但这只是初步筛选）
      let minI = Infinity, maxI = -Infinity, minJ = Infinity, maxJ = -Infinity;
      viewPolygonInLattice.forEach(point => {
        minI = Math.min(minI, point.i);
        maxI = Math.max(maxI, point.i);
        minJ = Math.min(minJ, point.j);
        maxJ = Math.max(maxJ, point.j);
      });

      // 扩展一些余量确保覆盖边缘单元
      const iMin = Math.floor(minI) - 1;
      const iMax = Math.ceil(maxI) + 1;
      const jMin = Math.floor(minJ) - 1;
      const jMax = Math.ceil(maxJ) + 1;

      console.log(`晶格坐标范围: i=[${iMin},${iMax}], j=[${jMin},${jMax}]`);

      // 使用高效的相交检测算法确定需要渲染的单元
      const cellsToRender = new Set();

      // 定义射线交点法来检测点是否在多边形内（包含边界）
      const isPointInPolygon = (point, polygon) => {
        // 对于边界上的点，我们认为它在多边形内
        for (let i = 0; i < polygon.length; i++) {
          const j = (i + 1) % polygon.length;
          // 检查点是否在边上
          const edge = {
            x1: polygon[i].x, y1: polygon[i].y,
            x2: polygon[j].x, y2: polygon[j].y
          };
          
          // 线段距离容差
          const epsilon = 0.0001;
          // 检查点是否在当前边上
          if (Math.abs((point.y - edge.y1) * (edge.x2 - edge.x1) - 
                       (point.x - edge.x1) * (edge.y2 - edge.y1)) < epsilon) {
            const minX = Math.min(edge.x1, edge.x2);
            const maxX = Math.max(edge.x1, edge.x2);
            const minY = Math.min(edge.y1, edge.y2);
            const maxY = Math.max(edge.y1, edge.y2);
            
            if (point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY) {
              return true;
            }
          }
        }
        
        // 射线法判断点是否在多边形内部
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
          const intersect = ((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
            (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / 
             (polygon[j].y - polygon[i].y) + polygon[i].x);
          if (intersect) inside = !inside;
        }
        return inside;
      };

      // 检测两个多边形是否相交
      const doPolygonsIntersect = (poly1, poly2) => {
        // 检查是否有一个多边形的顶点在另一个多边形内
        for (const point of poly1) {
          if (isPointInPolygon(point, poly2)) return true;
        }
        for (const point of poly2) {
          if (isPointInPolygon(point, poly1)) return true;
        }
        
        // 检查线段相交
        for (let i = 0; i < poly1.length; i++) {
          const p1 = poly1[i];
          const p2 = poly1[(i + 1) % poly1.length];
          
          for (let j = 0; j < poly2.length; j++) {
            const q1 = poly2[j];
            const q2 = poly2[(j + 1) % poly2.length];
            
            // 线段相交检测
            const dx1 = p2.x - p1.x;
            const dy1 = p2.y - p1.y;
            const dx2 = q2.x - q1.x;
            const dy2 = q2.y - q1.y;
            
            const s1 = (-dy1 * (p1.x - q1.x) + dx1 * (p1.y - q1.y)) / (-dx2 * dy1 + dx1 * dy2);
            const s2 = (dx2 * (p1.y - q1.y) - dy2 * (p1.x - q1.x)) / (-dx2 * dy1 + dx1 * dy2);
            
            if (s1 >= 0 && s1 <= 1 && s2 >= 0 && s2 <= 1) {
              return true;
            }
          }
        }
        
        return false;
      };

      // 对每个可能的单元格进行检测
      for (let i = iMin; i <= iMax; i++) {
        for (let j = jMin; j <= jMax; j++) {
          // 计算单元格的四个顶点（笛卡尔坐标系）
          const cellPolygon = [
            { x: i * v1.x + j * v2.x, y: i * v1.y + j * v2.y },
            { x: (i+1) * v1.x + j * v2.x, y: (i+1) * v1.y + j * v2.y },
            { x: (i+1) * v1.x + (j+1) * v2.x, y: (i+1) * v1.y + (j+1) * v2.y },
            { x: i * v1.x + (j+1) * v2.x, y: i * v1.y + (j+1) * v2.y }
          ];
          
          // 检查单元格是否与视窗相交
          if (doPolygonsIntersect(cellPolygon, viewPolygon)) {
            cellsToRender.add(`${i},${j}`);
          }
        }
      }

      console.log(`使用精确相交检测算法后需要渲染的单元数: ${cellsToRender.size}`);

      // 仅为需要渲染的单元创建图像组
      for (const cellKey of cellsToRender) {
        const [i, j] = cellKey.split(',').map(Number);
        
        // 计算平移向量
        const translationVector = {
          x: i * vectors[0].x + j * vectors[1].x,
          y: i * vectors[0].y + j * vectors[1].y
        };

        // 为此位置创建一个新组
        const Konva = window.Konva;
        const positionGroup = new Konva.Group({
          x: translationVector.x,
          y: translationVector.y,
          id: `tiled-position-${i}-${j}`
        });

        // 为每个原始图像创建对应的平铺图像
        let hasValidImages = false;
        for (const originalImage of originalImages.value) {
          try {
            if (props.clipToUnit) {
              // 创建带裁剪的组
              const clipGroup = new Konva.Group({
                clipFunc: (ctx) => {
                  // 使用unitDefine方法来获取裁剪路径
                  if (props.unitDefine && props.unitDefine.findUnitClipPath) {
                    const pathVertices = props.unitDefine.findUnitClipPath(originalImage, props.geoms, true, 1);
                    if (pathVertices && pathVertices.length > 0) {
                      ctx.beginPath();
                      ctx.moveTo(pathVertices[0].x, pathVertices[0].y);
                      for (let i = 1; i < pathVertices.length; i++) {
                        ctx.lineTo(pathVertices[i].x, pathVertices[i].y);
                      }
                      ctx.closePath();
                    }
                  } else {
                    // 找到关联的几何体
                    const relatedGeom = props.geoms.find(g => g.id === originalImage.relatedGeom);
                    if (!relatedGeom || relatedGeom.type !== 'baseUnit') return;

                    // 获取多边形顶点
                    const vertices = relatedGeom.vertices;

                    // 绘制多边形裁剪路径，稍微扩大裁剪区域
                    ctx.beginPath();
                    // 向外扩展2像素以消除接缝
                    const expandBy = 2;

                    // 计算多边形中心点
                    const center = {
                      x: vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length,
                      y: vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length
                    };

                    // 将顶点稍微向外扩展
                    const expandedVertices = vertices.map(v => {
                      const dx = v.x - center.x;
                      const dy = v.y - center.y;
                      const len = Math.sqrt(dx * dx + dy * dy);
                      return {
                        x: center.x + dx * (len + expandBy) / len,
                        y: center.y + dy * (len + expandBy) / len
                      };
                    });

                    // 开始绘制多边形路径
                    if (expandedVertices.length > 0) {
                      ctx.moveTo(expandedVertices[0].x, expandedVertices[0].y);
                      for (let i = 1; i < expandedVertices.length; i++) {
                        ctx.lineTo(expandedVertices[i].x, expandedVertices[i].y);
                      }
                      ctx.closePath();
                    }
                  }
                }
              });

              // 创建图像并添加到裁剪组
              const imageConfig = {
                ...originalImage.config,
                globalCompositeOperation: props.blendMode,
                width: originalImage.config.width + 2,
                height: originalImage.config.height + 2,
                x: Math.floor(originalImage.config.x),
                y: Math.floor(originalImage.config.y)
              };

              if (imageConfig.image) {
                const image = new Konva.Image(imageConfig);
                clipGroup.add(image);
                hasValidImages = true;
              }

              // 将裁剪组添加到位置组
              positionGroup.add(clipGroup);
            } else {
              // 直接创建图像并添加到位置组
              const imageConfig = {
                ...originalImage.config,
                globalCompositeOperation: props.blendMode,
                width: originalImage.config.width + 4, // 进一步增加宽度，避免接缝
                height: originalImage.config.height + 4, // 进一步增加高度，避免接缝
                x: Math.floor(originalImage.config.x),
                y: Math.floor(originalImage.config.y)
              };

              if (imageConfig.image) {
                const image = new Konva.Image(imageConfig);
                positionGroup.add(image);
                hasValidImages = true;
              }
            }
          } catch (error) {
            console.error('创建平铺图像时出错:', error);
          }
        }

        // 只有当位置组包含有效图像时才添加到平铺容器
        if (hasValidImages && tiledContainer && tiledContainer.children) {
          tiledContainer.add(positionGroup);
        }
      }

      // 重新绘制图层
      if (tiledLatticeLayer.value && tiledLatticeLayer.value.getNode()) {
        tiledLatticeLayer.value.getNode().draw();
      }
    } catch (error) {
      console.error('生成平铺图像时发生错误:', error);
    }
  });
};


// 生成LOD重复单元
const generateLodUnits = () => {
  if (!props.seamlessUnit || !lodUnitsContainer.value) return;

  nextTick(() => {
    try {
      // 清除之前的内容
      const lodContainer = lodUnitsContainer.value.getNode();
      lodContainer.destroyChildren();

      const Konva = window.Konva;

      // 计算画布边界（考虑当前缩放比例）
      const scaleRatio = props.currentScale / 100;
      const expandFactor = 1 / scaleRatio; // 缩放越小，扩展越大

      const stageBounds = {
        left: -stageCenter.value.x * expandFactor,
        top: -stageCenter.value.y * expandFactor,
        right: props.stageWidth * expandFactor - stageCenter.value.x,
        bottom: props.stageHeight * expandFactor - stageCenter.value.y
      };

      // 获取重复单元的尺寸
      const unitWidth = props.seamlessUnit.width;
      const unitHeight = props.seamlessUnit.height;

      // 计算需要显示的重复单元的行列数
      const colCount = Math.ceil(Math.max(
        Math.abs(stageBounds.left),
        Math.abs(stageBounds.right)
      ) / unitWidth) + 1;

      const rowCount = Math.ceil(Math.max(
        Math.abs(stageBounds.top),
        Math.abs(stageBounds.bottom)
      ) / unitHeight) + 1;

      // 创建重复单元的矩形网格
      for (let i = -colCount; i <= colCount; i++) {
        for (let j = -rowCount; j <= rowCount; j++) {
          // 创建单元位置
          const x = i * unitWidth;
          const y = j * unitHeight;

          // 跳过画布外的单元
          if (
            x + unitWidth < stageBounds.left ||
            x > stageBounds.right ||
            y + unitHeight < stageBounds.top ||
            y > stageBounds.bottom
          ) {
            continue;
          }

          // 创建单元矩形 - 使用浅灰色细线条和完全透明的填充
          const rect = new Konva.Rect({
            x: x,
            y: y,
            width: unitWidth,
            height: unitHeight,
            fill: 'transparent',   // 透明填充
            stroke: 'rgba(200,200,200,0.3)',  // 浅灰色边框
            strokeWidth: 0.5,      // 细线条
            dash: [2, 2],          // 虚线效果
            opacity: 0.4           // 整体透明度低
          });

          // 添加到容器
          lodContainer.add(rect);

          // 为每个单元添加最小化的标签
          const label = new Konva.Text({
            x: x + unitWidth / 2,
            y: y + unitHeight / 2,
            text: `${i},${j}`,    // 简化标签文本
            fontSize: 8,          // 小字体
            fontFamily: 'Arial',
            fill: 'rgba(100,100,100,0.5)',  // 浅灰色文本
            align: 'center',
            verticalAlign: 'middle',
            offsetX: 10,
            offsetY: 4
          });

          lodContainer.add(label);
        }
      }

      // 重新绘制图层
      if (tiledLatticeLayer.value) {
        tiledLatticeLayer.value.getNode().draw();
      }
    } catch (error) {
      console.error('生成LOD单元时发生错误:', error);
    }
  });
};

// 居中坐标系
const centerCoordinateSystem = () => {
  if (tiledGroup.value) {
    const node = tiledGroup.value.getNode();
    node.x(stageCenter.value.x);
    node.y(stageCenter.value.y);
  }
};

// 更新裁剪设置
const updateClipSettings = () => {
  // 重新绘制图层以应用裁剪
  if (tiledLatticeLayer.value) {
    tiledLatticeLayer.value.getNode().draw();
  }
};

// 重写渲染到画布的方法，使用拼接方式实现完整重复
const renderToCanvas = async (ctx, options = {}) => {
  const {
    width,
    height,
    targetSize = 512, // 目标尺寸（像素）
    repeatCount = 1, // 重复次数
    hideExtras = true,
    rectTileable = true
  } = options;

  try {
    console.log('开始渲染到画布, 目标尺寸:', targetSize, '宽度:', width, '高度:', height, '重复次数:', repeatCount);

    // 获取当前图层和舞台
    const layerNode = tiledLatticeLayer.value?.getNode();
    const stage = layerNode?.getStage();
    if (!layerNode || !stage) {
      console.error('无法获取图层或舞台节点');
      return false;
    }






    // 获取单个无缝单元的尺寸
    const unitWidth = props.seamlessUnit.width;
    const unitHeight = props.seamlessUnit.height;
    console.log('无缝单元尺寸:', unitWidth, 'x', unitHeight);

    // 获取舞台当前状态
    const stageScale = props.currentScale / 100; // 当前缩放比例
    console.log('舞台当前缩放:', stageScale);

    // 第一步：先捕获单个完整重复单元

    // 记录所有需要临时修改的节点
    const nodesToRestore = [];

    if (hideExtras) {
      // 临时隐藏所有其他图层
      stage.getLayers().forEach(layer => {
        if (layer !== layerNode) {
          nodesToRestore.push({
            node: layer,
            prop: 'visible',
            value: layer.visible()
          });
          layer.visible(false);
        }
      });

      // 临时隐藏绘图层中除tiledGroup外的所有组
      if (tiledGroup.value) {
        const targetNode = tiledGroup.value.getNode();
        layerNode.children.forEach(child => {
          if (child !== targetNode) {
            nodesToRestore.push({
              node: child,
              prop: 'visible',
              value: child.visible()
            });
            child.visible(false);
          }
        });
      }

      // 隐藏tiledGroup中的特殊元素
      if (tiledGroup.value) {
        const targetNode = tiledGroup.value.getNode();
        const hideNode = (node) => {
          if (!node || !node.children) return;

          node.children.forEach(child => {
            const name = child.name() || '';
            const attrs = child.attrs || {};

            // 检查是否为辅助元素（网格、标签、指南等）
            const isHelper =
              name.includes('grid') ||
              name.includes('helper') ||
              name.includes('guideline') ||
              name.includes('label') ||
              name.includes('marker') ||
              name.includes('line') ||
              name.includes('boundary') ||
              (attrs.id && (
                attrs.id.includes('grid') ||
                attrs.id.includes('helper') ||
                attrs.id.includes('guideline') ||
                attrs.id.includes('lod') ||
                attrs.id.includes('text')
              ));

            // 如果是辅助元素，隐藏它
            if (isHelper) {
              nodesToRestore.push({
                node: child,
                prop: 'visible',
                value: child.visible()
              });
              child.visible(false);
            }

            // 递归检查子节点
            if (child.children && child.children.length > 0) {
              hideNode(child);
            }
          });
        };

        hideNode(targetNode);
      }

      // 强制隐藏LOD单元容器
      if (lodUnitsContainer.value) {
        const node = lodUnitsContainer.value.getNode();
        if (node) {
          nodesToRestore.push({
            node: node,
            prop: 'visible',
            value: node.visible()
          });
          node.visible(false);
        }
      }

      // 强制确保无缝单元边界框和其他辅助图层不可见
      stage.find('.seamlessUnitRect, #seamlessUnitLayer, #gridLayer, #latticeVectorLayer, .label, .marker, Text').forEach(node => {
        if (node) {
          nodesToRestore.push({
            node: node,
            prop: 'visible',
            value: node.visible()
          });
          node.visible(false);
        }
      });
    }

    // 计算舞台中心点
    const centerX = props.stageWidth / 2;
    const centerY = props.stageHeight / 2;

    // 计算单个无缝单元的捕获区域
    const captureX = centerX - (unitWidth / 2 * stageScale);
    const captureY = centerY - (unitHeight / 2 * stageScale);
    const captureWidth = unitWidth * stageScale;
    const captureHeight = unitHeight * stageScale;

    console.log('单个单元捕获区域:', captureX, captureY, captureWidth, captureHeight);

    // 计算单个单元需要的缩放因子
    // 我们先计算出单元的目标尺寸，然后再计算缩放因子
    const singleUnitTargetSize = targetSize / repeatCount;
    const shortSide = Math.min(unitWidth, unitHeight);
    const scaleFactor = singleUnitTargetSize / (shortSide * stageScale);
    console.log('单个单元的缩放因子:', scaleFactor);

    // 捕获舞台内容前先更新
    stage.batchDraw();


    if (!props.seamlessUnit) {
      console.error('无缝单元信息缺失');
      return false;
    }
    if (!rectTileable) {
      console.log('使用直接渲染模式（不平铺）');

      // 先调用 generateTiledImages 以更新渲染范围
      await generateTiledImages();

      // 获取整个图层的尺寸范围
      const tiledNode = tiledGroup.value?.getNode();
      if (!tiledNode) {
        console.error('找不到tiled group节点');
        return false;
      }

      // 获取图层范围，确保我们捕获所有可见内容
      const layerBox = tiledNode.getClientRect({ skipTransform: false });
      console.log('图层原始尺寸:', layerBox);

      // 计算合适的像素比率，确保捕获的图像足够大以填满目标尺寸
      // 使用较大的缩放因子以确保质量
      const basePixelRatio = Math.max(width, height) / Math.max(layerBox.width, layerBox.height);
      // 增加一个额外的系数以确保覆盖更多区域
      const pixelRatio = basePixelRatio * 2; // 增加到2倍以确保边缘质量

      console.log('使用像素比率:', pixelRatio);

      // 扩展捕获区域，确保没有内容被裁剪
      const paddingFactor = -0.25; // 增加到25%的边距
      const expandedWidth = layerBox.width * (1 + paddingFactor);
      const expandedHeight = layerBox.height * (1 + paddingFactor);
      const expandedX = layerBox.x - (expandedWidth - layerBox.width) / 2;
      const expandedY = layerBox.y - (expandedHeight - layerBox.height) / 2;

      console.log('扩展后的捕获区域:', expandedX, expandedY, expandedWidth, expandedHeight);

      // 直接捕获整个区域
      const dataURL = stage.toDataURL({
        x: expandedX,
        y: expandedY,
        width: expandedWidth,
        height: expandedHeight,
        pixelRatio: pixelRatio,
        mimeType: 'image/png', // 确保使用无损格式
        quality: 1 // 最高质量
      });

      // 恢复所有修改的节点
      nodesToRestore.forEach(item => {
        item.node[item.prop](item.value);
      });

      // 更新舞台以恢复显示
      stage.batchDraw();

      // 创建临时图像并加载捕获的内容
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = (e) => {
          console.error('加载捕获图像失败:', e);
          reject(e);
        };
        img.src = dataURL;
      });

      // 清除目标画布并填充白色背景
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);

      // 使用更平滑的图像绘制算法
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // 绘制到目标画布，调整大小为所需的最终尺寸
      ctx.drawImage(img, 0, 0, width, height);

      console.log('直接渲染完成');
      return true;
    }



    // 捕获单个无缝单元
    const singleUnitDataURL = stage.toDataURL({
      x: captureX,
      y: captureY,
      width: captureWidth,
      height: captureHeight,
      pixelRatio: scaleFactor
    });

    // 恢复所有修改的节点
    nodesToRestore.forEach(item => {
      item.node[item.prop](item.value);
    });

    // 更新舞台以恢复显示
    stage.batchDraw();

    // 创建临时图像加载单个无缝单元
    const singleUnitImg = new Image();
    await new Promise((resolve, reject) => {
      singleUnitImg.onload = resolve;
      singleUnitImg.onerror = (e) => {
        console.error('加载单个无缝单元图像失败:', e);
        reject(e);
      };
      singleUnitImg.src = singleUnitDataURL;
    });

    // 第二步：创建一个临时canvas来拼接重复单元

    // 计算单个无缝单元的实际尺寸（捕获后）
    const singleUnitFinalWidth = singleUnitImg.width;
    const singleUnitFinalHeight = singleUnitImg.height;
    console.log('单个无缝单元的实际尺寸:', singleUnitFinalWidth, 'x', singleUnitFinalHeight);

    // 创建临时canvas用于拼接
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = singleUnitFinalWidth * repeatCount;
    tempCanvas.height = singleUnitFinalHeight * repeatCount;
    const tempCtx = tempCanvas.getContext('2d');

    // 使用白色填充背景
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // 拼接无缝单元
    for (let i = 0; i < repeatCount; i++) {
      for (let j = 0; j < repeatCount; j++) {
        tempCtx.drawImage(
          singleUnitImg,
          i * singleUnitFinalWidth,
          j * singleUnitFinalHeight,
          singleUnitFinalWidth,
          singleUnitFinalHeight
        );
      }
    }

    // 第三步：将拼接结果绘制到目标画布

    // 清除目标画布并填充白色背景
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // 绘制到目标画布，调整大小为所需的最终尺寸
    ctx.drawImage(tempCanvas, 0, 0, width, height);

    console.log('渲染到画布完成');
    return true;
  } catch (error) {
    console.error('渲染到画布时出错:', error);
    return false;
  }
};

// 暴露方法给父组件
defineExpose({
  centerCoordinateSystem,
  getNode: () => tiledLatticeLayer.value?.getNode(),
  generateTiledImages,
  updateBlendMode,
  updateClipSettings,
  renderToCanvas
});

onMounted(() => {
  centerCoordinateSystem();

  // 根据当前模式选择初始化方法
  if (props.useLowDetailMode) {
    generateLodUnits();
  } else {
    generateTiledImages();
  }

  // 监听图像加载完成事件
  watch(() => props.rasterImages, (newImages) => {
    // 确保所有图像都已加载
    const allImagesLoaded = newImages.every(img => img.config && img.config.image);
    if (allImagesLoaded) {
      generateTiledImages();
    }
  }, { deep: true, immediate: true });
});
</script>