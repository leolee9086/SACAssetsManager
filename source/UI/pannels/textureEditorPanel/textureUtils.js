// 计算根号3/2的值
const sqrtThreeOverTwo = Math.sqrt(3) / 2;
import { loadImagesWithDefaults } from "./utils/image.js";
/**
 * 生成几何图形和光栅图像
 * @param {number} spacing - 网格间距
 * @param {number} precision - 网格精度
 * @returns {Object} 包含几何图形、光栅图像和三角形中心点的对象
 */
export const generateUnits = (spacing, precision) => {
  // 计算单位长度
  const unitLength = spacing / precision;
  
  // 正六边形的中心点
  const centerX = 0;
  const centerY = 0;
  
  // 正六边形的六个顶点
  const hexagonVertices = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const x = centerX + unitLength * Math.cos(angle);
    const y = centerY + unitLength * Math.sin(angle);
    hexagonVertices.push({ x, y });
  }
  
  // 生成六个三角形
  const geoms = [];
  const colors = [
    { fill: 'rgba(100,150,230,0.5)', stroke: 'rgba(70,120,200,0.8)', pointFill: 'rgba(70,120,200,0.8)' },
    { fill: 'rgba(230,150,100,0.5)', stroke: 'rgba(200,120,70,0.8)', pointFill: 'rgba(200,120,70,0.8)' },
    { fill: 'rgba(100,230,150,0.5)', stroke: 'rgba(70,200,120,0.8)', pointFill: 'rgba(70,200,120,0.8)' },
    { fill: 'rgba(230,100,150,0.5)', stroke: 'rgba(200,70,120,0.8)', pointFill: 'rgba(200,70,120,0.8)' },
    { fill: 'rgba(150,100,230,0.5)', stroke: 'rgba(120,70,200,0.8)', pointFill: 'rgba(120,70,200,0.8)' },
    { fill: 'rgba(150,230,100,0.5)', stroke: 'rgba(120,200,70,0.8)', pointFill: 'rgba(120,200,70,0.8)' }
  ];
  
  for (let i = 0; i < 6; i++) {
    const nextIndex = (i + 1) % 6;
    
    // 创建从中心点到两个相邻顶点的三角形
    geoms.push({
      id: `triangle-${i+1}`,
      type: 'triangle',
      color: colors[i],
      vertices: [
        {
          id: `vertex-center`,
          x: centerX,
          y: centerY,
          labelOffsetX: 0,
          labelOffsetY: 0,
          label: '(0,0)'
        },
        {
          id: `vertex-${i}`,
          x: hexagonVertices[i].x,
          y: hexagonVertices[i].y,
          labelOffsetX: 10 * Math.cos(Math.PI / 3 * i),
          labelOffsetY: 10 * Math.sin(Math.PI / 3 * i),
          label: `(${Math.cos(Math.PI / 3 * i).toFixed(1)},${Math.sin(Math.PI / 3 * i).toFixed(1)})`
        },
        {
          id: `vertex-${nextIndex}`,
          x: hexagonVertices[nextIndex].x,
          y: hexagonVertices[nextIndex].y,
          labelOffsetX: 10 * Math.cos(Math.PI / 3 * nextIndex),
          labelOffsetY: 10 * Math.sin(Math.PI / 3 * nextIndex),
          label: `(${Math.cos(Math.PI / 3 * nextIndex).toFixed(1)},${Math.sin(Math.PI / 3 * nextIndex).toFixed(1)})`
        }
      ],
      center: {
        label: `三角形${i+1}`
      },
      // 添加内部坐标轴
      internalAxes: {
        // 计算三角形中心点
        center: {
          x: (centerX + hexagonVertices[i].x + hexagonVertices[nextIndex].x) / 3,
          y: (centerY + hexagonVertices[i].y + hexagonVertices[nextIndex].y) / 3
        },
        // 指向原点的向量
        toOrigin: {
          x: centerX - (centerX + hexagonVertices[i].x + hexagonVertices[nextIndex].x) / 3,
          y: centerY - (centerY + hexagonVertices[i].y + hexagonVertices[nextIndex].y) / 3
        },
        // 坐标轴长度（可以根据需要调整）
        length: unitLength * 0.4,
        // 坐标轴颜色
        color: 'rgba(0,0,0,0.7)'
      }
    });
  }
  
  // 计算三角形中心点
  const calculateTriangleCenter = (vertices) => {
    const centerX = vertices.reduce((sum, vertex) => sum + vertex.x, 0) / vertices.length;
    const centerY = vertices.reduce((sum, vertex) => sum + vertex.y, 0) / vertices.length;
    return { x: centerX, y: centerY };
  };
  
  // 计算所有三角形的中心点
  const triangleCenters = geoms.map(geom => {
    if (geom.type === 'triangle') {
      return {
        id: geom.id,
        center: calculateTriangleCenter(geom.vertices)
      };
    }
    return null;
  }).filter(item => item !== null);
  
  // 生成光栅图像
  const rasterImages = [];
  
  /**
   * 计算沿特定轴的镜像变换参数
   * @param {number} i - 三角形索引
   * @returns {Object} 包含Konva兼容的变换参数
   */
  const calculateMirrorTransformation = (i) => {
    // P3M1群中的旋转角度计算
    // 将六个三角形分为三组（0-1, 2-3, 4-5）
    // 每组中，偶数索引不旋转，奇数索引旋转120度
    // 然后在此基础上，加上120*组别
    
    const groupIndex = Math.floor(i / 2); // 确定组别（0, 1, 2）
    const baseGroupRotation = groupIndex * 120; // 组基础旋转（0, 120, 240）
    const inGroupRotation = i % 2 === 0 ? 0 : 120; // 组内旋转（偶数0度，奇数120度）
    
    const rotation = (baseGroupRotation + inGroupRotation) % 360;
    
    // 对于奇数索引的三角形，我们需要应用镜像变换
    if (i % 2 === 1) {
      return {
        rotation: rotation, // Konva中的旋转角度（以度为单位）
        scaleY: -1,         // 垂直翻转
        mirrorAxisAngle: (i * 60 + 30) % 360 // 镜像轴角度（以度为单位）
      };
    } else {
      // 偶数索引的三角形不需要镜像
      return {
        rotation: rotation,
        scaleY: 1,
        mirrorAxisAngle: (i * 60 + 30) % 360
      };
    }
  };
  
  // 为每个三角形创建一个对应的光栅图像
  for (let i = 0; i < 6; i++) {
    // 获取镜像变换参数
    const transformation = calculateMirrorTransformation(i);
    
    rasterImages.push({
      id: `texture-${i+1}`,
      label: `纹理${i+1}`,
      relatedGeom: `triangle-${i+1}`, // 关联到对应的三角形
      labelOffsetX: 0,
      labelOffsetY: -20,
      config: {
        x: 0, // 将在后面更新
        y: 0, // 将在后面更新
        image: null, // 将在loadImages中加载
        width: 60,
        height: 60,
        offsetX: 30, // 设置图像中心点为参考点
        offsetY: 30, // 设置图像中心点为参考点
        opacity: 0.8,
        draggable: true,
        shadowColor: 'black',
        shadowBlur: 5,
        shadowOpacity: 0.3,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        scaleY: transformation.scaleY, // 应用镜像变换
        rotation: transformation.rotation, // 应用旋转变换（以度为单位）
        // 存储额外信息，不影响Konva渲染
        mirrorAxisAngle: transformation.mirrorAxisAngle
      }
    });
  }
  
  // 更新图像位置，使其与对应三角形的中心点对齐
  rasterImages.forEach(image => {
    const relatedCenter = triangleCenters.find(c => c.id === image.relatedGeom);
    if (relatedCenter) {
      image.config.x = relatedCenter.center.x;
      image.config.y = relatedCenter.center.y;
    }
  });
  
  // 计算晶格向量
  // 对于六边形结构，我们使用两个非共线的向量来表示晶格
  // 这些向量将允许通过整数线性组合来平铺整个平面
  const latticeVectors = [
    {
      id: 'lattice-vector-1',
      x: unitLength * 1.5,                // 第一个晶格向量的x分量
      y: unitLength * sqrtThreeOverTwo,   // 第一个晶格向量的y分量
      label: '晶格向量1'
    },
    {
      id: 'lattice-vector-2',
      x: 0,                               // 第二个晶格向量的x分量
      y: unitLength * sqrtThreeOverTwo * 2, // 第二个晶格向量的y分量
      label: '晶格向量2'
    }
  ];
  
  // 计算P3M1晶格的最小正交平移重复单元（无缝单元）
  const seamlessUnit = {
    id: 'seamless-unit',
    // 以原点为中心的矩形
    width: unitLength * 3,  // 宽度为3个单位长度
    height: unitLength * sqrtThreeOverTwo * 2, // 高度为根号3个单位长度
    center: { x: 0, y: 0 }, // 中心点在原点
    // 矩形的四个顶点
    vertices: [
      { x: -unitLength * 1.5, y: -unitLength * sqrtThreeOverTwo }, // 左下
      { x: unitLength * 1.5, y: -unitLength * sqrtThreeOverTwo },  // 右下
      { x: unitLength * 1.5, y: unitLength * sqrtThreeOverTwo },   // 右上
      { x: -unitLength * 1.5, y: unitLength * sqrtThreeOverTwo }   // 左上
    ],
    color: {
      stroke: 'rgba(255,0,0,0.8)',
      fill: 'rgba(255,0,0,0.1)'
    },
    label: '无缝单元'
  };
  
  return {
    geoms,
    rasterImages,
    triangleCenters,
    loadImagesWithDefaults,
    latticeVectors,
    calculateInternalOffset,
    seamlessUnit  // 添加无缝单元到返回对象
  };
};

/**
 * 计算内部坐标系中的偏移
 * @param {Object} geom - 几何图形对象
 * @param {Object} image - 图像对象
 * @param {Object} offset - 偏移量 {x, y}
 * @returns {Object} 计算后的偏移量 {x, y}
 */
export const calculateInternalOffset = (geom, image, offset) => {
  if (!geom || !geom.internalAxes) {
    // 如果没有内部坐标轴信息，则返回原始偏移
    return offset;
  }
  
  // 获取指向原点的向量
  const toOrigin = geom.internalAxes.toOrigin;
  
  // 计算指向原点的单位向量（这是内部Y轴的方向，因为Y轴偏移减小时图像向原点移动）
  const magnitude = Math.sqrt(toOrigin.x * toOrigin.x + toOrigin.y * toOrigin.y);
  const yAxis = {
    x: toOrigin.x / magnitude,
    y: toOrigin.y / magnitude
  };
  
  // 计算X轴方向（垂直于Y轴，顺时针旋转90度）
  let xAxis = {
    x: yAxis.y,
    y: -yAxis.x
  };
  
  // 根据三角形ID判断是否需要镜像X轴
  // 假设三角形ID格式为 "triangle-N"，其中N是三角形的编号
  if (geom.id && typeof geom.id === 'string') {
    const match = geom.id.match(/triangle-(\d+)/);
    if (match && match[1]) {
      const triangleNumber = parseInt(match[1], 10);
      
      // 如果是单数三角形，镜像X轴
      if (triangleNumber % 2 === 1) {
        xAxis.x = -xAxis.x;
        xAxis.y = -xAxis.y;
      }
    }
  }
  
  // 应用X和Y轴偏移
  const result = {
    x: offset.x * xAxis.x + offset.y * yAxis.x,
    y: offset.x * xAxis.y + offset.y * yAxis.y
  };
  
  // 输出调试信息
  
  return result;
};

/**
 * 创建三角形裁剪蒙版
 * @param {number} triangleIndex - 三角形编号（1-6）
 * @param {number} unitLength - 单位长度
 * @param {number} width - 画布宽度
 * @param {number} height - 画布高度
 * @returns {Object} Konva兼容的蒙版配置
 */
export const createTriangleMask = (triangleIndex, unitLength, width, height) => {
  // 确保三角形编号在有效范围内
  if (triangleIndex < 1 || triangleIndex > 6) {
    console.error('三角形编号必须在1到6之间');
    return null;
  }
  
  // 画布中心点
  const centerX = width / 2;
  const centerY = height / 2;
  
  // 计算正六边形的六个顶点
  const hexagonVertices = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const x = centerX + unitLength * Math.cos(angle);
    const y = centerY + unitLength * Math.sin(angle);
    hexagonVertices.push({ x, y });
  }
  
  // 计算目标三角形的顶点
  const index = triangleIndex - 1; // 转换为0-5的索引
  const nextIndex = (index + 1) % 6;
  
  // 创建三角形路径
  return {
    x: 0,
    y: 0,
    points: [
      centerX, centerY, // 中心点
      hexagonVertices[index].x, hexagonVertices[index].y, // 第一个顶点
      hexagonVertices[nextIndex].x, hexagonVertices[nextIndex].y // 第二个顶点
    ],
    closed: true
  };
};

/**
 * 创建无缝单元裁剪蒙版
 * @param {number} unitLength - 单位长度
 * @param {number} width - 画布宽度
 * @param {number} height - 画布高度
 * @returns {Object} Konva兼容的蒙版配置
 */
export const createSeamlessUnitMask = (unitLength, width, height) => {
  // 画布中心点
  const centerX = width / 2;
  const centerY = height / 2;
  
  // 计算无缝单元的四个顶点（矩形）
  const rectWidth = unitLength * 3;
  const rectHeight = unitLength * sqrtThreeOverTwo * 2;
  
  return {
    x: centerX - rectWidth / 2,
    y: centerY - rectHeight / 2,
    width: rectWidth,
    height: rectHeight
  };
};
