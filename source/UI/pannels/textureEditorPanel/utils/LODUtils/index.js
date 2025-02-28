

// LOD级别阈值查找表 - 使用查表法提高性能
const LOD_THRESHOLDS = [
    { threshold: 0.001, level: 0 },  // 极远视图
    { threshold: 0.01, level: 1 },   // 远视图
    { threshold: 0.1, level: 2 },    // 中远视图
    { threshold: 1, level: 3 },      // 中视图
    { threshold: 10, level: 4 },     // 中近视图
    { threshold: 100, level: 5 },    // 近视图
    { threshold: Number.MAX_VALUE, level: 6 }  // 极近视图，支持到JS数字上界
  ];
  
  // 获取当前LOD级别 - 优化为查表法
  export const getLODLevel = (viewState) => {
    const scale = viewState.scale;
    
    // 处理极小值边界情况
    if (scale <= Number.MIN_VALUE) return 0;
    
    // 查表法快速查询
    for (const entry of LOD_THRESHOLDS) {
      if (scale <= entry.threshold) {
        return entry.level;
      }
    }
    
    // 默认情况，不应该到达此处
    return 6;
  };
  
  // 网格大小计算查找表 - 使用查表法提高性能
  const GRID_SIZE_FACTORS = {
    0: (baseSize) => baseSize * 1000,   // 极远视图
    1: (baseSize) => baseSize * 100,    // 远视图
    2: (baseSize) => baseSize * 10,     // 中远视图
    3: (baseSize) => baseSize,          // 中视图 - 基本网格大小
    4: (baseSize) => baseSize / 10,     // 中近视图
    5: (baseSize) => baseSize / 100,    // 近视图
    6: (baseSize) => baseSize / 1000    // 极近视图
  };
  
  // 获取当前LOD级别的网格大小 - 优化为查表法
  export const getLODGridSize = (baseSize, viewState) => {
    const level = getLODLevel(viewState);
    
    // 查表法快速查询并计算网格大小
    const sizeFactor = GRID_SIZE_FACTORS[level] || GRID_SIZE_FACTORS[3]; // 默认使用中视图基准
    return sizeFactor(baseSize);
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
 * @returns {Boolean} 元素是否应该显示
 */
export const shouldElementBeVisible = (element, viewState, props) => {
  if (!props.enableLod) return true;
  
  // 如果元素有自定义LOD范围
  if (element.lodRange) {
    // 处理特殊情况：无穷大或非常小的值
    const minScale = element.lodRange.minScale === -Infinity ? 0 : element.lodRange.minScale;
    const maxScale = element.lodRange.maxScale === Infinity ? Number.MAX_VALUE : element.lodRange.maxScale;
    
    return viewState.scale >= minScale && viewState.scale <= maxScale;
  }
  
  // 优化：针对超大或超小缩放值的特殊处理
  if (viewState.scale < 1e-10 || viewState.scale > 1e10) {
    // 根据LOD级别而非直接尺寸计算来判断可见性
    const elementLod = calculateElementLodLevel(element);
    const currentLod = calculateLodLevel(viewState, props);
    return Math.abs(elementLod - currentLod) <= 1; // 在当前LOD级别或相邻级别可见
  }
  
  // 计算元素在屏幕上的大小
  const elementSize = calculateElementScreenSize(element, viewState);
  return elementSize >= props.lodThreshold;
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

// 计算元素在屏幕上的大小 - 优化以处理极端缩放值
const calculateElementScreenSize = (element, viewState) => {
  // 针对极端缩放值的安全检查
  if (!isFinite(viewState.scale) || isNaN(viewState.scale)) {
    console.warn('缩放值无效:', viewState.scale);
    return 0;
  }

  // 根据元素类型计算尺寸
  let size = 0;

  if (element.type === 'line') {
    // 线条同时考虑线宽和长度
    const strokeWidth = element.config.strokeWidth || 1;

    // 计算线条长度
    const points = element.config.points;
    let lineLength = 0;

    if (points && points.length >= 4) {
      // 对于多段线，计算所有线段长度总和
      for (let i = 0; i < points.length - 2; i += 2) {
        const dx = points[i + 2] - points[i];
        const dy = points[i + 3] - points[i + 1];
        lineLength += Math.sqrt(dx * dx + dy * dy);
      }
    }

    // 安全计算：防止数值溢出
    try {
      // 线宽和长度都要乘以缩放比例转换为屏幕尺寸
      const widthSize = strokeWidth * viewState.scale;
      const lengthSize = lineLength * viewState.scale;

      // 取长度和宽度的最大值作为最终尺寸
      size = Math.max(widthSize, lengthSize);

      // 检查计算结果的有效性
      if (!isFinite(size) || isNaN(size)) {
        // 回退到一个基于LOD级别的估计值
        size = props.lodThreshold * Math.pow(2, props.maxLodLevel - viewState.lodLevel);
      }
    } catch (e) {
      console.warn('计算元素尺寸时出错:', e);
      size = props.lodThreshold; // 回退到默认值
    }
  } else if (element.type === 'circle') {
    // 圆形使用半径作为尺寸基准
    size = (element.config.radius || 1) * viewState.scale;
  } else if (element.type === 'text') {
    // 文本使用字体大小作为尺寸基准
    size = (element.config.fontSize || 12) * viewState.scale;
  } else if (element.type === 'custom' && element.getScreenSize) {
    // 自定义元素可以提供计算方法
    size = element.getScreenSize(viewState.scale);
  } else {
    // 默认尺寸计算方法（宽高平均值）
    const width = element.config.width || element.width || 10;
    const height = element.config.height || element.height || 10;
    size = Math.max(width, height) * viewState.scale;
  }

  // 最终安全检查
  return isFinite(size) ? size : props.lodThreshold;
};