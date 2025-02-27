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
  
  // 生成次要网格线
  const generateSecondaryGridLines = (bounds, params) => {
    const { left, right, top, bottom } = bounds;
    const { secondaryGridSize, mainGridSize, showSecondaryGrid, lineDefaults } = params;
    const elements = [];
    const EPSILON = 1e-10;
    
    if (!showSecondaryGrid) return elements;
    
    const secStartX = Math.floor(left / secondaryGridSize) * secondaryGridSize;
    const secStartY = Math.floor(top / secondaryGridSize) * secondaryGridSize;
    const secEndX = Math.ceil(right / secondaryGridSize) * secondaryGridSize;
    const secEndY = Math.ceil(bottom / secondaryGridSize) * secondaryGridSize;
  
    for (let x = secStartX; x <= secEndX; x += secondaryGridSize) {
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
      if (Math.abs(y % mainGridSize) < EPSILON) continue;
      elements.push({
        type: 'line',
        config: {
          points: [left, y, right, y],
          ...lineDefaults.secondaryLine
        }
      });
    }
    
    return elements;
  };
  
  // 生成主要网格线
  const generateMainGridLines = (bounds, params) => {
    const { top, bottom, left, right } = bounds;
    const { startX, endX, startY, endY, mainGridSize, lineDefaults } = params;
    const elements = [];
    const EPSILON = 1e-10;
  
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
    
    return elements;
  };
  
  // 生成坐标轴标签和刻度线
  const generateAxisLabelsAndTicks = (bounds, params, viewScale, unitRatio) => {
    const { left, right, top, bottom } = bounds;
    const { inverseScale, lineDefaults } = params;
    const elements = [];
    const EPSILON = 1e-10;
    
    // 获取最佳标签间隔
    const labelInterval = getOptimalLabelSpacing(viewScale);
    const fontSizeScaled = 12 * inverseScale;
    const tickLength = 3 * inverseScale;
    const textOffset = 5 * inverseScale;
    
    const labelStartX = Math.floor(left / labelInterval) * labelInterval;
    const labelEndX = Math.ceil(right / labelInterval) * labelInterval;
    const labelStartY = Math.floor(top / labelInterval) * labelInterval;
    const labelEndY = Math.ceil(bottom / labelInterval) * labelInterval;
    const maxLabels = 100;
    
    // X轴标签和刻度线
    let labelCount = 0;
    for (let x = labelStartX; x <= labelEndX && labelCount < maxLabels; x += labelInterval) {
      if (Math.abs(x) < EPSILON) continue; // 跳过原点
  
      labelCount++;
      const labelValue = x * unitRatio;
      const formattedLabel = formatAxisLabel(labelValue);
      
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
    
    return elements;
  };
  
  // 生成原点标记和标签
  const generateOriginMarker = (inverseScale, textOffset, fontSizeScaled) => {
    return [
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
    ];
  };
  
  // 纯函数：构建网格元素配置 - 重构为调用上述辅助函数
  export const buildGrid = (bounds, viewScale, gridSize, unitRatio) => {
    // 准备参数
    const params = prepareGridParameters(bounds, viewScale, gridSize);
    
    // 性能优化：提前退出，避免后续计算
    if (params.estimatedHLines + params.estimatedVLines > params.maxGridLines) {
      return null; // 表示需要递归调用以使用更低精度
    }
  
    // 收集所有网格元素
    const elements = [
      ...generateSecondaryGridLines(bounds, params),
      ...generateMainGridLines(bounds, params),
      ...generateAxisLabelsAndTicks(bounds, params, viewScale, unitRatio),
      ...generateOriginMarker(params.inverseScale, 5 * params.inverseScale, 12 * params.inverseScale)
    ];
  
    return elements;
  };
  