/**
 * 高级绘图支持模块
 * 
 * 提供完整的绘图功能支持，包括：
 * - 多种绘图工具（钢笔、画笔、荧光笔、橡皮擦等）
 * - 压力敏感和倾斜感知输入
 * - 撤销/重做历史记录
 * - 画布大小自适应
 * - 多种线条样式和效果
 * 
 * @module AdvancedDrawingSupport
 * @version 1.0.0
 * @license MIT
 * @example
 * // 基本用法
 * const drawingManager = createDrawingManager({
 *   eventManager: editorEventManager,
 *   documentModel: docModel,
 *   container: document.getElementById('drawing-container')
 * });
 * 
 * drawingManager.enable();
 * drawingManager.setTool(DrawingToolType.PEN);
 * 
 * @example
 * // 自定义工具样式
 * drawingManager.setToolStyle(DrawingToolType.BRUSH, {
 *   color: '#ff0000',
 *   width: 8,
 *   opacity: 0.7
 * });
 */

/**
 * 绘图工具类型枚举
 * @enum {string}
 * @property {string} PEN - 钢笔工具，用于精确线条绘制
 * @property {string} BRUSH - 画笔工具，模拟真实画笔效果
 * @property {string} HIGHLIGHTER - 荧光笔工具，半透明高亮效果
 * @property {string} ERASER - 橡皮擦工具，擦除已有内容
 * @property {string} SHAPE - 形状工具，绘制基本几何形状
 * @property {string} LINE - 直线工具，绘制直线
 * @property {string} ARROW - 箭头工具，绘制带箭头的线条
 * @property {string} TEXT - 文本注释工具，添加文字标注
 * @property {string} SELECTOR - 选择工具，选择和操作已有绘图元素
 */


/**
 * 笔画样式定义
 * @typedef {Object} StrokeStyle
 * @property {string} color - 线条颜色，支持CSS颜色值
 * @property {number} width - 线条宽度(像素)
 * @property {number} opacity - 不透明度(0-1)
 * @property {string} lineCap - 线条端点样式('butt', 'round', 'square')
 * @property {string} lineJoin - 线条连接样式('round', 'bevel', 'miter')
 * @property {number[]} dashPattern - 虚线模式数组，如[5,3]表示5像素实线3像素空白
 */

/**
 * 创建绘图管理器
 * 
 * @param {Object} options - 配置选项
 * @param {Object} options.eventManager - 事件管理器实例，用于处理绘图事件
 * @param {Object} options.documentModel - 文档模型实例，用于数据持久化
 * @param {HTMLElement} options.container - 绘图容器元素
 * @returns {Object} 绘图管理器API
 * 
 * @typedef {Object} DrawingManagerAPI
 * @property {Function} enable - 启用绘图模式
 * @property {Function} disable - 禁用绘图模式
 * @property {Function} setTool - 设置当前绘图工具
 * @property {Function} setToolStyle - 设置工具样式
 * @property {Function} undo - 撤销上一个操作
 * @property {Function} redo - 重做上一个撤销的操作
 * @property {Function} clearCanvas - 清空画布
 * @property {Function} saveAsImage - 将绘图保存为图像
 * @property {Function} getCurrentTool - 获取当前工具类型
 * @property {Function} getToolStyle - 获取指定工具的样式
 * @property {Function} isEnabled - 检查绘图模式是否启用
 * @property {Function} isDrawing - 检查是否正在绘制
 * @property {Function} getStrokeCount - 获取当前笔画数量
 * @property {Function} cleanup - 清理资源
 */


/**
 * 笔画样式对象
 * @typedef {Object} StrokeStyle
 * @property {string} color - 颜色值
 * @property {number} width - 线条宽度
 * @property {number} opacity - 不透明度 (0-1)
 * @property {string} lineCap - 线条端点样式
 * @property {string} lineJoin - 线条连接样式
 * @property {number[]} dashPattern - 虚线模式
 */

/**
 * 创建绘图管理器
 * 
 * @param {Object} options - 配置选项
 * @param {Object} options.eventManager - 事件管理器实例
 * @param {Object} options.documentModel - 文档模型实例
 * @param {HTMLElement} options.container - 绘图容器元素
 * @returns {Object} 绘图管理器API
 */
export const createDrawingManager = (options = {}) => {
  const {
    eventManager = null,
    documentModel = null,
    container = null
  } = options;
  
  if (!eventManager || !documentModel) {
    throw new Error('绘图管理器需要事件管理器和文档模型实例');
  }
  
  if (!container) {
    throw new Error('绘图管理器需要一个容器元素');
  }
  
  // 绘图状态
  const drawingState = {
    active: false,           // 绘图模式是否激活
    currentTool: DrawingToolType.PEN, // 当前选中的工具
    isDrawing: false,        // 是否正在绘制
    currentStroke: null,     // 当前绘制的笔画
    strokes: [],             // 所有笔画的集合
    canvas: null,            // 绘图画布
    ctx: null,               // 绘图上下文
    defaultStyle: {          // 默认样式
      color: '#000000',
      width: 2,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round',
      dashPattern: []
    },
    toolStyles: {            // 工具特定样式
      [DrawingToolType.PEN]: {
        color: '#000000',
        width: 2,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round'
      },
      [DrawingToolType.BRUSH]: {
        color: '#3366cc',
        width: 5,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round'
      },
      [DrawingToolType.HIGHLIGHTER]: {
        color: '#ffff00',
        width: 10,
        opacity: 0.4,
        lineCap: 'square',
        lineJoin: 'miter'
      },
      [DrawingToolType.ERASER]: {
        color: '#ffffff',
        width: 10,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round'
      }
    },
    history: {               // 操作历史
      undoStack: [],
      redoStack: [],
      maxSize: 50
    }
  };
  
  /**
   * 初始化绘图画布
   * @returns {boolean} 是否成功初始化
   */
  const initCanvas = () => {
    try {
      // 创建canvas元素
      const canvas = document.createElement('canvas');
      canvas.className = 'editor-drawing-canvas';
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.pointerEvents = 'none'; // 允许事件穿透到下层
      
      // 设置画布尺寸
      const updateCanvasSize = () => {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      };
      
      updateCanvasSize();
      
      // 监听容器大小变化
      const resizeObserver = new ResizeObserver(updateCanvasSize);
      resizeObserver.observe(container);
      
      // 获取绘图上下文
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('无法获取绘图上下文');
      }
      
      // 设置默认样式
      applyStyle(ctx, drawingState.defaultStyle);
      
      // 存储画布和上下文
      drawingState.canvas = canvas;
      drawingState.ctx = ctx;
      drawingState.resizeObserver = resizeObserver;
      
      // 添加到容器
      container.appendChild(canvas);
      
      return true;
    } catch (error) {
      console.error('初始化绘图画布失败:', error);
      return false;
    }
  };
  
  /**
   * 应用样式到绘图上下文
   * @param {CanvasRenderingContext2D} ctx - 绘图上下文
   * @param {StrokeStyle} style - 要应用的样式
   */
  const applyStyle = (ctx, style) => {
    if (!ctx) return;
    
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width;
    ctx.globalAlpha = style.opacity;
    ctx.lineCap = style.lineCap;
    ctx.lineJoin = style.lineJoin;
    
    // 设置虚线模式（如果有）
    if (style.dashPattern && style.dashPattern.length > 0) {
      ctx.setLineDash(style.dashPattern);
    } else {
      ctx.setLineDash([]);
    }
  };
  
  /**
   * 获取当前工具的样式
   * @returns {StrokeStyle} 当前工具的样式
   */
  const getCurrentToolStyle = () => {
    return drawingState.toolStyles[drawingState.currentTool] || drawingState.defaultStyle;
  };
  
  /**
   * 开始一个新的笔画
   * @param {number} x - 起始x坐标
   * @param {number} y - 起始y坐标
   * @param {Object} inputData - 输入设备数据
   */
  const startStroke = (x, y, inputData = {}) => {
    if (!drawingState.active || !drawingState.ctx) return;
    
    // 结束当前的笔画（如果有）
    if (drawingState.isDrawing) {
      endStroke();
    }
    
    // 获取当前工具样式
    const style = getCurrentToolStyle();
    
    // 为特殊输入设备调整样式
    const adjustedStyle = adjustStyleForInput(style, inputData);
    
    // 创建新笔画
    drawingState.currentStroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tool: drawingState.currentTool,
      style: adjustedStyle,
      points: [{ x, y, pressure: inputData.pressure || 1, time: Date.now() }],
      bounds: { minX: x, minY: y, maxX: x, maxY: y }
    };
    
    // 更新绘图状态
    drawingState.isDrawing = true;
    
    // 应用样式
    applyStyle(drawingState.ctx, adjustedStyle);
    
    // 开始路径
    drawingState.ctx.beginPath();
    drawingState.ctx.moveTo(x, y);
    
    // 触发笔画开始事件
    if (eventManager) {
      eventManager.core.dispatch('drawingStrokeStart', null, {
        strokeId: drawingState.currentStroke.id,
        tool: drawingState.currentTool,
        position: { x, y },
        timestamp: Date.now()
      });
    }
  };
  
  /**
   * 根据输入设备数据调整样式
   * @param {StrokeStyle} baseStyle - 基础样式
   * @param {Object} inputData - 输入设备数据
   * @returns {StrokeStyle} 调整后的样式
   */
  const adjustStyleForInput = (baseStyle, inputData = {}) => {
    // 创建样式副本
    const adjustedStyle = { ...baseStyle };
    
    // 根据压力调整宽度（如果支持）
    if (typeof inputData.pressure === 'number' && inputData.pressure > 0) {
      // 计算压力调整的宽度
      adjustedStyle.width = Math.max(1, baseStyle.width * inputData.pressure);
    }
    
    // 根据笔倾斜调整样式（如果支持）
    if (inputData.tilt && typeof inputData.tilt.magnitude === 'number') {
      // 根据倾斜角度调整透明度
      const tiltFactor = Math.min(1, inputData.tilt.magnitude / 45);
      adjustedStyle.opacity = Math.max(0.3, baseStyle.opacity * (1 - tiltFactor * 0.5));
      
      // 对于画笔工具，可以根据倾斜调整笔触形状
      if (drawingState.currentTool === DrawingToolType.BRUSH) {
        // 高级样式调整可在此添加
      }
    }
    
    return adjustedStyle;
  };
  
  /**
   * 继续当前笔画
   * @param {number} x - 当前x坐标
   * @param {number} y - 当前y坐标
   * @param {Object} inputData - 输入设备数据
   */
  const continueStroke = (x, y, inputData = {}) => {
    if (!drawingState.isDrawing || !drawingState.currentStroke || !drawingState.ctx) return;
    
    // 添加点到当前笔画
    drawingState.currentStroke.points.push({
      x, 
      y, 
      pressure: inputData.pressure || 1,
      time: Date.now()
    });
    
    // 更新笔画边界
    const bounds = drawingState.currentStroke.bounds;
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.maxY = Math.max(bounds.maxY, y);
    
    // 根据工具类型绘制
    switch (drawingState.currentTool) {
      case DrawingToolType.ERASER:
        drawWithEraser(x, y, inputData);
        break;
        
      case DrawingToolType.HIGHLIGHTER:
        drawWithHighlighter(x, y, inputData);
        break;
        
      case DrawingToolType.BRUSH:
        drawWithBrush(x, y, inputData);
        break;
        
      case DrawingToolType.PEN:
      default:
        drawWithPen(x, y, inputData);
        break;
    }
    
    // 触发笔画更新事件
    if (eventManager) {
      eventManager.core.dispatch('drawingStrokeUpdate', null, {
        strokeId: drawingState.currentStroke.id,
        position: { x, y },
        pressure: inputData.pressure,
        timestamp: Date.now()
      });
    }
  };
  
  /**
   * 使用钢笔工具绘制
   * @param {number} x - 当前x坐标
   * @param {number} y - 当前y坐标
   * @param {Object} inputData - 输入设备数据
   */
  const drawWithPen = (x, y, inputData = {}) => {
    const ctx = drawingState.ctx;
    const stroke = drawingState.currentStroke;
    
    // 获取当前点和前一个点
    const points = stroke.points;
    const prevPoint = points[points.length - 2];
    const currentPoint = points[points.length - 1];
    
    // 如果有压力数据，动态调整线宽
    if (typeof inputData.pressure === 'number' && inputData.pressure > 0) {
      const baseWidth = stroke.style.width;
      ctx.lineWidth = baseWidth * inputData.pressure;
    }
    
    // 绘制线段
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // 如果需要平滑曲线，可以使用贝塞尔曲线
    // 这需要至少三个点
    if (points.length >= 3) {
      // 使用最近三个点绘制平滑曲线
      // 在生产环境中可以实现
    }
  };
  
  /**
   * 使用画笔工具绘制
   * @param {number} x - 当前x坐标
   * @param {number} y - 当前y坐标
   * @param {Object} inputData - 输入设备数据
   */
  const drawWithBrush = (x, y, inputData = {}) => {
    const ctx = drawingState.ctx;
    const stroke = drawingState.currentStroke;
    
    // 获取当前点和前一个点
    const points = stroke.points;
    const prevPoint = points[points.length - 2];
    
    // 计算基于压力和倾斜的画笔宽度
    let brushWidth = stroke.style.width;
    if (typeof inputData.pressure === 'number') {
      brushWidth *= Math.max(0.1, inputData.pressure);
    }
    
    // 绘制画笔线段
    ctx.lineWidth = brushWidth;
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // 画笔效果可以更高级，例如添加纹理或变形
    // 在生产实现中可以添加
  };
  
  /**
   * 使用荧光笔工具绘制
   * @param {number} x - 当前x坐标
   * @param {number} y - 当前y坐标
   * @param {Object} inputData - 输入设备数据
   */
  const drawWithHighlighter = (x, y, inputData = {}) => {
    const ctx = drawingState.ctx;
    
    // 荧光笔通常用合成模式来实现突出显示效果
    ctx.globalCompositeOperation = 'multiply';
    
    // 绘制线段
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // 恢复默认合成模式
    ctx.globalCompositeOperation = 'source-over';
  };
  
  /**
   * 使用橡皮擦工具绘制
   * @param {number} x - 当前x坐标
   * @param {number} y - 当前y坐标
   * @param {Object} inputData - 输入设备数据
   */
  const drawWithEraser = (x, y, inputData = {}) => {
    const ctx = drawingState.ctx;
    
    // 保存当前上下文状态
    ctx.save();
    
    // 设置橡皮擦模式
    ctx.globalCompositeOperation = 'destination-out';
    
    // 计算橡皮擦大小
    let eraserSize = drawingState.toolStyles[DrawingToolType.ERASER].width;
    if (typeof inputData.pressure === 'number') {
      eraserSize *= Math.max(0.5, inputData.pressure);
    }
    
    // 绘制线段
    ctx.lineWidth = eraserSize;
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // 恢复上下文状态
    ctx.restore();
  };
  
  /**
   * 结束当前笔画
   */
  const endStroke = () => {
    if (!drawingState.isDrawing || !drawingState.currentStroke) return;
    
    // 闭合路径
    if (drawingState.ctx) {
      drawingState.ctx.closePath();
    }
    
    // 添加到笔画集合
    drawingState.strokes.push(drawingState.currentStroke);
    
    // 添加到撤销历史
    drawingState.history.undoStack.push({
      type: 'add',
      stroke: drawingState.currentStroke
    });
    
    // 清空重做历史
    drawingState.history.redoStack = [];
    
    // 限制撤销栈大小
    if (drawingState.history.undoStack.length > drawingState.history.maxSize) {
      drawingState.history.undoStack.shift();
    }
    
    // 触发笔画结束事件
    if (eventManager) {
      eventManager.core.dispatch('drawingStrokeEnd', null, {
        strokeId: drawingState.currentStroke.id,
        tool: drawingState.currentTool,
        pointCount: drawingState.currentStroke.points.length,
        bounds: drawingState.currentStroke.bounds,
        timestamp: Date.now()
      });
    }
    
    // 重置当前笔画
    drawingState.currentStroke = null;
    drawingState.isDrawing = false;
  };
  
  /**
   * 撤销上一个操作
   * @returns {boolean} 是否成功撤销
   */
  const undo = () => {
    if (drawingState.history.undoStack.length === 0) return false;
    
    // 获取上一个操作
    const operation = drawingState.history.undoStack.pop();
    
    // 添加到重做栈
    drawingState.history.redoStack.push(operation);
    
    // 根据操作类型执行撤销
    switch (operation.type) {
      case 'add':
        // 删除笔画
        const index = drawingState.strokes.findIndex(stroke => 
          stroke.id === operation.stroke.id
        );
        
        if (index !== -1) {
          drawingState.strokes.splice(index, 1);
        }
        break;
        
      case 'delete':
        // 恢复笔画
        drawingState.strokes.push(operation.stroke);
        break;
        
      case 'clear':
        // 恢复所有笔画
        drawingState.strokes = [...operation.strokes];
        break;
    }
    
    // 重绘画布
    redrawCanvas();
    
    // 触发撤销事件
    if (eventManager) {
      eventManager.core.dispatch('drawingUndo', null, {
        operationType: operation.type,
        timestamp: Date.now()
      });
    }
    
    return true;
  };
  
  /**
   * 重做上一个撤销的操作
   * @returns {boolean} 是否成功重做
   */
  const redo = () => {
    if (drawingState.history.redoStack.length === 0) return false;
    
    // 获取上一个重做操作
    const operation = drawingState.history.redoStack.pop();
    
    // 添加到撤销栈
    drawingState.history.undoStack.push(operation);
    
    // 根据操作类型执行重做
    switch (operation.type) {
      case 'add':
        // 添加笔画
        drawingState.strokes.push(operation.stroke);
        break;
        
      case 'delete':
        // 删除笔画
        const index = drawingState.strokes.findIndex(stroke => 
          stroke.id === operation.stroke.id
        );
        
        if (index !== -1) {
          drawingState.strokes.splice(index, 1);
        }
        break;
        
      case 'clear':
        // 清空所有笔画
        drawingState.strokes = [];
        break;
    }
    
    // 重绘画布
    redrawCanvas();
    
    // 触发重做事件
    if (eventManager) {
      eventManager.core.dispatch('drawingRedo', null, {
        operationType: operation.type,
        timestamp: Date.now()
      });
    }
    
    return true;
  };
  
  /**
   * 清空画布
   * @returns {boolean} 是否成功清空
   */
  const clearCanvas = () => {
    if (drawingState.strokes.length === 0) return false;
    
    // 保存当前笔画用于撤销
    const oldStrokes = [...drawingState.strokes];
    
    // 添加到撤销历史
    drawingState.history.undoStack.push({
      type: 'clear',
      strokes: oldStrokes
    });
    
    // 清空重做历史
    drawingState.history.redoStack = [];
    
    // 清空笔画集合
    drawingState.strokes = [];
    
    // 清空画布
    if (drawingState.ctx && drawingState.canvas) {
      drawingState.ctx.clearRect(0, 0, drawingState.canvas.width, drawingState.canvas.height);
    }
    
    // 触发清空事件
    if (eventManager) {
      eventManager.core.dispatch('drawingClear', null, {
        strokeCount: oldStrokes.length,
        timestamp: Date.now()
      });
    }
    
    return true;
  };
  
  /**
   * 重绘整个画布
   */
  const redrawCanvas = () => {
    if (!drawingState.ctx || !drawingState.canvas) return;
    
    // 清空画布
    drawingState.ctx.clearRect(0, 0, drawingState.canvas.width, drawingState.canvas.height);
    
    // 绘制所有笔画
    drawingState.strokes.forEach(stroke => {
      // 设置样式
      applyStyle(drawingState.ctx, stroke.style);
      
      // 根据工具类型选择绘制方法
      if (stroke.tool === DrawingToolType.ERASER) {
        drawStrokeWithEraser(stroke);
      } else {
        drawStrokeNormal(stroke);
      }
    });
  };
  
  /**
   * 绘制正常笔画
   * @param {Object} stroke - 笔画对象
   */
  const drawStrokeNormal = (stroke) => {
    if (!drawingState.ctx || stroke.points.length === 0) return;
    
    const ctx = drawingState.ctx;
    const points = stroke.points;
    
    // 开始路径
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    // 对于简单的线条，直接连接点
    if (stroke.tool === DrawingToolType.PEN) {
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
    } 
    // 对于更平滑的曲线，使用贝塞尔曲线
    else if (points.length > 2) {
      // 创建平滑曲线
      for (let i = 1; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i+1];
        
        // 计算控制点
        const cp1x = p1.x;
        const cp1y = p1.y;
        const cp2x = (p1.x + p2.x) / 2;
        const cp2y = (p1.y + p2.y) / 2;
        
        // 绘制贝塞尔曲线段
        ctx.quadraticCurveTo(cp1x, cp1y, cp2x, cp2y);
      }
      
      // 最后一个点
      ctx.lineTo(points[points.length-1].x, points[points.length-1].y);
    } else {
      // 少于3个点，直接连接
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
    }
    
    // 绘制路径
    ctx.stroke();
    ctx.closePath();
  };
  
  /**
   * 使用橡皮擦绘制笔画
   * @param {Object} stroke - 笔画对象
   */
  const drawStrokeWithEraser = (stroke) => {
    if (!drawingState.ctx || stroke.points.length === 0) return;
    
    const ctx = drawingState.ctx;
    const points = stroke.points;
    
    // 保存当前状态
    ctx.save();
    
    // 设置橡皮擦模式
    ctx.globalCompositeOperation = 'destination-out';
    
    // 开始路径
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    // 连接所有点
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    
    // 绘制路径
    ctx.stroke();
    ctx.closePath();
    
    // 恢复状态
    ctx.restore();
  };
  
  /**
   * 设置当前绘图工具
   * @param {string} toolType - 工具类型
   * @returns {boolean} 是否成功设置
   */
  const setTool = (toolType) => {
    if (!Object.values(DrawingToolType).includes(toolType)) {
      return false;
    }
    
    drawingState.currentTool = toolType;
    
    // 触发工具变更事件
    if (eventManager) {
      eventManager.core.dispatch('drawingToolChange', null, {
        tool: toolType,
        timestamp: Date.now()
      });
    }
    
    return true;
  };
  
  /**
   * 设置工具样式
   * @param {string} toolType - 工具类型
   * @param {StrokeStyle} style - 样式对象
   * @returns {boolean} 是否成功设置
   */
  const setToolStyle = (toolType, style) => {
    if (!Object.values(DrawingToolType).includes(toolType)) {
      return false;
    }
    
    // 更新工具样式
    drawingState.toolStyles[toolType] = {
      ...drawingState.toolStyles[toolType],
      ...style
    };
    
    // 如果是当前工具，应用样式到上下文
    if (drawingState.currentTool === toolType && drawingState.ctx) {
      applyStyle(drawingState.ctx, drawingState.toolStyles[toolType]);
    }
    
    return true;
  };
  
  /**
   * 将绘图内容保存为图像
   * @param {string} format - 图像格式 ('png', 'jpeg', etc.)
   * @param {number} quality - 图像质量 (0-1)
   * @returns {string|null} 图像数据URL或null
   */
  const saveAsImage = (format = 'png', quality = 0.9) => {
    if (!drawingState.canvas) return null;
    
    try {
      // 根据格式创建MIME类型
      const mimeType = `image/${format}`;
      
      // 转换画布为数据URL
      return drawingState.canvas.toDataURL(mimeType, quality);
    } catch (error) {
      console.error('保存绘图为图像失败:', error);
      return null;
    }
  };
  
  /**
   * 启用绘图模式
   * @returns {boolean} 是否成功启用
   */
  const enable = () => {
    if (drawingState.active) return false;
    
    // 初始化画布（如果尚未初始化）
    if (!drawingState.canvas || !drawingState.ctx) {
      if (!initCanvas()) {
        return false;
      }
    }
    
    // 更新状态
    drawingState.active = true;
    
    // 重绘画布
    redrawCanvas();
    
    // 触发启用事件
    if (eventManager) {
      eventManager.core.dispatch('drawingEnabled', null, {
        timestamp: Date.now()
      });
    }
    
    return true;
  };
  
  /**
   * 禁用绘图模式
   * @returns {boolean} 是否成功禁用
   */
  const disable = () => {
    if (!drawingState.active) return false;
    
    // 结束当前笔画（如果有）
    if (drawingState.isDrawing) {
      endStroke();
    }
    
    // 更新状态
    drawingState.active = false;
    
    // 触发禁用事件
    if (eventManager) {
      eventManager.core.dispatch('drawingDisabled', null, {
        timestamp: Date.now()
      });
    }
    
    return true;
  };
  
  /**
   * 绑定事件处理器
   */
  const bindEventHandlers = () => {
    if (!eventManager) return null;
    
    const handlers = {
      // 处理数位笔输入
      editorStylusInput: (event) => {
        if (!drawingState.active) return;
        
        const input = event.detail;
        const position = input.position;
        
        // 根据事件类型执行不同操作
        switch (input.type) {
          case 'pointerdown':
            startStroke(position.x, position.y, input);
            break;
            
          case 'pointermove':
            if (drawingState.isDrawing) {
              continueStroke(position.x, position.y, input);
            }
            break;
            
          case 'pointerup':
          case 'pointercancel':
            if (drawingState.isDrawing) {
              endStroke();
            }
            break;
        }
      },
      
      // 处理鼠标输入
      mousedown: (event) => {
        if (!drawingState.active) return;
        
        // 仅处理左键点击
        if (event.button !== 0) return;
        
        // 开始笔画
        startStroke(event.clientX, event.clientY);
      },
      
      mousemove: (event) => {
        if (!drawingState.active || !drawingState.isDrawing) return;
        
        // 继续笔画
        continueStroke(event.clientX, event.clientY);
      },
      
      mouseup: (event) => {
        if (!drawingState.active || !drawingState.isDrawing) return;
        
        // 结束笔画
        endStroke();
      },
      
      // 键盘快捷键
      keydown: (event) => {
        if (!drawingState.active) return;
        
        // Esc键 - 取消当前绘制
        if (event.key === 'Escape' && drawingState.isDrawing) {
          drawingState.currentStroke = null;
          drawingState.isDrawing = false;
          redrawCanvas();
        }
        
        // Ctrl+Z - 撤销
        if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
          undo();
        }
        
        // Ctrl+Y - 重做
        if (event.key === 'y' && (event.ctrlKey || event.metaKey)) {
          redo();
        }
      }
    };
    
    // 绑定事件处理器
    const boundHandlers = new Map();
    
    // 事件管理器事件
    eventManager.core.on('editorStylusInput', handlers.editorStylusInput);
    boundHandlers.set('editorStylusInput', handlers.editorStylusInput);
    
    // DOM事件
    container.addEventListener('mousedown', handlers.mousedown);
    document.addEventListener('mousemove', handlers.mousemove);
    document.addEventListener('mouseup', handlers.mouseup);
    document.addEventListener('keydown', handlers.keydown);
    
    boundHandlers.set('mousedown', handlers.mousedown);
    boundHandlers.set('mousemove', handlers.mousemove);
    boundHandlers.set('mouseup', handlers.mouseup);
    boundHandlers.set('keydown', handlers.keydown);
    
    // 返回清理函数
    return {
      cleanup: () => {
        // 移除事件管理器事件
        eventManager.core.off('editorStylusInput', handlers.editorStylusInput);
        
        // 移除DOM事件
        container.removeEventListener('mousedown', handlers.mousedown);
        document.removeEventListener('mousemove', handlers.mousemove);
        document.removeEventListener('mouseup', handlers.mouseup);
        document.removeEventListener('keydown', handlers.keydown);
      }
    };
  };
  
  // 初始化
  let initialized = false;
  let eventBindings = null;
  
  /**
   * 初始化绘图管理器
   */
  const init = () => {
    if (initialized) return false;
    
    // 初始化画布
    if (!initCanvas()) {
      return false;
    }
    
    // 绑定事件处理器
    eventBindings = bindEventHandlers();
    
    initialized = true;
    return true;
  };
  
  /**
   * 清理绘图管理器
   */
  const cleanup = () => {
    if (!initialized) return false;
    
    // 清理事件绑定
    if (eventBindings && typeof eventBindings.cleanup === 'function') {
      eventBindings.cleanup();
    }
    
    // 移除画布
    if (drawingState.canvas && drawingState.canvas.parentNode) {
      drawingState.canvas.parentNode.removeChild(drawingState.canvas);
    }
    
    // 断开ResizeObserver
    if (drawingState.resizeObserver) {
      drawingState.resizeObserver.disconnect();
    }
    
    initialized = false;
    return true;
  };
  
  // 初始化
  init();
  
  // 返回公共API
  return {
    enable,
    disable,
    setTool,
    setToolStyle,
    undo,
    redo,
    clearCanvas,
    saveAsImage,
    getCurrentTool: () => drawingState.currentTool,
    getToolStyle: (toolType) => ({ ...drawingState.toolStyles[toolType] }),
    isEnabled: () => drawingState.active,
    isDrawing: () => drawingState.isDrawing,
    getStrokeCount: () => drawingState.strokes.length,
    cleanup
  };
}; 