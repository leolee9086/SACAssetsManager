export function drawGrid(gridLayer, gridConfig, coordinateManager) {
    if (!gridLayer || !gridConfig.enabled) return;
    
    gridLayer.destroyChildren();
    
    const parentSize = coordinateManager.getParentSize();
    const gridSize = gridConfig.size;
    const scroll = coordinateManager.getScrollOffset();
    
    // 创建网格图案
    const patternCanvas = createGridPattern(gridSize, gridConfig.color);
    
    // 创建填充了网格图案的矩形
    const gridRect = new Konva.Rect({
        x: scroll.scrollLeft,
        y: scroll.scrollTop,
        width: parentSize.width,
        height: parentSize.height,
        fillPatternImage: patternCanvas,
        fillPatternOffset: {
            x: scroll.scrollLeft % gridSize,
            y: scroll.scrollTop % gridSize
        },
        listening: false
    });
    
    gridLayer.add(gridRect);
    
    // 只在主要网格线处添加坐标标签
    if (gridConfig.showCoordinates) {
        addCoordinateLabels(gridLayer, scroll, parentSize, gridSize * 5, gridConfig.color);
    }
    
    gridLayer.batchDraw();
}

// 创建网格图案
function createGridPattern(gridSize, color) {
    // 创建一个离屏canvas来生成图案
    const patternCanvas = document.createElement('canvas');
    const size = gridSize;
    patternCanvas.width = size;
    patternCanvas.height = size;
    
    const ctx = patternCanvas.getContext('2d');
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    
    // 绘制网格线
    ctx.beginPath();
    // 右边线
    ctx.moveTo(size - 0.5, 0);
    ctx.lineTo(size - 0.5, size);
    // 底边线
    ctx.moveTo(0, size - 0.5);
    ctx.lineTo(size, size - 0.5);
    ctx.stroke();
    
    return patternCanvas;
}

function addCoordinateLabels(gridLayer, scroll, parentSize, majorGridSize, color) {
    const labels = new Konva.Group({
        listening: false
    });
    
    // 计算起始点
    const startX = Math.floor(scroll.scrollLeft / majorGridSize) * majorGridSize;
    const startY = Math.floor(scroll.scrollTop / majorGridSize) * majorGridSize;
    
    // 使用缓存的文本样式
    const textConfig = {
        fontSize: 10,
        fill: color,
        listening: false
    };
    
    // 批量添加X轴标签
    for (let x = startX; x <= startX + parentSize.width; x += majorGridSize) {
        labels.add(new Konva.Text({
            ...textConfig,
            x: x + 2,
            y: scroll.scrollTop + 2,
            text: x.toString()
        }));
    }
    
    // 批量添加Y轴标签
    for (let y = startY; y <= startY + parentSize.height; y += majorGridSize) {
        labels.add(new Konva.Text({
            ...textConfig,
            x: scroll.scrollLeft + 2,
            y: y + 2,
            text: y.toString()
        }));
    }
    
    gridLayer.add(labels);
}

// 标尺绘制也可以使用类似的优化方式
export function drawRulers(rulerLayer, gridConfig, coordinateManager) {
    if (!rulerLayer) return;
    
    rulerLayer.destroyChildren();
    
    const parentSize = coordinateManager.getParentSize();
    const rulerWidth = 20;
    const scroll = coordinateManager.getScrollOffset();
    const gridSize = gridConfig.size;
    
    // 创建一个组来包含所有标尺元素
    const rulerGroup = new Konva.Group({
        listening: false
    });
    
    // 创建标尺图案
    const horizontalRulerPattern = createRulerPattern(gridSize, rulerWidth, 'horizontal');
    const verticalRulerPattern = createRulerPattern(gridSize, rulerWidth, 'vertical');
    
    // 水平标尺背景
    const horizontalRuler = new Konva.Rect({
        x: scroll.scrollLeft,
        y: scroll.scrollTop,
        width: parentSize.width,
        height: rulerWidth,
        fillPatternImage: horizontalRulerPattern,
        fillPatternOffset: {
            x: scroll.scrollLeft % (gridSize * 5),
            y: 0
        },
        listening: false,
        stroke: '#999',
        strokeWidth: 1
    });
    
    // 垂直标尺背景
    const verticalRuler = new Konva.Rect({
        x: scroll.scrollLeft,
        y: scroll.scrollTop,
        width: rulerWidth,
        height: parentSize.height,
        fillPatternImage: verticalRulerPattern,
        fillPatternOffset: {
            x: 0,
            y: scroll.scrollTop % (gridSize * 5)
        },
        listening: false,
        stroke: '#999',
        strokeWidth: 1
    });
    
    // 添加标尺文本
    const rulerTexts = createRulerTexts(scroll, parentSize, gridSize * 5);
    
    // 先添加到组
    rulerGroup.add(horizontalRuler, verticalRuler, rulerTexts);
    
    // 将组添加到图层
    rulerLayer.add(rulerGroup);
    
    // 确保标尺层在最上层
    if (rulerLayer.getParent()) {
        const stage = rulerLayer.getParent();
        rulerLayer.remove();
        stage.add(rulerLayer);
    }
    
    rulerLayer.batchDraw();
}

// 新增函数：创建标尺文本
function createRulerTexts(scroll, parentSize, majorGridSize) {
    const textGroup = new Konva.Group({
        listening: false
    });
    
    const startX = Math.floor(scroll.scrollLeft / majorGridSize) * majorGridSize;
    const startY = Math.floor(scroll.scrollTop / majorGridSize) * majorGridSize;
    
    // 文本样式配置
    const textConfig = {
        fontSize: 10,
        fontStyle: 'bold',
        fill: '#333',
        listening: false
    };
    
    // 添加水平标尺文本
    for (let x = startX; x <= startX + parentSize.width; x += majorGridSize) {
        textGroup.add(new Konva.Text({
            ...textConfig,
            x: x + 2,
            y: scroll.scrollTop + 2,
            text: x.toString()
        }));
    }
    
    // 添加垂直标尺文本
    for (let y = startY; y <= startY + parentSize.height; y += majorGridSize) {
        const text = new Konva.Text({
            ...textConfig,
            x: scroll.scrollLeft + 2,
            y: y + 2,
            text: y.toString()
        });
        textGroup.add(text);
    }
    
    return textGroup;
}

// 修改createRulerPattern函数，移除文本绘制
function createRulerPattern(gridSize, rulerWidth, orientation) {
    const patternCanvas = document.createElement('canvas');
    const majorGridSize = gridSize * 5;
    
    if (orientation === 'horizontal') {
        patternCanvas.width = majorGridSize;
        patternCanvas.height = rulerWidth;
    } else {
        patternCanvas.width = rulerWidth;
        patternCanvas.height = majorGridSize;
    }
    
    const ctx = patternCanvas.getContext('2d');
    
    // 背景
    ctx.fillStyle = '#e6e6e6';
    ctx.fillRect(0, 0, patternCanvas.width, patternCanvas.height);
    
    // 刻度线
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    
    if (orientation === 'horizontal') {
        // 主刻度
        ctx.beginPath();
        ctx.moveTo(0, rulerWidth);
        ctx.lineTo(0, 0);
        ctx.stroke();
        
        // 次刻度
        for (let x = gridSize; x < majorGridSize; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, rulerWidth);
            ctx.lineTo(x, rulerWidth / 2);
            ctx.stroke();
        }
    } else {
        // 主刻度
        ctx.beginPath();
        ctx.moveTo(rulerWidth, 0);
        ctx.lineTo(0, 0);
        ctx.stroke();
        
        // 次刻度
        for (let y = gridSize; y < majorGridSize; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(rulerWidth, y);
            ctx.lineTo(rulerWidth / 2, y);
            ctx.stroke();
        }
    }
    
    return patternCanvas;
}
