// 导入常量和基础查表函数
import { 
  LOD_THRESHOLDS, 
  GRID_SIZE_FACTORS, 
  getLODLevel, 
  getLODGridSize 
} from './lodTables.js';

// 导出从lodTables导入的函数和常量（以便保持API兼容性）
export { 
  getLODLevel, 
  getLODGridSize 
};

/**
 * 计算当前的LOD级别
 * @param {Object} viewState 当前视图状态
 * @param {Object} props 组件属性
 * @returns {Number} 计算出的LOD级别
 */
export const calculateLodLevel = (viewState, props) => {
  // 移除调试日志
  // 使用对数缩放来处理任意大小的缩放值
  let lodLevel = 0;
  
  if (viewState.scale > 0) {
    // 方法1: 使用已定义的LOD阈值表 - 更一致且可配置
    for (const entry of LOD_THRESHOLDS) {
      if (viewState.scale <= entry.threshold) {
        lodLevel = entry.level;
        break;
      }
    }
    
    // 方法2: 对数计算 (作为备选方案)
    if (props.useLodLog === true) {
      lodLevel = Math.floor(-Math.log10(viewState.scale));
      if (lodLevel < 0) lodLevel = 0;
    }
  }
  
  // 应用LOD级别约束
  return Math.max(props.minLodLevel || 0, Math.min(props.maxLodLevel || 6, lodLevel));
};

/**
 * 检查元素是否应该显示（基于自动LOD或手动LOD）
 * @param {Object} element 要检查的元素
 * @param {Object} viewState 当前视图状态
 * @param {Object} props 组件属性
 * @returns {Object} 包含可见性和透明度信息的对象 {visible: Boolean, opacity: Number, reason: String}
 */
export const shouldElementBeVisible = (element, viewState, props) => {
  // 初始化返回值对象，默认元素原始透明度或1.0
  const result = {
    visible: false,
    opacity: element.opacity !== undefined ? element.opacity : 1.0,
    reason: '未评估'
  };
  
  // 情况1：如果禁用了LOD功能，则所有元素都应该显示
  if (!props.enableLod) {
    result.visible = true;
    result.reason = 'LOD已禁用';
    console.log(`元素 ${element.id || '未知ID'} (${element.type}): 可见 - LOD已禁用`);
    return result;
  }
  
  // 情况2：如果元素被手动隐藏，则隐藏它
  if (element.manuallyHidden === true) {
    result.reason = '手动隐藏';
    console.log(`元素 ${element.id || '未知ID'} (${element.type}): 不可见 - 手动隐藏`);
    return result;
  }
  
  // 情况3：如果元素是系统元素，则总是显示
  if (element.isSystemElement === true) {
    result.visible = true;
    result.reason = '系统元素';
    console.log(`元素 ${element.id || '未知ID'} (${element.type}): 可见 - 系统元素`);
    return result;
  }
  
  // 情况4：处理元素自定义LOD范围 - 直接基于缩放值
  if (element.lodRange || element.lodMinScale !== undefined) {
    // 获取缩放范围，直接从元素或lodRange中获取
    const minScale = element.lodMinScale !== undefined ? element.lodMinScale : 
                    (element.lodRange?.minScale === -Infinity ? 0 : element.lodRange?.minScale);
    
    const maxScale = element.lodMaxScale !== undefined ? element.lodMaxScale : 
                    (element.lodRange?.maxScale === Infinity ? Number.MAX_VALUE : element.lodRange?.maxScale);
    
    // 直接比较缩放值
    const currentScale = viewState.scale;
    
    console.log(`元素 ${element.id || '未知ID'} (${element.type}) LOD范围检查: 当前缩放=${currentScale.toExponential(4)}, 最小=${minScale}, 最大=${maxScale}`);
    
    // 检查是否启用渐进渐出效果
    const transitionType = element.lodTransitionType;
    
    if (transitionType === 'fade') {
      // 计算缩放边界过渡区域的透明度
      const scaleOpacity = calculateScaleTransitionOpacity(currentScale, minScale, maxScale);
      
      // 元素在任何缩放范围内都"可见"，但透明度可能为0
      result.visible = scaleOpacity > 0;
      // 将缩放透明度与元素自身透明度相乘
      result.opacity *= scaleOpacity;
      
      if (result.visible) {
        result.reason = '在LOD范围内(渐变)';
        console.log(`元素 ${element.id || '未知ID'} (${element.type}): 可见(透明度=${result.opacity.toFixed(2)}) - LOD范围内渐变`);
      } else {
        result.reason = '超出LOD范围(渐变)';
        console.log(`元素 ${element.id || '未知ID'} (${element.type}): 不可见 - 超出LOD范围(渐变)`);
      }
      
      return result;
    } else {
      // 没有过渡效果的情况 - 简单的范围检查
      result.visible = currentScale >= minScale && currentScale <= maxScale;
      
      if (result.visible) {
        result.reason = '在LOD范围内';
        console.log(`元素 ${element.id || '未知ID'} (${element.type}): 可见 - 在LOD范围内`);
      } else {
        result.reason = '超出LOD范围';
        console.log(`元素 ${element.id || '未知ID'} (${element.type}): 不可见 - 超出LOD范围(最小=${minScale}, 最大=${maxScale}, 当前=${currentScale.toExponential(4)})`);
      }
      
      return result;
    }
  }
  
  // 情况5：针对极端缩放值的特殊处理
  if (viewState.scale < 1e-10 || viewState.scale > 1e10) {
    // 根据LOD级别而非直接尺寸计算来判断可见性
    const elementLod = calculateElementLodLevel(element);
    const currentLod = calculateLodLevel(viewState, props);
    // 在当前LOD级别或相邻级别可见
    result.visible = Math.abs(elementLod - currentLod) <= 1;
    
    if (result.visible) {
      result.reason = '极端缩放值LOD级别匹配';
      console.log(`元素 ${element.id || '未知ID'} (${element.type}): 可见 - 极端缩放值LOD级别匹配(元素LOD=${elementLod}, 当前LOD=${currentLod})`);
    } else {
      result.reason = '极端缩放值LOD级别不匹配';
      console.log(`元素 ${element.id || '未知ID'} (${element.type}): 不可见 - 极端缩放值LOD级别不匹配(元素LOD=${elementLod}, 当前LOD=${currentLod})`);
    }
    
    return result;
  }
  
  // 情况6：基于元素屏幕大小的常规LOD处理
  const elementSize = calculateElementScreenSize(element, viewState, props);
  
  // 根据元素屏幕尺寸判断可见性
  // 如果元素尺寸大于或等于阈值，则显示它
  result.visible = elementSize >= props.lodThreshold;
  
  if (result.visible) {
    result.reason = '尺寸足够大';
    console.log(`元素 ${element.id || '未知ID'} (${element.type}): 可见 - 尺寸足够大(${elementSize.toFixed(2)} >= ${props.lodThreshold})`);
  } else {
    result.reason = '尺寸太小';
    console.log(`元素 ${element.id || '未知ID'} (${element.type}): 不可见 - 尺寸太小(${elementSize.toFixed(2)} < ${props.lodThreshold})`);
  }
  
  return result;
};

/**
 * 计算缩放过渡区域的透明度
 * @param {Number} currentScale 当前缩放值
 * @param {Number} minScale 最小可见缩放值
 * @param {Number} maxScale 最大可见缩放值
 * @returns {Number} 计算出的透明度值（0-1之间）
 */
const calculateScaleTransitionOpacity = (currentScale, minScale, maxScale) => {
  // 过渡区域大小比例（相对于临界值）
  const transitionFactor = 0.2;
  
  // 计算过渡区域范围
  const minTransition = minScale * (1 - transitionFactor);
  const maxTransition = maxScale * (1 + transitionFactor);
  
  // 元素完全在可见范围内
  if (currentScale > minScale * (1 + transitionFactor) && currentScale < maxScale * (1 - transitionFactor)) {
    return 1.0;
  }
  
  // 元素在最小缩放边界的过渡区域内
  if (currentScale >= minTransition && currentScale <= minScale * (1 + transitionFactor)) {
    // 从0到1的线性过渡
    return (currentScale - minTransition) / (minScale * transitionFactor * 2);
  }
  
  // 元素在最大缩放边界的过渡区域内
  if (currentScale >= maxScale * (1 - transitionFactor) && currentScale <= maxTransition) {
    // 从1到0的线性过渡
    return 1.0 - (currentScale - maxScale * (1 - transitionFactor)) / (maxScale * transitionFactor * 2);
  }
  
  // 完全超出可见范围
  return 0.0;
};

// 为极端缩放值增加LOD级别计算
const calculateElementLodLevel = (element) => {
  // 基于元素类型和特征计算其最适合的LOD级别
  let baseLodLevel = 0;

  if (element.type === 'line') {
    // 线条基于其复杂度和长度
    const points = element.config.points || [];
    const complexity = Math.max(1, Math.floor(points.length / 4));
    baseLodLevel = complexity - 1;
  } else if (element.type === 'text') {
    // 文本基于其字体大小
    const fontSize = element.config.fontSize || 12;
    baseLodLevel = fontSize > 24 ? 0 : fontSize > 16 ? 1 : fontSize > 12 ? 2 : 3;
  } else if (element.lodLevel !== undefined) {
    // 使用元素预定义的LOD级别
    baseLodLevel = element.lodLevel;
  } else {
    // 默认基于元素尺寸
    const size = Math.max(
      element.config.width || element.width || 10,
      element.config.height || element.height || 10
    );
    baseLodLevel = size > 100 ? 0 : size > 50 ? 1 : size > 20 ? 2 : size > 10 ? 3 : 4;
  }

  return baseLodLevel;
};

/**
 * 计算元素在屏幕上的大小 - 优化以处理极端缩放值
 * @param {Object} element 要计算的元素对象
 * @param {Object} viewState 当前视图状态
 * @param {Object} props 组件属性
 * @returns {Number} 元素在屏幕上的大小（像素值）
 */
const calculateElementScreenSize = (element, viewState, props) => {
  // 针对极端缩放值的安全检查
  if (!isFinite(viewState.scale) || isNaN(viewState.scale)) {
    console.warn('缩放值无效:', viewState.scale);
    return 0;
  }

  // 根据元素类型分发到对应的计算函数
  switch (element.type) {
    case 'line':
      return calculateLineScreenSize(element, viewState, props);
    case 'circle':
      return calculateCircleScreenSize(element, viewState);
    case 'text':
      return calculateTextScreenSize(element, viewState);
    case 'rect':
      return calculateRectScreenSize(element, viewState);
    case 'ellipse':
      return calculateEllipseScreenSize(element, viewState);
    case 'image':
      return calculateImageScreenSize(element, viewState);
    case 'path':
      return calculatePathScreenSize(element, viewState, props);
    case 'polygon':
    case 'regularPolygon': 
      return calculatePolygonScreenSize(element, viewState);
    case 'star':
      return calculateStarScreenSize(element, viewState);
    case 'wedge':
    case 'arc':
      return calculateArcScreenSize(element, viewState);
    case 'ring':
      return calculateRingScreenSize(element, viewState);
    case 'label':
      return calculateLabelScreenSize(element, viewState);
    case 'arrow':
      return calculateArrowScreenSize(element, viewState);
    case 'group':
      return calculateGroupScreenSize(element, viewState, props);
    case 'sprite':
      return calculateSpriteScreenSize(element, viewState);
    case 'custom':
      return calculateCustomScreenSize(element, viewState, props);
    default:
      return calculateDefaultScreenSize(element, viewState, props);
  }
};

/**
 * 计算线条元素在屏幕上的大小
 * @param {Object} element 线条元素
 * @param {Object} viewState 当前视图状态
 * @param {Object} props 组件属性
 * @returns {Number} 线条在屏幕上的大小
 */
const calculateLineScreenSize = (element, viewState, props) => {
  // 获取线条宽度，如果未指定则默认为1
  const strokeWidth = element.config.strokeWidth || 1;
  
  // 获取线条的点集合
  const points = element.config.points;
  let lineLength = 0;

  // 计算线条总长度（多段线的所有段长度总和）
  if (points && points.length >= 4) {
    for (let i = 0; i < points.length - 2; i += 2) {
      // 计算相邻两点之间的x和y方向距离
      const dx = points[i + 2] - points[i];
      const dy = points[i + 3] - points[i + 1];
      // 使用勾股定理计算线段长度并累加
      lineLength += Math.sqrt(dx * dx + dy * dy);
    }
  }

  try {
    // 将线宽转换为屏幕像素尺寸
    const widthSize = strokeWidth * viewState.scale;
    // 将线长转换为屏幕像素尺寸
    const lengthSize = lineLength * viewState.scale;

    // 使用线宽和线长中的较大值作为最终尺寸
    // 这确保了即使短线条，如果线宽很大，也能正确显示
    let size = Math.max(widthSize, lengthSize);

    // 检查计算结果是否有效
    if (!isFinite(size) || isNaN(size)) {
      // 如果无效，回退到基于LOD级别的估计值
      size = props.lodThreshold * Math.pow(2, props.maxLodLevel - viewState.lodLevel);
    }
    
    return size;
  } catch (e) {
    // 捕获任何计算过程中的错误
    console.warn('计算线条尺寸时出错:', e);
    // 返回默认的阈值大小
    return props.lodThreshold;
  }
};

/**
 * 计算圆形元素在屏幕上的大小
 * @param {Object} element 圆形元素
 * @param {Object} viewState 当前视图状态
 * @returns {Number} 圆形在屏幕上的大小
 */
const calculateCircleScreenSize = (element, viewState) => {
  // 直接从元素获取半径，如果不存在则尝试从config获取，如果都不存在则默认为1
  const radius = element.radius || (element.config?.radius) || 1;
  // 将半径转换为屏幕像素大小（半径乘以当前缩放比例）
  return radius * viewState.scale;
};

/**
 * 计算文本元素在屏幕上的大小
 * @param {Object} element 文本元素
 * @param {Object} viewState 当前视图状态
 * @returns {Number} 文本在屏幕上的大小
 */
const calculateTextScreenSize = (element, viewState) => {
  // 直接从元素获取字体大小，如果不存在则尝试从config获取，如果都不存在则默认为12
  const fontSize = element.fontSize || (element.config?.fontSize) || 12;
  // 将字体大小转换为屏幕像素大小
  return fontSize * viewState.scale;
};

/**
 * 计算矩形元素在屏幕上的大小
 * @param {Object} element 矩形元素
 * @param {Object} viewState 当前视图状态
 * @returns {Number} 矩形在屏幕上的大小
 */
const calculateRectScreenSize = (element, viewState) => {
  // 直接从元素获取宽度和高度，如果不存在则尝试从config获取，如果都不存在则使用默认值
  const width = element.width || (element.config?.width) || 10;
  const height = element.height || (element.config?.height) || 10;
  
  // 使用矩形的宽高中的较大值作为其屏幕尺寸
  return Math.max(width, height) * viewState.scale;
};

/**
 * 计算椭圆元素在屏幕上的大小
 * @param {Object} element 椭圆元素
 * @param {Object} viewState 当前视图状态
 * @returns {Number} 椭圆在屏幕上的大小
 */
const calculateEllipseScreenSize = (element, viewState) => {
  // 直接从元素获取主轴和次轴半径，如果不存在则尝试从config获取，如果都不存在则使用默认值
  const radiusX = element.radiusX || (element.config?.radiusX) || 10;
  const radiusY = element.radiusY || (element.config?.radiusY) || 10;
  
  // 使用椭圆主轴和次轴半径中的较大值乘以2作为其屏幕尺寸
  return Math.max(radiusX * 2, radiusY * 2) * viewState.scale;
};

/**
 * 计算图像元素在屏幕上的大小
 * @param {Object} element 图像元素
 * @param {Object} viewState 当前视图状态
 * @returns {Number} 图像在屏幕上的大小
 */
const calculateImageScreenSize = (element, viewState) => {
  // 直接从元素获取宽度和高度，如果不存在则尝试从config获取，如果都不存在则使用默认值
  const width = element.width || (element.config?.width) || 10;
  const height = element.height || (element.config?.height) || 10;
  
  // 使用图像的宽高中的较大值作为其屏幕尺寸
  return Math.max(width, height) * viewState.scale;
};

/**
 * 计算路径元素在屏幕上的大小
 * @param {Object} element 路径元素
 * @param {Object} viewState 当前视图状态
 * @param {Object} props 组件属性
 * @returns {Number} 路径在屏幕上的大小
 */
const calculatePathScreenSize = (element, viewState, props) => {
  // 直接从元素获取边界框宽度和高度，如果不存在则尝试从config获取
  const bboxWidth = element.bboxWidth || (element.config?.bboxWidth);
  const bboxHeight = element.bboxHeight || (element.config?.bboxHeight);
  
  // 检查路径是否有定义的边界框
  if (bboxWidth && bboxHeight) {
    // 使用路径边界框的宽高中的较大值作为其屏幕尺寸
    return Math.max(bboxWidth, bboxHeight) * viewState.scale;
  }
  
  // 直接从元素获取线宽，如果不存在则尝试从config获取，如果都不存在则默认为1
  const strokeWidth = element.strokeWidth || (element.config?.strokeWidth) || 1;
  // 直接从元素获取路径数据，如果不存在则尝试从config获取
  const pathData = element.data || (element.config?.data);
  // 如果路径没有边界框信息，则基于线宽和路径数据估算大小
  const pathComplexity = pathData ? pathData.length / 2 : 1;
  
  // 根据路径的复杂度（数据点数量）和线宽来估算其屏幕尺寸
  return Math.max(strokeWidth, 10 * pathComplexity) * viewState.scale;
};

/**
 * 计算多边形元素在屏幕上的大小
 * @param {Object} element 多边形元素
 * @param {Object} viewState 当前视图状态
 * @returns {Number} 多边形在屏幕上的大小
 */
const calculatePolygonScreenSize = (element, viewState) => {
  let maxDistance = 0;
  
  // 处理正多边形类型
  if (element.type === 'regularPolygon') {
    // 直接从元素获取半径，如果不存在则尝试从config获取，如果都不存在则默认为10
    const radius = element.radius || (element.config?.radius) || 10;
    // 正多边形使用其半径作为大小基准
    return radius * 2 * viewState.scale;
  }
  
  // 直接从元素获取点集合，如果不存在则尝试从config获取
  const points = element.points || (element.config?.points);
  
  // 处理一般多边形
  if (points && points.length >= 4) {
    // 计算多边形每个点到原点的最大距离，作为多边形的"半径"
    for (let i = 0; i < points.length; i += 2) {
      const x = points[i];
      const y = points[i + 1];
      const distance = Math.sqrt(x * x + y * y);
      maxDistance = Math.max(maxDistance, distance);
    }
  } else {
    // 如果没有有效的点数据，使用默认值
    maxDistance = 10;
  }
  
  // 返回多边形"直径"的屏幕尺寸
  return maxDistance * 2 * viewState.scale;
};

/**
 * 计算星形元素在屏幕上的大小
 * @param {Object} element 星形元素
 * @param {Object} viewState 当前视图状态
 * @returns {Number} 星形在屏幕上的大小
 */
const calculateStarScreenSize = (element, viewState) => {
  // 直接从元素获取外半径，如果不存在则尝试从config获取，如果都不存在则默认为10
  const outerRadius = element.outerRadius || (element.config?.outerRadius) || 10;
  
  // 使用星形的外半径乘以2作为其屏幕尺寸
  return outerRadius * 2 * viewState.scale;
};

/**
 * 计算弧形/楔形元素在屏幕上的大小
 * @param {Object} element 弧形/楔形元素
 * @param {Object} viewState 当前视图状态
 * @returns {Number} 弧形/楔形在屏幕上的大小
 */
const calculateArcScreenSize = (element, viewState) => {
  // 直接从元素获取半径，如果不存在则尝试从config获取，如果都不存在则默认为10
  const radius = element.radius || (element.config?.radius) || 10;
  
  // 使用弧形/楔形的半径乘以2作为其屏幕尺寸
  return radius * 2 * viewState.scale;
};

/**
 * 计算环形元素在屏幕上的大小
 * @param {Object} element 环形元素
 * @param {Object} viewState 当前视图状态
 * @returns {Number} 环形在屏幕上的大小
 */
const calculateRingScreenSize = (element, viewState) => {
  // 直接从元素获取外半径，如果不存在则尝试从config获取，如果都不存在则默认为10
  const outerRadius = element.outerRadius || (element.config?.outerRadius) || 10;
  
  // 使用环形的外半径乘以2作为其屏幕尺寸
  return outerRadius * 2 * viewState.scale;
};

/**
 * 计算标签元素在屏幕上的大小
 * @param {Object} element 标签元素
 * @param {Object} viewState 当前视图状态
 * @returns {Number} 标签在屏幕上的大小
 */
const calculateLabelScreenSize = (element, viewState) => {
  // 直接从元素获取文本内容，如果不存在则尝试从config获取，如果都不存在则默认为空字符串
  const text = element.text || (element.config?.text) || '';
  // 直接从元素获取字体大小，如果不存在则尝试从config获取，如果都不存在则默认为12
  const fontSize = element.fontSize || (element.config?.fontSize) || 12;
  
  // 标签尺寸基于文本长度和字体大小
  const textLength = text.length * fontSize * 0.6; // 估算文本宽度
  return Math.max(textLength, fontSize) * viewState.scale;
};

/**
 * 计算箭头元素在屏幕上的大小
 * @param {Object} element 箭头元素
 * @param {Object} viewState 当前视图状态
 * @returns {Number} 箭头在屏幕上的大小
 */
const calculateArrowScreenSize = (element, viewState) => {
  // 直接从元素获取点集合，如果不存在则尝试从config获取
  const points = element.points || (element.config?.points);
  let arrowLength = 0;
  
  // 计算箭头总长度
  if (points && points.length >= 4) {
    for (let i = 0; i < points.length - 2; i += 2) {
      const dx = points[i + 2] - points[i];
      const dy = points[i + 3] - points[i + 1];
      arrowLength += Math.sqrt(dx * dx + dy * dy);
    }
  } else {
    // 如果没有有效的点数据，使用默认值
    arrowLength = 10;
  }
  
  // 直接从元素获取线宽，如果不存在则尝试从config获取，如果都不存在则默认为1
  const strokeWidth = element.strokeWidth || (element.config?.strokeWidth) || 1;
  
  // 使用箭头长度和线宽中的较大值作为其屏幕尺寸
  return Math.max(arrowLength, strokeWidth) * viewState.scale;
};

/**
 * 计算组元素在屏幕上的大小
 * @param {Object} element 组元素
 * @param {Object} viewState 当前视图状态
 * @param {Object} props 组件属性
 * @returns {Number} 组在屏幕上的大小
 */
const calculateGroupScreenSize = (element, viewState, props) => {
  // 直接从元素获取宽度和高度，如果不存在则尝试从config获取
  const width = element.width || (element.config?.width);
  const height = element.height || (element.config?.height);
  
  // 如果组有明确定义的宽高，直接使用
  if (width && height) {
    return Math.max(width, height) * viewState.scale;
  }
  
  // 直接从元素获取子元素集合
  const children = element.children || [];
  
  // 如果组包含子元素，计算所有子元素的最大尺寸
  if (children.length > 0) {
    let maxChildSize = 0;
    
    for (const child of children) {
      // 递归计算每个子元素的屏幕尺寸
      const childSize = calculateElementScreenSize(child, viewState, props);
      maxChildSize = Math.max(maxChildSize, childSize);
    }
    
    return maxChildSize;
  }
  
  // 如果无法确定组的大小，返回默认值
  return 10 * viewState.scale;
};

/**
 * 计算精灵元素在屏幕上的大小
 * @param {Object} element 精灵元素
 * @param {Object} viewState 当前视图状态
 * @returns {Number} 精灵在屏幕上的大小
 */
const calculateSpriteScreenSize = (element, viewState) => {
  // 直接从元素获取宽度和高度，如果不存在则尝试从config获取，如果都不存在则默认为10
  const width = element.width || (element.config?.width) || 10;
  const height = element.height || (element.config?.height) || 10;
  
  // 使用精灵的宽高中的较大值作为其屏幕尺寸
  return Math.max(width, height) * viewState.scale;
};

/**
 * 计算自定义元素在屏幕上的大小
 * @param {Object} element 自定义元素
 * @param {Object} viewState 当前视图状态
 * @param {Object} props 组件属性
 * @returns {Number} 自定义元素在屏幕上的大小
 */
const calculateCustomScreenSize = (element, viewState, props) => {
  // 检查元素是否提供了自定义的屏幕大小计算方法
  if (element.getScreenSize) {
    // 使用元素提供的方法计算屏幕大小
    return element.getScreenSize(viewState.scale);
  }
  // 如果没有提供计算方法，则回退到默认计算方式
  return calculateDefaultScreenSize(element, viewState, props);
};

/**
 * 计算默认元素在屏幕上的大小
 * @param {Object} element 默认元素
 * @param {Object} viewState 当前视图状态
 * @param {Object} props 组件属性
 * @returns {Number} 默认元素在屏幕上的大小
 */
const calculateDefaultScreenSize = (element, viewState, props) => {
  // 直接从元素获取宽度和高度，如果不存在则尝试从config获取，如果都不存在则默认为10
  const width = element.width || (element.config?.width) || 10;
  const height = element.height || (element.config?.height) || 10;
  
  // 使用宽高中的较大值作为元素尺寸的基准
  const size = Math.max(width, height) * viewState.scale;
  
  // 确保返回有限数值，如果计算结果无效则返回默认阈值
  return isFinite(size) ? size : props.lodThreshold;
};