import Konva from '../../../../../static/konva.js';
import { STYLES, GEOMETRY } from '../types.js'; // 从 types.js 导入常量

// 配置常量
const CONFIG = {
    colors: {
        arrowFill: '#409EFF',
        stroke: '#67C23A',
        lightDot: '#FFD700'
    },
    sizes: {
        strokeWidth: 2,
        arrowPointerLength: 8,
        arrowPointerWidth: 6,
        lightDotRadius: 3,
        pathOffset: 20,
        handDrawnJitter: 2,
        bezierOffset: 100,
        arcOffset: 80,
        samplingDensity: 50
    }
};

// 公共函数：删除已有连接
function removeExistingConnections(layer, id) {
    if (layer.find) {
        layer.find(`.${id}`).forEach(conn => conn.destroy());
    }
}

// 修改绘制路径函数
function drawPath(group, points, geometry, style = STYLES.NORMAL) {
    const pathConfig = {
        stroke: CONFIG.colors.stroke,
        strokeWidth: CONFIG.sizes.strokeWidth,
        lineCap: 'round',
        lineJoin: 'round'
    };

    // 根据样式选择不同的绘制方法
    if (style === STYLES.HAND_DRAWN) {
        // 手绘风格：使用折线连接带抖动的采样点
        const path = new Konva.Line({
            points: points,
            ...pathConfig,
            tension: 0 // 确保是折线而不是平滑曲线
        });
        group.add(path);
    } else {
        // 普通风格：根据几何类型使用不同的绘制方法
        if (geometry === GEOMETRY.BEZIER) {
            const path = new Konva.Shape({
                ...pathConfig,
                sceneFunc: (context, shape) => {
                    context.beginPath();
                    context.moveTo(points[0], points[1]);
                    context.bezierCurveTo(
                        points[2], points[3],
                        points[4], points[5],
                        points[6], points[7]
                    );
                    context.strokeShape(shape);
                }
            });
            group.add(path);
        } else if (geometry === GEOMETRY.ARC) {
            const path = new Konva.Shape({
                ...pathConfig,
                sceneFunc: (context, shape) => {
                    context.beginPath();
                    context.moveTo(points[0], points[1]);
                    context.quadraticCurveTo(
                        points[2], points[3],
                        points[4], points[5]
                    );
                    context.strokeShape(shape);
                }
            });
            group.add(path);
        } else {
            // 电路板样式使用普通的 Line
            const path = new Konva.Line({
                points: points,
                ...pathConfig
            });
            group.add(path);
        }
    }
}

// 修改统一的连接绘制函数
export function drawConnection(target, start, end, startSide, endSide, id, 
    geometry = GEOMETRY.CIRCUIT, style = STYLES.NORMAL) {
    
    if (!target) {
        // vue-konva 模式
        const pathPoints = calculateGeometryPath(start, end, startSide, endSide, geometry);
        const points = style === STYLES.HAND_DRAWN ? 
            applyHandDrawnEffect(pathPoints, geometry) : pathPoints;
            
        return {
            // 基础配置
            points: points, // 直接使用点数组
            stroke: CONFIG.colors.stroke,
            strokeWidth: CONFIG.sizes.strokeWidth,
            lineCap: 'round',
            lineJoin: 'round',
            tension: geometry === GEOMETRY.BEZIER ? 0.5 : 0, // 贝塞尔曲线使用张力
            
            // 装饰配置
            arrowConfig: {
                points: [
                    points[points.length - 4],
                    points[points.length - 3],
                    points[points.length - 2],
                    points[points.length - 1]
                ],
                pointerLength: CONFIG.sizes.arrowPointerLength,
                pointerWidth: CONFIG.sizes.arrowPointerWidth,
                fill: CONFIG.colors.arrowFill,
                stroke: CONFIG.colors.arrowFill
            },
            
            // 光点配置
            dotConfig: {
                x: points[0],
                y: points[1],
                radius: CONFIG.sizes.lightDotRadius,
                fill: CONFIG.colors.lightDot,
                stroke: CONFIG.colors.lightDot,
                strokeWidth: 1
            }
        };
    } else {
        // 原生 Konva 模式
        removeExistingConnections(target, id);
        const connectionGroup = new Konva.Group({ name: id });
        const pathPoints = calculateGeometryPath(start, end, startSide, endSide, geometry);
        const points = style === STYLES.HAND_DRAWN ? 
            applyHandDrawnEffect(pathPoints, geometry) : pathPoints;
        
        drawPath(connectionGroup, points, geometry, style);
        addDecorations(connectionGroup, points, geometry);
        addInteractionEffects(connectionGroup);
        
        target.add(connectionGroup);
        target.batchDraw();
        
        return connectionGroup;
    }
}

// 修改装饰配置函数
function getDecorationConfig(points, geometry) {
    const arrowPoints = calculateArrowPoints(points, geometry);
    return {
        // 箭头配置
        arrowConfig: {
            points: arrowPoints,
            pointerLength: CONFIG.sizes.arrowPointerLength,
            pointerWidth: CONFIG.sizes.arrowPointerWidth,
            fill: CONFIG.colors.arrowFill,
            stroke: CONFIG.colors.arrowFill,
            strokeWidth: CONFIG.sizes.strokeWidth
        },
        // 光点配置
        dotConfig: {
            x: points[0],
            y: points[1],
            radius: CONFIG.sizes.lightDotRadius,
            fill: CONFIG.colors.lightDot,
            stroke: CONFIG.colors.lightDot,
            strokeWidth: 1
        }
    };
}

// 新增：获取交互配置
function getInteractionConfig() {
    return {
        onMouseover: () => {
            document.body.style.cursor = 'pointer';
            return { strokeWidth: CONFIG.sizes.strokeWidth + 1 };
        },
        onMouseout: () => {
            document.body.style.cursor = 'default';
            return { strokeWidth: CONFIG.sizes.strokeWidth };
        }
    };
}

// 计算几何路径
function calculateGeometryPath(start, end, startSide, endSide, geometry) {
    switch (geometry) {
        case GEOMETRY.CIRCUIT:
            return calculateCircuitPath(start, end, startSide, endSide);
        case GEOMETRY.BEZIER:
            return calculateBezierPath(start, end, startSide, endSide);
        case GEOMETRY.ARC:
            return calculateArcPath(start, end, startSide, endSide);
        default:
            return calculateCircuitPath(start, end, startSide, endSide);
    }
}

// 计算电路板路径
function calculateCircuitPath(start, end, startSide, endSide) {
    // 使用 Float32Array 提高性能
    const points = new Float32Array(8); // 预分配固定大小
    points[0] = start.x;
    points[1] = start.y;
    
    const midX = (start.x + end.x) * 0.5; // 使用乘法代替除法
    const midY = (start.y + end.y) * 0.5;
    
    if ((startSide === 'right' && endSide === 'left') || 
        (startSide === 'left' && endSide === 'right')) {
        points[2] = midX;
        points[3] = start.y;
        points[4] = midX;
        points[5] = end.y;
    } else if ((startSide === 'top' && endSide === 'bottom') || 
               (startSide === 'bottom' && endSide === 'top')) {
        points[2] = start.x;
        points[3] = midY;
        points[4] = end.x;
        points[5] = midY;
    } else {
        points[2] = midX;
        points[3] = midY;
        points[4] = midX;
        points[5] = midY;
    }
    
    points[6] = end.x;
    points[7] = end.y;
    
    return points;
}

// 修改贝塞尔曲线路径计算函数，添加对预览状态的支持
function calculateBezierPath(start, end, startSide, endSide) {
    const offset = CONFIG.sizes.bezierOffset;
    let control1, control2;

    // 根据起点和终点的方向计算控制点
    switch(startSide) {
        case 'right':
            control1 = {x: start.x + offset, y: start.y};
            break;
        case 'left':
            control1 = {x: start.x - offset, y: start.y};
            break;
        case 'top':
            control1 = {x: start.x, y: start.y - offset};
            break;
        case 'bottom':
            control1 = {x: start.x, y: start.y + offset};
            break;
        default: // 处理预览状态
            control1 = {x: start.x + offset, y: start.y};
    }

    // 如果是预览状态（endSide 为 'auto' 或未定义），使用鼠标位置作为终点
    if (!endSide || endSide === 'auto') {
        // 计算从起点到终点的向量
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        // 使用终点作为第二个控制点
        control2 = {x: end.x, y: end.y};
    } else {
        switch(endSide) {
            case 'right':
                control2 = {x: end.x + offset, y: end.y};
                break;
            case 'left':
                control2 = {x: end.x - offset, y: end.y};
                break;
            case 'top':
                control2 = {x: end.x, y: end.y - offset};
                break;
            case 'bottom':
                control2 = {x: end.x, y: end.y + offset};
                break;
        }
    }

    return [
        start.x, start.y,
        control1.x, control1.y,
        control2.x, control2.y,
        end.x, end.y
    ];
}

// 修改弧线路径计算函数，添加对预览状态的支持
function calculateArcPath(start, end, startSide, endSide) {
    const offset = CONFIG.sizes.arcOffset;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 计算弧线的控制点
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const angle = Math.atan2(dy, dx);
    
    // 处理预览状态
    let arcOffset;
    if (!endSide || endSide === 'auto') {
        // 在预览状态下使用固定的偏移方向
        arcOffset = offset;
    } else {
        // 根据起点和终点的方向调整弧线的弯曲方向
        arcOffset = ((startSide === 'right' && endSide === 'left') || 
                    (startSide === 'left' && endSide === 'right')) ? 
                    offset : -offset;
    }
    
    const controlPoint = {
        x: midX - Math.sin(angle) * arcOffset,
        y: midY + Math.cos(angle) * arcOffset
    };
    
    return [start.x, start.y, controlPoint.x, controlPoint.y, end.x, end.y];
}

// 添加装饰（箭头、光点等）
function addDecorations(group, points, geometry) {
    // 计算箭头点
    const arrowPoints = calculateArrowPoints(points, geometry);

    const arrow = new Konva.Arrow({
        points: arrowPoints,
        pointerLength: CONFIG.sizes.arrowPointerLength,
        pointerWidth: CONFIG.sizes.arrowPointerWidth,
        fill: CONFIG.colors.arrowFill,
        stroke: CONFIG.colors.arrowFill,
        strokeWidth: CONFIG.sizes.strokeWidth
    });
    group.add(arrow);

    // 添加光点动画
    const lightDot = new Konva.Circle({
        radius: CONFIG.sizes.lightDotRadius,
        fill: CONFIG.colors.lightDot,
        stroke: CONFIG.colors.lightDot,
        strokeWidth: 1
    });
    group.add(lightDot);

    // 添加光点动画
    const anim = new Konva.Animation((frame) => {
        const t = (frame.time % 2000) / 2000;
        const point = geometry === GEOMETRY.BEZIER ?
            getPointOnBezierCurve(points, t) :
            getPointOnPath(points, t);
        lightDot.position(point);
    }, group.getLayer());

    anim.start();
}

// 改进手绘效果算法
function applyHandDrawnEffect(points, geometry) {
    // 1. 获取原始路径上的采样点
    const sampledPoints = getSampledPoints(points, geometry);
    
    // 2. 为采样点添加抖动效果
    return addJitterToPoints(sampledPoints);
}

// 在原始路径上获取采样点
function getSampledPoints(points, geometry) {
    const sampledPoints = [];
    const totalSamples = 50; // 采样点数量

    for (let i = 0; i <= totalSamples; i++) {
        const t = i / totalSamples;
        let point;

        switch (geometry) {
            case GEOMETRY.BEZIER:
                point = getPointOnBezierCurve(points, t);
                break;
            case GEOMETRY.ARC:
                point = getPointOnArc(points, t);
                break;
            default:
                point = getPointOnPath(points, t);
                break;
        }

        sampledPoints.push(point.x, point.y);
    }

    return sampledPoints;
}

// 为采样点添加抖动效果
function addJitterToPoints(points) {
    const jitteredPoints = [];
    const jitter = CONFIG.sizes.handDrawnJitter;

    for (let i = 0; i < points.length; i += 2) {
        const x = points[i];
        const y = points[i + 1];
        const jitterX = (Math.random() - 0.5) * jitter;
        const jitterY = (Math.random() - 0.5) * jitter;
        jitteredPoints.push(x + jitterX, y + jitterY);
    }

    return jitteredPoints;
}

// 计算弧线上的点
function getPointOnArc(points, t) {
    const [x0, y0, cx, cy, x1, y1] = points;
    const mt = 1 - t;
    
    // 二次贝塞尔曲线插值
    return {
        x: mt * mt * x0 + 2 * mt * t * cx + t * t * x1,
        y: mt * mt * y0 + 2 * mt * t * cy + t * t * y1
    };
}

// 交互效果
function addInteractionEffects(group) {
    const path = group.findOne('Line');
    const arrow = group.findOne('Arrow');

    group.on('mouseover', () => {
        document.body.style.cursor = 'pointer';
        if (path) path.strokeWidth(CONFIG.sizes.strokeWidth + 1);
        if (arrow) arrow.strokeWidth(CONFIG.sizes.strokeWidth + 1);
        group.getLayer().batchDraw();
    });

    group.on('mouseout', () => {
        document.body.style.cursor = 'default';
        if (path) path.strokeWidth(CONFIG.sizes.strokeWidth);
        if (arrow) arrow.strokeWidth(CONFIG.sizes.strokeWidth);
        group.getLayer().batchDraw();
    });
}

// 计算路径点
function calculatePathSegments(start, end, startSide, endSide) {
    let points = [start.x, start.y];

    if ((startSide === 'right' && endSide === 'left') || 
        (startSide === 'left' && endSide === 'right')) {
        points.push((start.x + end.x) / 2, start.y);
        points.push((start.x + end.x) / 2, end.y);
    } else if ((startSide === 'top' && endSide === 'bottom') || 
               (startSide === 'bottom' && endSide === 'top')) {
        points.push(start.x, (start.y + end.y) / 2);
        points.push(end.x, (start.y + end.y) / 2);
    } else {
        points.push((start.x + end.x) / 2, (start.y + end.y) / 2);
    }

    points.push(end.x, end.y);
    return points;
}

// 计算路径上的点
function getPointOnPath(points, t) {
    const n = points.length / 2 - 1;
    const segment = Math.floor(t * n);
    const segmentT = (t * n) - segment;

    const x1 = points[segment * 2];
    const y1 = points[segment * 2 + 1];
    const x2 = points[segment * 2 + 2];
    const y2 = points[segment * 2 + 3];

    return {
        x: x1 + (x2 - x1) * segmentT,
        y: y1 + (y2 - y1) * segmentT
    };
}

// 计算贝塞尔曲线上的点
function getPointOnBezierCurve(points, t) {
    const [x0, y0, x1, y1, x2, y2, x3, y3] = points;
    
    const cx = 3 * (x1 - x0);
    const bx = 3 * (x2 - x1) - cx;
    const ax = x3 - x0 - cx - bx;
    
    const cy = 3 * (y1 - y0);
    const by = 3 * (y2 - y1) - cy;
    const ay = y3 - y0 - cy - by;
    
    const t2 = t * t;
    const t3 = t2 * t;
    
    return {
        x: ax * t3 + bx * t2 + cx * t + x0,
        y: ay * t3 + by * t2 + cy * t + y0
    };
}

// 计算贝塞尔曲线末端的切线点
function calculateBezierEndPoints(points) {
    const t = 0.95; // 用于计算箭头方向的点
    const endPoint = getPointOnBezierCurve(points, 1);
    const nearEndPoint = getPointOnBezierCurve(points, t);
    
    return [
        nearEndPoint.x,
        nearEndPoint.y,
        endPoint.x,
        endPoint.y
    ];
}

// 根据几何类型计算箭头点
function calculateArrowPoints(points, geometry) {
    switch (geometry) {
        case GEOMETRY.BEZIER:
            return calculateBezierEndPoints(points);
        case GEOMETRY.ARC:
            return calculateArcEndPoints(points);
        default:
            return [
                points[points.length - 4], 
                points[points.length - 3],
                points[points.length - 2], 
                points[points.length - 1]
            ];
    }
}

// 计算弧线末端的切线点
function calculateArcEndPoints(points) {
    const t = 0.95; // 用于计算箭头方向的点
    const [x0, y0, cx, cy, x1, y1] = points;
    
    // 计算结束点
    const endPoint = {
        x: x1,
        y: y1
    };
    
    // 计算靠近结束点的点（用于确定箭头方向）
    const mt = 1 - t;
    const nearEndPoint = {
        x: mt * mt * x0 + 2 * mt * t * cx + t * t * x1,
        y: mt * mt * y0 + 2 * mt * t * cy + t * t * y1
    };
    
    return [
        nearEndPoint.x,
        nearEndPoint.y,
        endPoint.x,
        endPoint.y
    ];
}

