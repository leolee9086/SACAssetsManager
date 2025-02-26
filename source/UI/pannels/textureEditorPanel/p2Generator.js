import { loadImagesWithDefaults } from "./utils/image.js";
import { findClipPath } from "./utils/unitUtils.js";



/**
 * 生成P2晶体学群体的几何图形和光栅图像
 * @param {number} spacing - 网格间距
 * @param {number} precision - 网格精度
 * @param {Object} options - 可选参数，包括晶格向量调整
 * @returns {Object} 包含几何图形、光栅图像和中心点的对象
 */
export const generateUnits = (spacing, precision, options = {}) => {
  // 计算单位长度
  const unitLength = spacing / precision;
  
  // 从选项中获取晶格向量参数或使用默认值
  const vector1 = options.vector1 || { x: 0.8, y: 0.2 };
  const vector2 = options.vector2 || { x: 0.3, y: 0.7 };
  
  // 生成晶格向量，应用自定义值
  const latticeVectors = [
    {
      id: 'lattice-vector-1',
      x: unitLength * vector1.x,  
      y: unitLength * vector1.y,  
      label: '晶格向量1'
    },
    {
      id: 'lattice-vector-2',
      x: unitLength * vector2.x,  
      y: unitLength * vector2.y,  
      label: '晶格向量2'
    }
  ];
  
  // 生成两个基本单元（P2有两个相关联的单元，通过180度旋转）
  const geoms = [];
  const color1 = { fill: 'rgba(100,150,230,0.5)', stroke: 'rgba(70,120,200,0.8)', pointFill: 'rgba(70,120,200,0.8)' };
  const color2 = { fill: 'rgba(230,150,100,0.5)', stroke: 'rgba(200,120,70,0.8)', pointFill: 'rgba(200,120,70,0.8)' };
  
  // 计算基础单元的顶点
  // 基础单元1：一边长为晶格向量1的四分之一，另一边长为晶格向量2的一半
  // 两个单元共享边的中点位于原点
  const commonEdgeVector = {
    x: latticeVectors[0].x / 2,
    y: latticeVectors[0].y / 2
  };
  
  const perpVector = {
    x: latticeVectors[1].x / 2,
    y: latticeVectors[1].y / 2
  };
  
  // 第一个基本单元的顶点
  const unit1Vertices = [
    {
      id: 'vertex-1',
      x: -commonEdgeVector.x - perpVector.x,
      y: -commonEdgeVector.y - perpVector.y,
      labelOffsetX: -10,
      labelOffsetY: -10,
      label: `(${(-commonEdgeVector.x - perpVector.x) / unitLength.toFixed(2)},${(-commonEdgeVector.y - perpVector.y) / unitLength.toFixed(2)})`
    },
    {
      id: 'vertex-2',
      x: commonEdgeVector.x - perpVector.x,
      y: commonEdgeVector.y - perpVector.y,
      labelOffsetX: 10,
      labelOffsetY: -10,
      label: `(${(commonEdgeVector.x - perpVector.x) / unitLength.toFixed(2)},${(commonEdgeVector.y - perpVector.y) / unitLength.toFixed(2)})`
    },
    {
      id: 'vertex-3',
      x: commonEdgeVector.x,
      y: commonEdgeVector.y,
      labelOffsetX: 10,
      labelOffsetY: 10,
      label: `(${(commonEdgeVector.x) / unitLength.toFixed(2)},${(commonEdgeVector.y) / unitLength.toFixed(2)})`
    },
    {
      id: 'vertex-4',
      x: -commonEdgeVector.x,
      y: -commonEdgeVector.y,
      labelOffsetX: -10,
      labelOffsetY: 10,
      label: `(${(-commonEdgeVector.x) / unitLength.toFixed(2)},${(-commonEdgeVector.y) / unitLength.toFixed(2)})`
    }
  ];
  
  // 第二个基本单元的顶点（通过180度旋转）
  const unit2Vertices = [
    {
      id: 'vertex-1-rotated',
      x: -unit1Vertices[0].x,
      y: -unit1Vertices[0].y,
      labelOffsetX: 10,
      labelOffsetY: 10,
      label: `(${(-unit1Vertices[0].x / unitLength).toFixed(2)},${(-unit1Vertices[0].y / unitLength).toFixed(2)})`
    },
    {
      id: 'vertex-2-rotated',
      x: -unit1Vertices[1].x,
      y: -unit1Vertices[1].y,
      labelOffsetX: -10,
      labelOffsetY: 10,
      label: `(${(-unit1Vertices[1].x / unitLength).toFixed(2)},${(-unit1Vertices[1].y / unitLength).toFixed(2)})`
    },
    {
      id: 'vertex-3-rotated',
      x: -unit1Vertices[2].x,
      y: -unit1Vertices[2].y,
      labelOffsetX: -10,
      labelOffsetY: -10,
      label: `(${(-unit1Vertices[2].x / unitLength).toFixed(2)},${(-unit1Vertices[2].y / unitLength).toFixed(2)})`
    },
    {
      id: 'vertex-4-rotated',
      x: -unit1Vertices[3].x,
      y: -unit1Vertices[3].y,
      labelOffsetX: 10,
      labelOffsetY: -10,
      label: `(${(-unit1Vertices[3].x / unitLength).toFixed(2)},${(-unit1Vertices[3].y / unitLength).toFixed(2)})`
    }
  ];
  
  // 第一个基本单元
  geoms.push({
    id: 'baseUnit-1',
    type: 'baseUnit',
    color: color1,
    vertices: unit1Vertices,
    center: {
      label: '基本单元1'
    },
    // 添加内部坐标轴
    internalAxes: {
      center: {
        x: 0,
        y: 0
      },
      toOrigin: {
        x: 0,
        y: 0
      },
      length: unitLength * 0.4,
      color: 'rgba(0,0,0,0.7)'
    }
  });
  
  // 第二个基本单元
  geoms.push({
    id: 'baseUnit-2',
    type: 'baseUnit',
    color: color2,
    vertices: unit2Vertices,
    center: {
      label: '基本单元2'
    },
    // 添加内部坐标轴
    internalAxes: {
      center: {
        x: 0,
        y: 0
      },
      toOrigin: {
        x: 0,
        y: 0
      },
      length: unitLength * 0.4,
      color: 'rgba(0,0,0,0.7)'
    }
  });
  
  // 计算单元的中心点
  const calculateCenter = (vertices) => {
    const centerX = vertices.reduce((sum, vertex) => sum + vertex.x, 0) / vertices.length;
    const centerY = vertices.reduce((sum, vertex) => sum + vertex.y, 0) / vertices.length;
    return { x: centerX, y: centerY };
  };
  
  // 计算所有单元的中心点
  const centers = geoms.map(geom => {
    return {
      id: geom.id,
      center: calculateCenter(geom.vertices)
    };
  });
  
  // 生成光栅图像
  const rasterImages = [];
  
  /**
   * 计算P2群体的变换参数
   * @param {string} unitId - 单元ID
   * @returns {Object} 包含Konva兼容的变换参数
   */
  const calculateP2Transformation = (unitId) => {
    // P2群体有旋转对称性，第二个单元相对于第一个单元旋转180度
    if (unitId === 'baseUnit-2') {
      return {
        rotation: 180,  // 旋转180度
        scaleY: 1,
        rotationAxisAngle: 0
      };
    }
    
    // 第一个单元无变换
    return {
      rotation: 0,
      scaleY: 1,
      rotationAxisAngle: 0
    };
  };
  
  // 为每个单元创建光栅图像
  geoms.forEach((geom, index) => {
    const transformation = calculateP2Transformation(geom.id);
    
    rasterImages.push({
      id: `texture-${index + 1}`,
      label: `纹理${index + 1}`,
      relatedGeom: geom.id,
      labelOffsetX: 0,
      labelOffsetY: -20,
      config: {
        x: 0, // 将在后面更新
        y: 0, // 将在后面更新
        image: null, // 将在loadImages中加载
        width: 60,
        height: 60,
        offsetX: 30,
        offsetY: 30,
        draggable: true,
        shadowColor: 'black',
        shadowBlur: 5,
        shadowOpacity: 0.3,
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        rotation: transformation.rotation,
        rotationAxisAngle: transformation.rotationAxisAngle
      }
    });
  });
  
  // 更新图像位置，使其与对应单元的中心点对齐
  rasterImages.forEach(image => {
    const relatedCenter = centers.find(c => c.id === image.relatedGeom);
    if (relatedCenter) {
      image.config.x = relatedCenter.center.x;
      image.config.y = relatedCenter.center.y;
    }
  });
  
  // 计算P2晶格的无缝单元（与P1相同，因为基础晶格没变）
  const seamlessUnit = {
    id: 'seamless-unit',
    width: Math.abs(latticeVectors[0].x) + Math.abs(latticeVectors[1].x),
    height: Math.abs(latticeVectors[0].y) + Math.abs(latticeVectors[1].y),
    center: { x: 0, y: 0 },
    vertices: [
      {
        x: -Math.abs(latticeVectors[0].x)/2 - Math.abs(latticeVectors[1].x)/2,
        y: -Math.abs(latticeVectors[0].y)/2 - Math.abs(latticeVectors[1].y)/2
      },
      {
        x: Math.abs(latticeVectors[0].x)/2 + Math.abs(latticeVectors[1].x)/2,
        y: -Math.abs(latticeVectors[0].y)/2 - Math.abs(latticeVectors[1].y)/2
      },
      {
        x: Math.abs(latticeVectors[0].x)/2 + Math.abs(latticeVectors[1].x)/2,
        y: Math.abs(latticeVectors[0].y)/2 + Math.abs(latticeVectors[1].y)/2
      },
      {
        x: -Math.abs(latticeVectors[0].x)/2 - Math.abs(latticeVectors[1].x)/2,
        y: Math.abs(latticeVectors[0].y)/2 + Math.abs(latticeVectors[1].y)/2
      }
    ],
    color: {
      stroke: 'rgba(255,0,0,0.8)',
      fill: 'rgba(255,0,0,0.1)'
    },
    label: '无缝单元'
  };
  
  // 计算两个晶格向量是否可以形成矩形（互相垂直或与坐标轴平行）
  const isRectTileable = () => {
    // 检查向量是否互相垂直（点积为0）
    const dotProduct = latticeVectors[0].x * latticeVectors[1].x + 
                      latticeVectors[0].y * latticeVectors[1].y;
    
    // 考虑浮点误差，使用小阈值
    const epsilon = 0.001;
    
    // 检查是否与坐标轴平行（x或y分量为0）
    const isAxisAligned = 
      (Math.abs(latticeVectors[0].x) < epsilon || Math.abs(latticeVectors[0].y) < epsilon) && 
      (Math.abs(latticeVectors[1].x) < epsilon || Math.abs(latticeVectors[1].y) < epsilon);
    
    return Math.abs(dotProduct) < epsilon || isAxisAligned;
  };
  
  return {
    geoms,
    rasterImages,
    baseUnitCenters: centers,
    loadImagesWithDefaults,
    latticeVectors,
    calculateInternalOffset,
    seamlessUnit,
    findUnitClipPath: findClipPath,
    isAdjustable: true, // 晶格向量可调整
    vectorParams: { // 添加当前向量参数
      vector1: { x: vector1.x, y: vector1.y },
      vector2: { x: vector2.x, y: vector2.y }
    },
    rectTileable: isRectTileable() // 矩形可平铺标志
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
    return offset;
  }
  
  // 在P2中，对于第二个单元需要考虑180度旋转
  if (geom.id === 'baseUnit-2') {
    // 180度旋转意味着x和y坐标都反向
    return { x: -offset.x, y: -offset.y };
  }
  
  // 对于第一个单元，与P1相同，直接返回偏移量
  return offset;
}; 