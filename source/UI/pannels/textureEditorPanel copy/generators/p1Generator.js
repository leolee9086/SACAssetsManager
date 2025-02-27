import { loadImagesWithDefaults } from "./utils/image.js";
import { findClipPath } from "./utils/unitUtils.js";
 
/**
 * 生成P1晶体学群体的几何图形和光栅图像
 * @param {number} spacing - 网格间距
 * @param {number} precision - 网格精度
 * @param {Object} options - 可选参数，包括晶格向量调整
 * @returns {Object} 包含几何图形、光栅图像和中心点的对象
 */
export const generateUnits = (spacing, precision, options = {}) => {
  // 计算单位长度
  const unitLength = spacing / precision;
  
  // 平行四边形的中心点
  const centerX = 0;
  const centerY = 0;
  
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
  
  // 根据晶格向量计算平行四边形的顶点
  // 规则：平行四边形的中心对齐原点，边长等于晶格向量长度
  const parallelogramVertices = [
    { // 左下顶点
      x: -latticeVectors[0].x/2 - latticeVectors[1].x/2, 
      y: -latticeVectors[0].y/2 - latticeVectors[1].y/2 
    },
    { // 右下顶点
      x: latticeVectors[0].x/2 - latticeVectors[1].x/2,
      y: latticeVectors[0].y/2 - latticeVectors[1].y/2
    },
    { // 右上顶点
      x: latticeVectors[0].x/2 + latticeVectors[1].x/2,
      y: latticeVectors[0].y/2 + latticeVectors[1].y/2
    },
    { // 左上顶点
      x: -latticeVectors[0].x/2 + latticeVectors[1].x/2,
      y: -latticeVectors[0].y/2 + latticeVectors[1].y/2
    }
  ];
  
  // 生成一个基本单元
  const geoms = [];
  const color = { fill: 'rgba(100,150,230,0.5)', stroke: 'rgba(70,120,200,0.8)', pointFill: 'rgba(70,120,200,0.8)' };
  
  geoms.push({
    id: 'baseUnit-1',
    type: 'baseUnit',
    color: color,
    vertices: [
      {
        id: 'vertex-1',
        x: parallelogramVertices[0].x,
        y: parallelogramVertices[0].y,
        labelOffsetX: -10,
        labelOffsetY: -10,
        label: `(${(parallelogramVertices[0].x / unitLength).toFixed(2)},${(parallelogramVertices[0].y / unitLength).toFixed(2)})`
      },
      {
        id: 'vertex-2',
        x: parallelogramVertices[1].x,
        y: parallelogramVertices[1].y,
        labelOffsetX: 10,
        labelOffsetY: -10,
        label: `(${(parallelogramVertices[1].x / unitLength).toFixed(2)},${(parallelogramVertices[1].y / unitLength).toFixed(2)})`
      },
      {
        id: 'vertex-3',
        x: parallelogramVertices[2].x,
        y: parallelogramVertices[2].y,
        labelOffsetX: 10,
        labelOffsetY: 10,
        label: `(${(parallelogramVertices[2].x / unitLength).toFixed(2)},${(parallelogramVertices[2].y / unitLength).toFixed(2)})`
      },
      {
        id: 'vertex-4',
        x: parallelogramVertices[3].x,
        y: parallelogramVertices[3].y,
        labelOffsetX: -10,
        labelOffsetY: 10,
        label: `(${(parallelogramVertices[3].x / unitLength).toFixed(2)},${(parallelogramVertices[3].y / unitLength).toFixed(2)})`
      }
    ],
    center: {
      label: '基本单元'
    },
    // 添加内部坐标轴
    internalAxes: {
      // 使用平行四边形的中心点
      center: {
        x: centerX+5,
        y: centerY
      },
      // 指向原点的向量（在P1中，原点就是中心）
      mainAxe: {
        x: 0,
        y: 0
      },
      // 坐标轴长度
      length: unitLength * 0.4,
      // 坐标轴颜色
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
   * 计算P1群体的变换参数
   * @returns {Object} 包含Konva兼容的变换参数
   */
  const calculateP1Transformation = () => {
    // P1群体只有平移对称性，没有旋转或反射
    return {
      rotation: 0,
      scaleY: 1,
      rotationAxisAngle: 0
    };
  };
  
  // 创建光栅图像
  const transformation = calculateP1Transformation();
  
  rasterImages.push({
    id: 'texture-1',
    label: '纹理',
    relatedGeom: 'baseUnit-1', // 关联到对应的单元
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
      draggable: true,
      shadowColor: 'black',
      shadowBlur: 5,
      shadowOpacity: 0.3,
      shadowOffsetX: 2,
      shadowOffsetY: 2,
      rotation: transformation.rotation, // 应用旋转变换（以度为单位）
      // 存储额外信息，不影响Konva渲染
      rotationAxisAngle: transformation.rotationAxisAngle
    }
  });
  
  // 更新图像位置，使其与对应单元的中心点对齐
  rasterImages.forEach(image => {
    const relatedCenter = centers.find(c => c.id === image.relatedGeom);
    if (relatedCenter) {
      image.config.x = relatedCenter.center.x;
      image.config.y = relatedCenter.center.y;
    }
  });
  
  
  // 计算P1晶格的无缝单元（就是基本平行四边形单元）
  const seamlessUnit = {
    id: 'seamless-unit',
    width: Math.abs(latticeVectors[0].x) + Math.abs(latticeVectors[1].x),
    height: Math.abs(latticeVectors[0].y) + Math.abs(latticeVectors[1].y),
    center: { x: 0, y: 0 },
    vertices: [
      { // 根据晶格向量计算四个顶点，确保覆盖完整的基本单元区域
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
    baseUnitCenters: centers, // 保持API兼容
    loadImagesWithDefaults,
    latticeVectors,
    calculateInternalOffset,
    seamlessUnit,
    findUnitClipPath: findClipPath,
    isAdjustable: true, // 声明晶格向量可调整
    vectorParams: { // 添加当前向量参数，方便控制面板读取
      vector1: { x: vector1.x, y: vector1.y },
      vector2: { x: vector2.x, y: vector2.y }
    },
    rectTileable: isRectTileable() // 添加矩形可平铺标志
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
  
  // 在P1中，坐标系是直角坐标系，所以直接返回偏移量
  return offset;
}; 