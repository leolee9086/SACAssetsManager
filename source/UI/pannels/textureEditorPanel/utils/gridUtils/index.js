import { getLODLevel,getLODGridSize } from "../LODUtils/index.js";
import { getOptimalLabelSpacing } from "../canvasUtils.js";
// 格式化轴标签文本 - 增强处理极小/极大值
const formatAxisLabel = (value) => {
    // 处理0值
    if (value === 0) return '0';
    
    const absValue = Math.abs(value);
    
    // 极小值处理 - 支持到JS数字下界
    if (absValue <= 1e-15) {
      // 对于接近或等于最小值的数字使用特殊处理
      if (absValue <= 1e-300 || absValue === Number.MIN_VALUE) {
        return value < 0 ? '-ε' : 'ε'; // 使用数学符号表示极小值
      }
      // 使用科学计数法，保留1位有效数字
      return value.toExponential(1);
    }
    
    // 小值处理 - 改进区间划分
    if (absValue < 0.01) {
      // 根据数量级动态确定保留的小数位数
      const exponent = Math.floor(Math.log10(absValue));
      // 对于非常小但不是极小的值，保留2-3位有效数字
      return value.toExponential(Math.abs(exponent) > 100 ? 1 : 2);
    }
    
    // 大于1000使用k单位
    if (absValue >= 1000 && absValue < 1000000) {
      return (value / 1000).toFixed(1) + 'k';
    }
    
    // 大于1M使用M单位
    if (absValue >= 1000000 && absValue < 1000000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    
    // 大于1G使用G单位
    if (absValue >= 1000000000 && absValue < 1e12) {
      return (value / 1000000000).toFixed(1) + 'G';
    }
    
    // 特大值处理 - 支持更多单位
    if (absValue >= 1e12 && absValue < 1e15) {
      return (value / 1e12).toFixed(1) + 'T'; // 万亿
    }
    
    if (absValue >= 1e15) {
      return value.toExponential(2); // 超大值使用科学计数法
    }
    
    // 一般情况
    if (Number.isInteger(value)) {
      return value.toString();
    }
    
    // 小数保留合适精度
    const decimalPlaces = Math.min(2, Math.max(0, -Math.floor(Math.log10(Math.abs(value % 1)))));
    return value.toFixed(decimalPlaces);
  };
  

// 准备网格参数
const prepareGridParameters = (bounds, viewScale, gridSize) => {
    const { left, right, top, bottom } = bounds;
    const inverseScale = 1 / viewScale;
    
    // 计算当前LOD级别和网格大小
    const lodLevel = getLODLevel({ scale: viewScale });
    const mainGridSize = getLODGridSize(gridSize, { scale: viewScale });
  
    // 计算次要网格尺寸
    const showSecondaryGrid = lodLevel >= 2 && lodLevel <= 5;
    const secondaryGridSize = mainGridSize / 10;
  
    // 预先计算网格边界
    const startX = Math.floor(left / mainGridSize) * mainGridSize;
    const startY = Math.floor(top / mainGridSize) * mainGridSize;
    const endX = Math.ceil(right / mainGridSize) * mainGridSize;
    const endY = Math.ceil(bottom / mainGridSize) * mainGridSize;
  
    // 性能检查：估计网格线数量
    const estimatedHLines = Math.ceil((endY - startY) / mainGridSize);
    const estimatedVLines = Math.ceil((endX - startX) / mainGridSize);
    const maxGridLines = 1000;
    
    return {
      inverseScale,
      lodLevel,
      mainGridSize,
      secondaryGridSize,
      showSecondaryGrid,
      startX, startY, endX, endY,
      estimatedHLines, estimatedVLines, maxGridLines,
      lineDefaults: {
        mainLine: { stroke: '#ddd', strokeWidth: 1 * inverseScale },
        mainAxisLine: { stroke: '#999', strokeWidth: 1.5 * inverseScale },
        secondaryLine: { stroke: '#eee', strokeWidth: 0.5 * inverseScale },
        tickLine: { stroke: '#666', strokeWidth: 1 * inverseScale }
      }
    };
  };
  
  
  // 对象池以减少内存分配和垃圾回收
  const objectPool = (() => {
    const pools = {
      line: [],
      text: [],
      circle: []
    };
    
    return {
      get: (type) => {
        if (pools[type] && pools[type].length > 0) {
          return pools[type].pop();
        }
        return { type, config: {} };
      },
      
      release: (objects) => {
        if (!Array.isArray(objects)) objects = [objects];
        objects.forEach(obj => {
          if (obj && pools[obj.type]) {
            // 重置对象以便复用
            const config = obj.config;
            for (const key in config) {
              if (Array.isArray(config[key])) {
                config[key].length = 0;
              } else if (typeof config[key] === 'object') {
                for (const subKey in config[key]) {
                  delete config[key][subKey];
                }
              }
            }
            pools[obj.type].push(obj);
          }
        });
      }
    };
  })();

  // 使用整型数据替代浮点数以提高性能
  const PRECISION_FACTOR = 1000; // 3位小数精度
  const toInt = (value) => ((value * PRECISION_FACTOR) | 0);
  const fromInt = (intValue) => intValue / PRECISION_FACTOR;

  // 网格计算结果缓存系统
  const gridCache = (() => {
    const cache = new Map();
    const MAX_CACHE_SIZE = 10; // 缓存最近10个网格配置
    
    return {
      getKey: (bounds, viewScale, gridSize) => {
        // 创建一个合适精度的缓存键
        const { left, right, top, bottom } = bounds;
        return `${toInt(left)}-${toInt(right)}-${toInt(top)}-${toInt(bottom)}-${toInt(viewScale)}-${toInt(gridSize)}`;
      },
      
      get: (key) => cache.get(key),
      
      set: (key, value) => {
        if (cache.size >= MAX_CACHE_SIZE) {
          // 移除最旧的条目
          const oldestKey = cache.keys().next().value;
          cache.delete(oldestKey);
        }
        cache.set(key, value);
      }
    };
  })();

  // 线条配置缓存进阶版 - 使用对象池
  const createLineConfigCache = () => {
    const cache = new Map();
    return (type, x1, y1, x2, y2, params) => {
      // 取整以提高缓存命中率
      const ix1 = toInt(x1), iy1 = toInt(y1), ix2 = toInt(x2), iy2 = toInt(y2);
      const key = `${type}-${ix1}-${iy1}-${ix2}-${iy2}`;
      
      if (!cache.has(key)) {
        const lineObj = objectPool.get('line');
        const defaults = params.lineDefaults[type];
        
        lineObj.config.points = [x1, y1, x2, y2];
        lineObj.config.stroke = defaults.stroke;
        lineObj.config.strokeWidth = defaults.strokeWidth;
        
        cache.set(key, lineObj);
      }
      return cache.get(key);
    };
  };

  // 优化：批量计算网格基础数据 - 仅计算边界内的网格
  const calculateGridBounds = (bounds, params) => {
    const { left, right, top, bottom } = bounds;
    const { mainGridSize, secondaryGridSize } = params;
    
    // 严格计算边界内的网格线 - 使用Math.ceil和Math.floor
    // 而不是加1或减1的方式确保精确计算
    return {
      mainStartX: Math.ceil(left / mainGridSize) * mainGridSize,
      mainEndX: Math.floor(right / mainGridSize) * mainGridSize,
      mainStartY: Math.ceil(top / mainGridSize) * mainGridSize, 
      mainEndY: Math.floor(bottom / mainGridSize) * mainGridSize,
      
      secStartX: Math.ceil(left / secondaryGridSize) * secondaryGridSize,
      secEndX: Math.floor(right / secondaryGridSize) * secondaryGridSize,
      secStartY: Math.ceil(top / secondaryGridSize) * secondaryGridSize,
      secEndY: Math.floor(bottom / secondaryGridSize) * secondaryGridSize
    };
  };

  // 纯函数：构建网格元素配置 - 边界优化版本
  export const buildGrid = (bounds, viewScale, gridSize, unitRatio) => {
    // 缓存检查 - 避免重复计算
    const cacheKey = gridCache.getKey(bounds, viewScale, gridSize);
    const cachedGrid = gridCache.get(cacheKey);
    if (cachedGrid) return cachedGrid;
    
    // 准备参数
    const params = prepareGridParameters(bounds, viewScale, gridSize);
    
    // 性能优化：提前退出，避免后续计算
    if (params.estimatedHLines + params.estimatedVLines > params.maxGridLines) {
      return null; // 表示需要递归调用以使用更低精度
    }
  
    // 预计算网格边界 - 仅计算边界内的网格线
    const gridBounds = calculateGridBounds(bounds, params);
    Object.assign(params, gridBounds);
  
    // 边界内网格线数量的准确估计
    const hLineCount = Math.max(0, Math.floor((gridBounds.mainEndY - gridBounds.mainStartY) / params.mainGridSize) + 1);
    const vLineCount = Math.max(0, Math.floor((gridBounds.mainEndX - gridBounds.mainStartX) / params.mainGridSize) + 1);
    
    // 二次网格线数量
    const secHLineCount = params.showSecondaryGrid ? 
      Math.max(0, Math.floor((gridBounds.secEndY - gridBounds.secStartY) / params.secondaryGridSize) + 1) : 0;
    const secVLineCount = params.showSecondaryGrid ? 
      Math.max(0, Math.floor((gridBounds.secEndX - gridBounds.secStartX) / params.secondaryGridSize) + 1) : 0;
    
    // 标签数量估计 - 仅计算边界内可见的标签
    const labelSpacing = getOptimalLabelSpacing(viewScale);
    const xLabelStartPos = Math.ceil(bounds.left / labelSpacing) * labelSpacing;
    const xLabelEndPos = Math.floor(bounds.right / labelSpacing) * labelSpacing;
    const yLabelStartPos = Math.ceil(bounds.top / labelSpacing) * labelSpacing;
    const yLabelEndPos = Math.floor(bounds.bottom / labelSpacing) * labelSpacing;
    
    const xLabelCount = Math.max(0, Math.floor((xLabelEndPos - xLabelStartPos) / labelSpacing) + 1);
    const yLabelCount = Math.max(0, Math.floor((yLabelEndPos - yLabelStartPos) / labelSpacing) + 1);
    
    // 估计元素总数 - 精确计算边界内的元素
    const estimatedElementCount = 
      secHLineCount + secVLineCount + // 次要网格线
      hLineCount + vLineCount +       // 主网格线
      (xLabelCount << 1) +            // X轴标签和刻度线
      (yLabelCount << 1) +            // Y轴标签和刻度线
      2;                              // 原点标记
      
    // 如果没有可见元素，提前返回空数组
    if (estimatedElementCount <= 2) {
      return [];
    }
    
    const elements = new Array(estimatedElementCount);
    let elementIndex = 0;
  
    // 创建线条配置缓存函数
    const getLineConfig = createLineConfigCache();
  
    // 仅渲染视口内可见的元素
    if (params.showSecondaryGrid && (secHLineCount > 0 || secVLineCount > 0)) {
      elementIndex = addSecondaryGridLines(bounds, params, gridBounds, elements, elementIndex, getLineConfig);
    }
    
    if (hLineCount > 0 || vLineCount > 0) {
      elementIndex = addMainGridLines(bounds, params, gridBounds, elements, elementIndex, getLineConfig);
    }
    
    // 仅当有足够空间显示标签时才添加
    if (xLabelCount > 0 || yLabelCount > 0) {
      elementIndex = addAxisLabelsAndTicks(bounds, params, viewScale, unitRatio, elements, elementIndex, getLineConfig);
    }
    
    // 仅当原点在视图中时显示原点标记
    if (bounds.left <= 0 && bounds.right >= 0 && bounds.top <= 0 && bounds.bottom >= 0) {
      elementIndex = addOriginMarker(params, elements, elementIndex);
    }
  
    // 裁剪数组到实际大小
    const result = elementIndex < estimatedElementCount ? elements.slice(0, elementIndex) : elements;
    
    // 存入缓存
    gridCache.set(cacheKey, result);
    
    return result;
  };

  // 优化：使用缓存的线条配置，仅添加边界内的次要网格线
  const addSecondaryGridLines = (bounds, params, gridBounds, elements, startIndex, getLineConfig) => {
    const { left, right, top, bottom } = bounds;
    const { secondaryGridSize, mainGridSize } = params;
    const { secStartX, secEndX, secStartY, secEndY } = gridBounds;
    
    let elementIndex = startIndex;
    const EPSILON = 1e-10;
    
    // 优化循环边界条件，确保只处理视口内的线条
    let x = secStartX;
    while (x <= secEndX) {
      // 跳过主网格线位置的次要网格线
      if ((Math.abs(x) < EPSILON) || (Math.abs(x % mainGridSize) >= EPSILON)) {
        elements[elementIndex++] = getLineConfig('secondaryLine', x, top, x, bottom, params);
      }
      x += secondaryGridSize;
    }
  
    let y = secStartY;
    while (y <= secEndY) {
      // 跳过主网格线位置的次要网格线
      if ((Math.abs(y) < EPSILON) || (Math.abs(y % mainGridSize) >= EPSILON)) {
        elements[elementIndex++] = getLineConfig('secondaryLine', left, y, right, y, params);
      }
      y += secondaryGridSize;
    }
    
    return elementIndex;
  };

  // 优化：使用缓存的线条配置，仅添加边界内的主网格线
  const addMainGridLines = (bounds, params, gridBounds, elements, startIndex, getLineConfig) => {
    const { top, bottom, left, right } = bounds;
    const { mainGridSize } = params;
    const { mainStartX, mainEndX, mainStartY, mainEndY } = gridBounds;
    
    let elementIndex = startIndex;
    const EPSILON = 1e-10;
  
    // 优化循环，仅处理视口内的线条
    let x = mainStartX;
    while (x <= mainEndX) {
      const lineType = Math.abs(x) < EPSILON ? 'mainAxisLine' : 'mainLine';
      elements[elementIndex++] = getLineConfig(lineType, x, top, x, bottom, params);
      x += mainGridSize;
    }
  
    let y = mainStartY;
    while (y <= mainEndY) {
      const lineType = Math.abs(y) < EPSILON ? 'mainAxisLine' : 'mainLine';
      elements[elementIndex++] = getLineConfig(lineType, left, y, right, y, params);
      y += mainGridSize;
    }
    
    return elementIndex;
  };

  // 优化：添加轴标签和刻度线，仅处理可见区域内的标签
  const addAxisLabelsAndTicks = (bounds, params, viewScale, unitRatio, elements, startIndex, getLineConfig) => {
    const { left, right, top, bottom } = bounds;
    const { inverseScale } = params;
    let elementIndex = startIndex;
    const EPSILON = 1e-10;
    
    // 缓存常用值避免重复计算
    const labelInterval = getOptimalLabelSpacing(viewScale);
    const fontSizeScaled = 12 * inverseScale;
    const tickLength = 3 * inverseScale;
    const textOffset = 5 * inverseScale;
    
    // 严格计算视口内的标签位置
    const labelStartX = Math.ceil(left / labelInterval) * labelInterval;
    const labelEndX = Math.floor(right / labelInterval) * labelInterval;
    const labelStartY = Math.ceil(top / labelInterval) * labelInterval;
    const labelEndY = Math.floor(bottom / labelInterval) * labelInterval;
    const maxLabels = 100;
    
    // 使用预先计算的标签文本 - 减少反复的数值格式化
    const labelTextCache = new Map();
    const getLabelText = (value) => {
      const cacheKey = toInt(value);
      if (!labelTextCache.has(cacheKey)) {
        labelTextCache.set(cacheKey, formatAxisLabel(value * unitRatio));
      }
      return labelTextCache.get(cacheKey);
    };
    
    // X轴标签和刻度线 - 只处理视口内的标签
    let labelCount = 0;
    let x = labelStartX;
    while (x <= labelEndX && labelCount < maxLabels) {
      if (Math.abs(x) >= EPSILON) { // 跳过原点
        labelCount++;
        const formattedLabel = getLabelText(x);
        
        const textObj = objectPool.get('text');
        textObj.config.x = x;
        textObj.config.y = textOffset;
        textObj.config.text = formattedLabel;
        textObj.config.fontSize = fontSizeScaled;
        textObj.config.fill = '#666';
        textObj.config.align = 'center';
        textObj.config.verticalAlign = 'top';
        textObj.config.offsetX = formattedLabel.length * 3 * inverseScale;
        
        elements[elementIndex++] = textObj;
        elements[elementIndex++] = getLineConfig('tickLine', x, 0, x, tickLength, params);
      }
      x += labelInterval;
    }
  
    // Y轴标签和刻度线 - 只处理视口内的标签
    labelCount = 0;
    let y = labelStartY;
    while (y <= labelEndY && labelCount < maxLabels) {
      if (Math.abs(y) >= EPSILON) { // 跳过原点
        labelCount++;
        const formattedLabel = getLabelText(y);
    
        const textObj = objectPool.get('text');
        textObj.config.x = textOffset;
        textObj.config.y = y;
        textObj.config.text = formattedLabel;
        textObj.config.fontSize = fontSizeScaled;
        textObj.config.fill = '#666';
        textObj.config.align = 'left';
        textObj.config.verticalAlign = 'middle';
        textObj.config.offsetY = 6 * inverseScale;
        
        elements[elementIndex++] = textObj;
        elements[elementIndex++] = getLineConfig('tickLine', 0, y, tickLength, y, params);
      }
      y += labelInterval;
    }
    
    return elementIndex;
  };

  // 优化：添加原点标记
  const addOriginMarker = (params, elements, startIndex) => {
    const { inverseScale } = params;
    let elementIndex = startIndex;
    
    const textOffset = 5 * inverseScale;
    const fontSizeScaled = 12 * inverseScale;
    
    const circleObj = objectPool.get('circle');
    circleObj.config.x = 0;
    circleObj.config.y = 0;
    circleObj.config.radius = 3 * inverseScale;
    circleObj.config.fill = 'red';
    circleObj.config.stroke = 'white';
    circleObj.config.strokeWidth = inverseScale;
    
    elements[elementIndex++] = circleObj;
    
    const textObj = objectPool.get('text');
    textObj.config.x = textOffset;
    textObj.config.y = textOffset;
    textObj.config.text = '(0,0)';
    textObj.config.fontSize = fontSizeScaled;
    textObj.config.fill = 'red';
    textObj.config.padding = 2;
    
    elements[elementIndex++] = textObj;
    
    return elementIndex;
  };
    