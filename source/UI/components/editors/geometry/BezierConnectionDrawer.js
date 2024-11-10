import Konva from '../../../../../static/konva.js';
import { 从点集创建贝塞尔曲线绘制函数, 绘制贝塞尔曲线 } from '../../../../utils/canvas/konvaUtils/shapes.js';
import { STYLES, GEOMETRY } from '../types.js'; // 从 types.js 导入常量
import { 自中心以方向向量计算矩形上交点 } from './geometryCalculate/intersections.js';
import { 计算正交分段路径 } from './geometryCalculate/path.js';
import { 添加抖动效果到点集 } from './geometryCalculate/path.js';
import { getPointOnArc } from './geometryCalculate/arc.js';
import { 计算三次贝塞尔曲线上的点 } from './geometryCalculate/path.js';
import { calculateArcEndPoints } from './geometryCalculate/arc.js';
import { 柯里化, 反向柯里化 } from '../../../../utils/functions/currying.js';
// 配置常量
const CONFIG = {
    colors: {
        arrowFill: '#409EFF',
        stroke: '#67C23A',
        lightDot: '#FFD700',
        relation: {
            stroke: '#FF9800',
            fill: '#FF9800',
            hover: '#FFB74D'
        }
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

// 添加 relation 样式常量
const RELATION_STYLE = {
    stroke: CONFIG.colors.relation.stroke,
    strokeWidth: CONFIG.sizes.strokeWidth,
    dash: [6, 3],
    arrowPointerLength: CONFIG.sizes.arrowPointerLength,
    arrowPointerWidth: CONFIG.sizes.arrowPointerWidth,
    geometry: GEOMETRY.CIRCUIT,
    hover: {
        stroke: CONFIG.colors.relation.hover,
        strokeWidth: CONFIG.sizes.strokeWidth * 1.5,
        dash: [8, 4]
    }
};

// 添加常量
const GOLDEN_RATIO = 0.618; // 黄金分割比

// 公共函数：删除已有连接
function 移除现有连接线(layer, id) {
    if (layer.find) {
        layer.find(`.${id}`).forEach(conn => conn.destroy());
        layer.find(`.relation-${id}`).forEach(rel => rel.destroy());
    }
}

// 修改统一的连接绘制函数
export function 构造连接线组(起始锚点位置, 结束锚点位置, 起始锚点所在侧, 结束锚点所在侧, 连接id,
    几何形状 = GEOMETRY.CIRCUIT, 绘制风格 = STYLES.NORMAL) {
    const connectionGroup = new Konva.Group({ name: 连接id });
    const pathPoints = 计算连接线路径(起始锚点位置, 结束锚点位置, 起始锚点所在侧, 结束锚点所在侧, 几何形状);
    const points = 绘制风格 === STYLES.HAND_DRAWN ?
        获取手绘风格形状(pathPoints, 几何形状) : pathPoints;
    let 线条定义 = 根据控制点与形状创建风格化线条(points, 几何形状, 绘制风格);
    connectionGroup.add(线条定义)
    addDecorations(connectionGroup, points, 几何形状);
    addInteractionEffects(connectionGroup);
    return connectionGroup;
}

// 修改绘制路径函数
function 根据控制点与形状创建风格化线条(points, geometry, style = STYLES.NORMAL) {
    const pathConfig = {
        stroke: CONFIG.colors.stroke,
        strokeWidth: CONFIG.sizes.strokeWidth,
        lineCap: 'round',
        lineJoin: 'round'
    };

    if (style === STYLES.HAND_DRAWN) {
        return 创建手绘风格线条(points, pathConfig);
    }

    return 创建几何风格线条(points, geometry, pathConfig);
}

function 创建手绘风格线条(points, pathConfig) {
    return new Konva.Line({
        points: points,
        ...pathConfig,
        tension: 0
    });
}

function 创建几何风格线条(points, geometry, pathConfig) {
    switch (geometry) {
        case GEOMETRY.BEZIER:
            return 从点集创建3阶贝塞尔曲线(points, pathConfig);
        case GEOMETRY.ARC:
            return 从点集创建2阶贝塞尔曲线(points, pathConfig);
        default:
            return 创建直线(points, pathConfig);
    }
}

function 从点集创建3阶贝塞尔曲线(points, pathConfig) {
    return new Konva.Shape({
        ...pathConfig,
        sceneFunc: 从点集创建贝塞尔曲线绘制函数(points.slice(0, 8))
    });
}

function 从点集创建2阶贝塞尔曲线(points, pathConfig) {
    return new Konva.Shape({
        ...pathConfig,
        sceneFunc: 从点集创建贝塞尔曲线绘制函数(points.slice(0, 6))
    });
}

function 创建直线(points, pathConfig) {
    return new Konva.Line({
        points: points,
        ...pathConfig
    });
}

// 计算几何路径
function 计算连接线路径(start, end, startSide, endSide, geometry) {
    switch (geometry) {
        case GEOMETRY.BEZIER:
            return 计算连接贝塞尔曲线关键点(start, end, startSide, endSide);
        case GEOMETRY.ARC:
            return calculateArcPath(start, end, startSide, endSide);
        case GEOMETRY.CIRCUIT:
        default:
            //auto的情形新建连接
            if (startSide === 'auto' && endSide === 'auto') {
                return 计算正交分段路径(start, end);
            }
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

// 计算贝塞尔曲线关键点
function 计算连接贝塞尔曲线关键点(start, end, startSide, endSide) {
    // 判断是否为预览状态
    if (!endSide || endSide === 'auto') {
        return 计算预览状态贝塞尔曲线点(start, end, startSide);
    }
    return 计算普通贝塞尔曲线点(start, end, startSide, endSide);
}

// 计算预览状态的贝塞尔曲线点
function 计算预览状态贝塞尔曲线点(start, end, startSide) {
    const offset = CONFIG.sizes.bezierOffset;
    const control1 = 计算起点控制点(start, startSide, offset);
    // 预览状态下使用终点作为第二个控制点
    const control2 = { x: end.x, y: end.y };
    return [
        start.x, start.y,
        control1.x, control1.y,
        control2.x, control2.y,
        end.x, end.y
    ];
}
// 计算普通状态的贝塞尔曲线点
function 计算普通贝塞尔曲线点(start, end, startSide, endSide) {
    const offset = CONFIG.sizes.bezierOffset;
    const control1 = 计算起点控制点(start, startSide, offset);
    const control2 = 计算终点控制点(end, endSide, offset);

    return [
        start.x, start.y,
        control1.x, control1.y,
        control2.x, control2.y,
        end.x, end.y
    ];
}
// 计算起点控制点
function 计算起点控制点(start, side, offset) {
    switch (side) {
        case 'right':
            return { x: start.x + offset, y: start.y };
        case 'left':
            return { x: start.x - offset, y: start.y };
        case 'top':
            return { x: start.x, y: start.y - offset };
        case 'bottom':
            return { x: start.x, y: start.y + offset };
        default:
            return { x: start.x + offset, y: start.y };
    }
}
// 计算终点控制点
function 计算终点控制点(end, side, offset) {
    switch (side) {
        case 'right':
            return { x: end.x + offset, y: end.y };
        case 'left':
            return { x: end.x - offset, y: end.y };
        case 'top':
            return { x: end.x, y: end.y - offset };
        case 'bottom':
            return { x: end.x, y: end.y + offset };
        default:
            return { x: end.x + offset, y: end.y };
    }
}
// 修改弧线路径计算函数，添加对预览状态的支持
function calculateArcPath(start, end, startSide, endSide) {
    const offset = CONFIG.sizes.arcOffset;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
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
            计算三次贝塞尔曲线上的点(points, t) :
            getPointOnPath(points, t);
        lightDot.position(point);
    }, group.getLayer());

    anim.start();
}

// 改进手绘效果算法
function 获取手绘风格形状(points, geometry) {
    // 1. 获取原始路径上的采样点
    const sampledPoints = 以固定数量获取采样点(points, geometry);
    // 2. 为采样点添加抖动效果
    return 添加抖动效果到点集(sampledPoints, CONFIG.sizes.handDrawnJitter)
}

// 在原始路径上获取采样点
function 以固定数量获取采样点(points, geometry) {
    const sampledPoints = [];
    const totalSamples = 50; // 采样点数量

    for (let i = 0; i <= totalSamples; i++) {
        const t = i / totalSamples;
        let point;

        switch (geometry) {
            case GEOMETRY.BEZIER:
                point = 计算三次贝塞尔曲线上的点(points, t);
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


// 计算贝塞尔曲线末端的切线点
function calculateBezierEndPoints(points) {
    const t = 0.95; // 用于计算箭头方向的点
    const endPoint = 计算三次贝塞尔曲线上的点(points, 1);
    const nearEndPoint = 计算三次贝塞尔曲线上的点(points, t);
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
// 创建 relation 组
function createRelationGroup(name, className) {
    return new Konva.Group({
        name,
        className
    })
}
// 新增：绘制 relation 的函数
export function drawRelation(
    target,
    start,
    end,
    id,
    geometry = RELATION_STYLE.geometry,
    style = STYLES.NORMAL
) {
    移除现有连接线(target, id);
    const relationGroup = createRelationGroup(id, 'relation')
    // 计算路径点，支持手绘风格
    const pathPoints = calculateRelationPath(start, end, geometry, style);
    const points = style === STYLES.HAND_DRAWN ? 获取手绘风格形状(pathPoints, geometry) : pathPoints;
    // 使用 drawPath 函数绘制主路径，但使用 relation 的颜色
    const pathConfig = {
        stroke: RELATION_STYLE.stroke,
        strokeWidth: RELATION_STYLE.strokeWidth,
        lineCap: 'round',
        lineJoin: 'round',
        dash: RELATION_STYLE.dash,
        opacity: 0.9
    };
    let path
    // 根据样式选择不同的绘制方法
    if (style === STYLES.HAND_DRAWN) {
        path = new Konva.Line({
            points: points,
            ...pathConfig,
            tension: 0
        });
    } else {
        // 使用与 connection 相同的几何绘制逻辑
        if (geometry === GEOMETRY.BEZIER) {
            path = 从点集创建3阶贝塞尔曲线(points, pathConfig)
        } else if (geometry === GEOMETRY.ARC) {
            path = 从点集创建2阶贝塞尔曲线(points, pathConfig)
        } else {
            path = 创建直线(points, pathConfig)
        }
        relationGroup.add(path);
    }
    // 添加交互效果
    addRelationInteractionEffects(relationGroup);
    target.add(relationGroup);
    target.batchDraw();
    return relationGroup;
}

// 添加专门的 relation 交互效果函数
function addRelationInteractionEffects(group) {
    const elements = group.getChildren();
    group.on('mouseover', () => {
        document.body.style.cursor = 'pointer';
        elements.forEach(element => {
            element.stroke(RELATION_STYLE.hover.stroke);
            element.strokeWidth(RELATION_STYLE.hover.strokeWidth);
            if (element.dash && element.dash().length > 0) {
                element.dash(RELATION_STYLE.hover.dash);
            }
            if (element.fill) {
                element.fill(RELATION_STYLE.hover.stroke);
            }
            element.opacity(1);
        });
        group.getLayer().batchDraw();
    });

    group.on('mouseout', () => {
        document.body.style.cursor = 'default';
        elements.forEach(element => {
            element.stroke(RELATION_STYLE.stroke);
            element.strokeWidth(RELATION_STYLE.strokeWidth);
            if (element.dash && element.dash().length > 0) {
                element.dash(RELATION_STYLE.dash);
            }
            if (element.fill) {
                element.fill(RELATION_STYLE.stroke);
            }
            element.opacity(0.9);
        });
        group.getLayer().batchDraw();
    });
}

// 象限判断函数
function determineQuadrant(vector) {
    const { x, y } = vector;
    if (x >= 0 && y <= 0) return 1;      // 右上
    if (x < 0 && y <= 0) return 2;       // 左上
    if (x < 0 && y > 0) return 3;        // 左下
    return 4;                            // 右下
}
import { 查找矩形中心 } from './geometryCalculate/find/centers.js';
// 修改后的Relation路径计算函数
function calculateRelationPath(start, end, geometry, style) {
    // 1. 计算中心点和方向向量
    const startCenter =查找矩形中心(start)
    const endCenter = 查找矩形中心(end)

    // 2. 计算方向向量
    const vector = {
        x: endCenter.x - startCenter.x || 0.00000000001,
        y: endCenter.y - startCenter.y || 0.00000000001
    };

    // 3. 计算与矩形边界的交点
    const points = {
        start: 自中心以方向向量计算矩形上交点(start, vector),
        end: 自中心以方向向量计算矩形上交点(end, {
            x: -vector.x,
            y: -vector.y
        })
    };

    // 4. 确定象限用于优化路径形状
    const quadrant = determineQuadrant(vector);

    // 5. 根据几何类型和象限生成路径点
    let pathPoints;
    switch (geometry) {
        case GEOMETRY.BEZIER:
            pathPoints = 计算关系贝塞尔曲线形状(points.start, points.end, vector, quadrant);
            break;
        case GEOMETRY.ARC:
            pathPoints = 计算关系简单曲线形状(points.start, points.end, vector, quadrant);
            break;
        case GEOMETRY.CIRCUIT:
            pathPoints = 计算关系折线形状(points.start, points.end, vector, quadrant);
            break;
        default:
            pathPoints = [points.start.x, points.start.y, points.end.x, points.end.y];
    }

    return style === STYLES.HAND_DRAWN ?
        获取手绘风格形状(pathPoints, geometry) :
        pathPoints;
}
// 根据象限优化贝塞尔曲线控制点
function 计算关系贝塞尔曲线形状(start, end, vector, quadrant) {
    const offset = CONFIG.sizes.bezierOffset;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    // 根据象限调整控制点的位置
    let control1, control2;
    if (quadrant === 1 || quadrant === 3) {
        control1 = {
            x: start.x + vector.x * offset / distance,
            y: start.y + vector.y * offset / distance
        };
        control2 = {
            x: end.x - vector.x * offset / distance,
            y: end.y - vector.y * offset / distance
        };
    } else {
        control1 = {
            x: start.x + vector.x * offset / distance,
            y: start.y - vector.y * offset / distance
        };
        control2 = {
            x: end.x - vector.x * offset / distance,
            y: end.y + vector.y * offset / distance
        };
    }
    return [
        start.x, start.y,
        control1.x, control1.y,
        control2.x, control2.y,
        end.x, end.y
    ];
}



// 根据象限优化弧线路径
function 计算关系简单曲线形状(start, end, vector, quadrant) {
    const offset = CONFIG.sizes.arcOffset;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    // 根据象限调整控制点位置
    let controlPoint;
    if (quadrant === 1 || quadrant === 3) {
        controlPoint = {
            x: (start.x + end.x) / 2 - vector.y * offset / distance,
            y: (start.y + end.y) / 2 + vector.x * offset / distance
        };
    } else {
        controlPoint = {
            x: (start.x + end.x) / 2 + vector.y * offset / distance,
            y: (start.y + end.y) / 2 - vector.x * offset / distance
        };
    }

    return [
        start.x, start.y,
        controlPoint.x, controlPoint.y,
        end.x, end.y
    ];
}

function 计算关系折线形状(start, end) {
    const points = []
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    // 起点坐标固定
    points[0] = start.x;
    points[1] = start.y;
    // 终点坐标固定
    points[6] = end.x;
    points[7] = end.y;
    // 计算中间控制点
    if (Math.abs(dx) > Math.abs(dy)) {
        // 水平主导方向
        const controlX = start.x + dx * GOLDEN_RATIO;
        points[2] = controlX;
        points[3] = start.y;
        points[4] = controlX;
        points[5] = end.y;
    } else {
        // 垂直主导方向
        const controlY = start.y + dy * GOLDEN_RATIO;
        points[2] = start.x;
        points[3] = controlY;
        points[4] = end.x;
        points[5] = controlY;
    }
    return points;
}

