/**
 * 计算当前视口在世界坐标系中的边界
 * @param {Object} viewState - 包含位置、缩放和尺寸信息的视图状态
 * @returns {Object} 视口边界，包含left, right, top, bottom, width, height属性
 */
export const getViewportBounds = (viewState) => {
  // 计算视口左上角和右下角的世界坐标
  const topLeft = {
    x: -viewState.position.x / viewState.scale,
    y: -viewState.position.y / viewState.scale
  };
  
  const bottomRight = {
    x: (viewState.width - viewState.position.x) / viewState.scale,
    y: (viewState.height - viewState.position.y) / viewState.scale
  };
  
  // 返回视口边界，增加20%的余量确保覆盖整个视口
  const width = bottomRight.x - topLeft.x;
  const height = bottomRight.y - topLeft.y;
  
  return {
    left: topLeft.x - width * 0.2,
    right: bottomRight.x + width * 0.2,
    top: topLeft.y - height * 0.2,
    bottom: bottomRight.y + height * 0.2,
    width: width * 1.4, // 增加40%宽度
    height: height * 1.4 // 增加40%高度
  };
}; 


/**
 * 计算坐标轴标签的最佳间隔距离
 * 
 * @param {number} scale - 当前画布缩放比例
 * @param {number} minLabelDistancePx - 标签之间的最小像素距离，默认为60
 * @returns {number} 最佳标签间隔（以世界坐标单位）
 */
export const getOptimalLabelSpacing = (scale, minLabelDistancePx = 60) => {
    // 计算当前缩放下多少世界单位对应于最小标签间距
    const worldUnitsPerMinDistance = minLabelDistancePx / scale;
    
    // 扩展可接受的标签间隔值（添加更多极小值以支持极高缩放）
    const niceIntervals = [
      // 极小值支持
      1e-15, 2e-15, 5e-15,
      1e-14, 2e-14, 5e-14,
      1e-13, 2e-13, 5e-13,
      1e-12, 2e-12, 5e-12,
      1e-11, 2e-11, 5e-11,
      1e-10, 2e-10, 5e-10,
      1e-9, 2e-9, 5e-9,
      1e-8, 2e-8, 5e-8,
      1e-7, 2e-7, 5e-7,
      1e-6, 2e-6, 5e-6,
      0.000001, 0.000002, 0.000005, 
      0.00001, 0.00002, 0.00005, 
      0.0001, 0.0002, 0.0005, 
      0.001, 0.002, 0.005, 
      0.01, 0.02, 0.05, 
      0.1, 0.2, 0.5, 
      1, 2, 5, 
      10, 20, 50, 
      100, 200, 500, 
      1000, 2000, 5000, 
      10000, 20000, 50000,
      100000, 200000, 500000,
      1000000, 2000000, 5000000,
      // 超大值支持
      1e7, 2e7, 5e7,
      1e8, 2e8, 5e8,
      1e9, 2e9, 5e9,
      1e10, 2e10, 5e10,
      1e11, 2e11, 5e11,
      1e12, 2e12, 5e12,
      1e13, 2e13, 5e13,
      1e14, 2e14, 5e14
    ];
    
    // 确保至少有一个间隔，如果缩放太小，使用最小值
    if (worldUnitsPerMinDistance <= niceIntervals[0]) {
      console.log("使用最小间隔值:", niceIntervals[0], "当前计算所需:", worldUnitsPerMinDistance);
      return niceIntervals[0];
    }
    
    // 寻找大于等于所需间隔的最小美观值
    let optimalInterval = niceIntervals[niceIntervals.length - 1];
    for (const interval of niceIntervals) {
      if (interval >= worldUnitsPerMinDistance) {
        optimalInterval = interval;
        break;
      }
    }
    
    return optimalInterval;
  };


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

// 纯函数：构建网格元素配置
export const buildGrid = (bounds, viewScale, gridSize, unitRatio) => {
  // 性能优化：提前计算常用值，避免重复计算
  const { left, right, top, bottom } = bounds;
  const inverseScale = 1 / viewScale;
  
  // 计算当前LOD级别和网格大小
  const lodLevel = getLODLevel({ scale: viewScale });
  const mainGridSize = getLODGridSize(gridSize, { scale: viewScale });

  // 计算次要网格尺寸（仅在中等级别显示）
  const showSecondaryGrid = lodLevel >= 2 && lodLevel <= 5;
  const secondaryGridSize = mainGridSize / 10;

  // 性能优化：预先计算网格边界，避免循环中重复计算
  const startX = Math.floor(left / mainGridSize) * mainGridSize;
  const startY = Math.floor(top / mainGridSize) * mainGridSize;
  const endX = Math.ceil(right / mainGridSize) * mainGridSize;
  const endY = Math.ceil(bottom / mainGridSize) * mainGridSize;

  // 性能检查：估计网格线数量
  const estimatedHLines = Math.ceil((endY - startY) / mainGridSize);
  const estimatedVLines = Math.ceil((endX - startX) / mainGridSize);
  const maxGridLines = 1000;
  
  // 性能优化：提前退出，避免后续计算
  if (estimatedHLines + estimatedVLines > maxGridLines) {
    return null; // 表示需要递归调用以使用更低精度
  }

  // 性能优化：预分配数组大小
  const elements = [];
  const EPSILON = 1e-10;

  // 性能优化：避免在循环中重复创建相似的对象
  const lineDefaults = {
    mainLine: { stroke: '#ddd', strokeWidth: 1 * inverseScale },
    mainAxisLine: { stroke: '#999', strokeWidth: 1.5 * inverseScale },
    secondaryLine: { stroke: '#eee', strokeWidth: 0.5 * inverseScale },
    tickLine: { stroke: '#666', strokeWidth: 1 * inverseScale }
  };

  // 添加次要网格线 - 只在需要时计算
  if (showSecondaryGrid) {
    const secStartX = Math.floor(left / secondaryGridSize) * secondaryGridSize;
    const secStartY = Math.floor(top / secondaryGridSize) * secondaryGridSize;
    const secEndX = Math.ceil(right / secondaryGridSize) * secondaryGridSize;
    const secEndY = Math.ceil(bottom / secondaryGridSize) * secondaryGridSize;

    // 优化: 批量生成次要网格线
    for (let x = secStartX; x <= secEndX; x += secondaryGridSize) {
      // 跳过主网格线 - 优化判断
      if (Math.abs(x % mainGridSize) < EPSILON) continue;

      elements.push({
        type: 'line',
        config: {
          points: [x, top, x, bottom],
          ...lineDefaults.secondaryLine
        }
      });
    }

    for (let y = secStartY; y <= secEndY; y += secondaryGridSize) {
      // 跳过主网格线
      if (Math.abs(y % mainGridSize) < EPSILON) continue;

      elements.push({
        type: 'line',
        config: {
          points: [left, y, right, y],
          ...lineDefaults.secondaryLine
        }
      });
    }
  }

  // 添加主要网格线
  for (let x = startX; x <= endX; x += mainGridSize) {
    const isAxisLine = Math.abs(x) < EPSILON;
    elements.push({
      type: 'line',
      config: {
        points: [x, top, x, bottom],
        ...(isAxisLine ? lineDefaults.mainAxisLine : lineDefaults.mainLine)
      }
    });
  }

  for (let y = startY; y <= endY; y += mainGridSize) {
    const isAxisLine = Math.abs(y) < EPSILON;
    elements.push({
      type: 'line',
      config: {
        points: [left, y, right, y],
        ...(isAxisLine ? lineDefaults.mainAxisLine : lineDefaults.mainLine)
      }
    });
  }

  // 获取最佳标签间隔 - 动态计算
  const labelInterval = getOptimalLabelSpacing(viewScale);
  const fontSizeScaled = 12 * inverseScale;
  const tickLength = 3 * inverseScale;
  const textOffset = 5 * inverseScale;
  
  // 添加坐标轴标签
  const labelStartX = Math.floor(left / labelInterval) * labelInterval;
  const labelEndX = Math.ceil(right / labelInterval) * labelInterval;
  const labelStartY = Math.floor(top / labelInterval) * labelInterval;
  const labelEndY = Math.ceil(bottom / labelInterval) * labelInterval;
  const maxLabels = 100;
  let labelCount = 0;

  // X轴标签和刻度线 - 合并处理标签和刻度线
  for (let x = labelStartX; x <= labelEndX && labelCount < maxLabels; x += labelInterval) {
    if (Math.abs(x) < EPSILON) continue; // 跳过原点

    labelCount++;
    const labelValue = x * unitRatio;
    const formattedLabel = formatAxisLabel(labelValue);
    
    // 一次性添加标签和刻度线
    elements.push(
      {
        type: 'text',
        config: {
          x: x,
          y: textOffset,
          text: formattedLabel,
          fontSize: fontSizeScaled,
          fill: '#666',
          align: 'center',
          verticalAlign: 'top',
          offsetX: String(formattedLabel).length * 3 * inverseScale,
        }
      },
      {
        type: 'line',
        config: {
          points: [x, 0, x, tickLength],
          ...lineDefaults.tickLine
        }
      }
    );
  }

  // Y轴标签和刻度线
  labelCount = 0;
  for (let y = labelStartY; y <= labelEndY && labelCount < maxLabels; y += labelInterval) {
    if (Math.abs(y) < EPSILON) continue; // 跳过原点

    labelCount++;
    const labelValue = y * unitRatio;
    const formattedLabel = formatAxisLabel(labelValue);

    // 一次性添加标签和刻度线
    elements.push(
      {
        type: 'text',
        config: {
          x: textOffset,
          y: y,
          text: formattedLabel,
          fontSize: fontSizeScaled,
          fill: '#666',
          align: 'left',
          verticalAlign: 'middle',
          offsetY: 6 * inverseScale,
        }
      },
      {
        type: 'line',
        config: {
          points: [0, y, tickLength, y],
          ...lineDefaults.tickLine
        }
      }
    );
  }

  // 原点标记和标签
  elements.push(
    {
      type: 'circle',
      config: {
        x: 0,
        y: 0,
        radius: 3 * inverseScale,
        fill: 'red',
        stroke: 'white',
        strokeWidth: inverseScale,
      }
    },
    {
      type: 'text',
      config: {
        x: textOffset,
        y: textOffset,
        text: '(0,0)',
        fontSize: fontSizeScaled,
        fill: 'red',
        padding: 2,
      }
    }
  );

  return elements;
};
