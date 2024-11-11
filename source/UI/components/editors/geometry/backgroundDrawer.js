export function drawGrid(gridLayer, gridConfig, coordinateManager, zoom) {
    if (!gridLayer || !gridConfig.enabled) return;
    
    gridLayer.destroyChildren();
    
    const parentSize = {
        width: coordinateManager.getParentSize().width/zoom,
        height: coordinateManager.getParentSize().height/zoom
    };
    
    // 根据缩放调整网格间距
    let mainGridSize = gridConfig.size * 5; // 主网格大小
    let subGridSize = gridConfig.size;      // 次网格大小
    
    // 根据缩放调整网格间距
    if (zoom >= 4) {
        mainGridSize = mainGridSize / 4;
        subGridSize = subGridSize / 4;
    } else if (zoom >= 2) {
        mainGridSize = mainGridSize / 2;
        subGridSize = subGridSize / 2;
    } else if (zoom <= 0.25) {
        mainGridSize = mainGridSize * 4;
        subGridSize = subGridSize * 4;
    } else if (zoom <= 0.5) {
        mainGridSize = mainGridSize * 2;
        subGridSize = subGridSize * 2;
    }
    
    const scroll = coordinateManager.getScrollOffset();
    
    // 创建两套网格图案
    const mainGridPattern = createGridPattern(mainGridSize, gridConfig.color, 0.5); // 主网格
    const subGridPattern = createGridPattern(subGridSize, gridConfig.color, 0.25);  // 次网格
    
    // 创建次网格
    const subGridRect = new Konva.Rect({
        x: scroll.scrollLeft,
        y: scroll.scrollTop,
        width: parentSize.width,
        height: parentSize.height,
        fillPatternImage: subGridPattern,
        fillPatternOffset: {
            x: scroll.scrollLeft % subGridSize,
            y: scroll.scrollTop % subGridSize
        },
        listening: false
    });
    
    // 创建主网格
    const mainGridRect = new Konva.Rect({
        x: scroll.scrollLeft,
        y: scroll.scrollTop,
        width: parentSize.width,
        height: parentSize.height,
        fillPatternImage: mainGridPattern,
        fillPatternOffset: {
            x: scroll.scrollLeft % mainGridSize,
            y: scroll.scrollTop % mainGridSize
        },
        listening: false
    });
    
    gridLayer.add(subGridRect, mainGridRect);
    
    // 只在主要网格线处添加坐标标签
    if (gridConfig.showCoordinates) {
        addCoordinateLabels(gridLayer, scroll, parentSize, mainGridSize, gridConfig.color, zoom);
    }
    
    gridLayer.batchDraw();
}

// 修改网格图案创建函数，添加透明度参数
function createGridPattern(gridSize, color, opacity = 0.5) {
    const patternCanvas = document.createElement('canvas');
    const size = gridSize;
    patternCanvas.width = size;
    patternCanvas.height = size;
    
    const ctx = patternCanvas.getContext('2d');
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = opacity;
    
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
export function drawRulers(rulerLayer, gridConfig, coordinateManager,zoom=1) {
    if (!rulerLayer) return;
    
    rulerLayer.destroyChildren();
    
    const parentSize = {
        width:coordinateManager.getParentSize().width/zoom,
        height:coordinateManager.getParentSize().height/zoom
    };
    const rulerWidth = 20/zoom;
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
    const rulerTexts = createRulerTexts(scroll, parentSize, gridSize * 5,zoom);
    
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
function createRulerTexts(scroll, parentSize, majorGridSize, zoom) {
    const textGroup = new Konva.Group({
        listening: false
    });
    
    // 根据缩放调整网格间距和精度
    let adjustedGridSize = majorGridSize;
    let precision = 0; // 小数点位数
    
    // 根据缩放调整网格间距和精度
    if (zoom >= 4) {
        adjustedGridSize = majorGridSize / 4;
        precision = 2;
    } else if (zoom >= 2) {
        adjustedGridSize = majorGridSize / 2;
        precision = 1;
    } else if (zoom <= 0.25) {
        adjustedGridSize = majorGridSize * 4;
    } else if (zoom <= 0.5) {
        adjustedGridSize = majorGridSize * 2;
    }
    
    const startX = Math.floor(scroll.scrollLeft / adjustedGridSize) * adjustedGridSize;
    const startY = Math.floor(scroll.scrollTop / adjustedGridSize) * adjustedGridSize;
    
    // 根据缩放调整文本大小
    const baseFontSize = 10;
    const adjustedFontSize = Math.max(baseFontSize / zoom);
    
    // 文本样式配置
    const textConfig = {
        fontSize: adjustedFontSize,
        fontStyle: 'bold',
        fill: '#333',
        listening: false
    };
    
    // 计算文本间距，避免重叠
    const textSpacing = adjustedGridSize * zoom;
    const shouldShowText = textSpacing >= 30;
    
    // 格式化数字函数
    const formatNumber = (num) => {
        if (precision === 0) return Math.round(num).toString();
        return num.toFixed(precision);
    };
    
    if (shouldShowText) {
        // 添加水平标尺文本
        for (let x = startX; x <= startX + parentSize.width; x += adjustedGridSize) {
            const offset = 2 / zoom;
            textGroup.add(new Konva.Text({
                ...textConfig,
                x: x + offset,
                y: scroll.scrollTop + offset,
                text: formatNumber(x),
                align: 'left',
                verticalAlign: 'top'
            }));
        }
        
        // 添加垂直标尺文本
        for (let y = startY; y <= startY + parentSize.height; y += adjustedGridSize) {
            const offset = 2 / zoom;
            textGroup.add(new Konva.Text({
                ...textConfig,
                x: scroll.scrollLeft + offset,
                y: y + offset,
                text: formatNumber(y),
                align: 'left',
                verticalAlign: 'top'
            }));
        }
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
