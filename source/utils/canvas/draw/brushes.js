import { brushImageProcessor } from './brushSampleProcessor.js'
import { hexToRgb, rgbToHex } from "../../color/convert.js"
import { mixer } from './gpuMix.js'
/**
 * 笔刷类型定义
 */
const BRUSH_TYPES = {
    MARKER: 'marker',
    IMAGE: 'image',
    SHAPE: 'shape'
}

/**
 * 笔刷配置
 */
const brushConfigs = {
    尖头马克笔: {
        type: BRUSH_TYPES.IMAGE,
        opacity: 0.0001,
        spacing: 1,
        sizeMultiplier: 10,
    },
    宽头马克笔: {
        type: BRUSH_TYPES.IMAGE,
        opacity: 1 / 30,
        spacing: 5,
        sizeMultiplier: 15,
        compositeOperation: 'darken'
    },
    水彩笔: {
        type: BRUSH_TYPES.IMAGE,
        opacity:  0.0000001,
        spacing: 1,
        sizeMultiplier: 20,
        compositeOperation: 'source-over',
  //        pickupEnabled: true,  // 启用沾染
    //    pickupRadius: 20,     // 沾染影响半径
     //   pickupDecay: 0.95,    // 沾衰减率
       // flowEnabled: true,
    },
    铅笔: {
        type: BRUSH_TYPES.IMAGE,
        opacity: 1,
        spacing: 2,
        sizeMultiplier: 5
    },
    钢笔: {
        type: BRUSH_TYPES.SHAPE,
        opacity: 1,
        spacing: 1,
        shape: 'circle',
        sizeMultiplier: 1
    },
    鸭嘴笔: {
        type: BRUSH_TYPES.SHAPE,
        opacity: 1,
        spacing: 1,
        shape: 'rectangle',
        sizeMultiplier: 1,
        widthMultiplier: 4,
        heightMultiplier: 1,
        angle: 45
    },
    毛笔: {
        type: BRUSH_TYPES.IMAGE,
        opacity: 0.7,
        spacing: 1,
        sizeMultiplier: 12,
        pressureSensitive: true,
        compositeOperation: 'source-over',
        inkFlow: 0.8,
        spreadFactor: 1.2
    },
    粉笔: {
        type: BRUSH_TYPES.IMAGE,
        opacity: 0.9,
        spacing: 3,
        sizeMultiplier: 8,
        compositeOperation: 'overlay',
        textureStrength: 0.8,
        roughness: 0.6
    },
    油画笔: {
        type: BRUSH_TYPES.IMAGE,
        opacity: 0.95,
        spacing: 4,
        sizeMultiplier: 25,
        compositeOperation: 'hard-light',
        paintThickness: 0.8,
        blendFactor: 0.6,
        bristleCount: 12
    },
    喷枪: {
        type: BRUSH_TYPES.IMAGE,
        opacity: 0.05,
        spacing: 1,
        sizeMultiplier: 30,
        compositeOperation: 'source-over',
        sprayRadius: 20,
        falloff: 0.7,
        density: 0.8
    },
    蜡笔: {
        type: BRUSH_TYPES.SHAPE,
        opacity: 0.9,
        spacing: 2,
        shape: 'rectangle',
        widthMultiplier: 3,
        heightMultiplier: 0.8,
        texturePattern: 'grainy',
        pressureVariation: 0.3,
        edgeRoughness: 0.4
    },
    针管笔: {
        type: BRUSH_TYPES.SHAPE,
        opacity: 1,
        spacing: 0.2,
        shape: 'circle',
        smoothing: 0.9,
        minWidth: 0.5,
        maxWidth: 2,
        inkFlow: 0.95
    }
}

/**
 * 工厂函数
 */
const createBrush = (brushName) => {
    const config = brushConfigs[brushName]

    // 返回绘制函数
    return (ctx, brushSamples, startX, startY, endX, endY, color, size, opacity, pressure = 1, velocity = 0) => {
        ctx.save()

        const dx = endX - startX
        const dy = endY - startY
        const distance = Math.sqrt(dx * dx + dy * dy)
        const angle = Math.atan2(dy, dx)

        // 计算际大小和不透明度
        const effectiveSize = calculateEffectiveSize(config, size, pressure)
        const effectiveOpacity = calculateEffectiveOpacity(config, opacity, pressure, velocity)

        ctx.globalAlpha = effectiveOpacity
        if (config.compositeOperation) {
            ctx.globalCompositeOperation = config.compositeOperation
        }
        if (config.type === BRUSH_TYPES.SHAPE) {
            drawShapeBrush(ctx, config, startX, startY, endX, endY, effectiveSize)
        } else {
            const sample = selectBrushSample(brushSamples, pressure, velocity, config)
            drawImageBrush(ctx, sample, config, startX, startY, distance, angle, effectiveSize)
        }

        ctx.restore()
    }
}

function selectBrushSample(samples, pressure, velocity, config) {
    // 检查是否是新的变体系统
    if (samples.variants && Array.isArray(samples.variants)) {
        // 根据压力和速度算强度因子
        const intensityFactor = pressure * (1 + velocity * 0.2)

        // 使用强度因子影响索引选择
        const index = Math.min(
            samples.variants.length - 1,
            Math.floor(Math.random() * samples.variants.length + intensityFactor * 2)
        )

        return samples.variants[index] || samples.variants[0]
    }

    // 向后兼容：如果没有新的变体系统，返回基础样本
    return samples.base || samples
}

// 新增：计算有效大小
function calculateEffectiveSize(config, size, pressure) {
    const baseSize = size * config.sizeMultiplier
    return config.pressureSensitive ? baseSize * pressure : baseSize
}

// 新增：计算有效不透明度
function calculateEffectiveOpacity(config, opacity, pressure, velocity) {
    let effectiveOpacity = opacity * config.opacity

    if (config.inkFlow) {
        effectiveOpacity *= (1 - Math.random() * config.inkFlow * velocity)
    }

    return effectiveOpacity
}

function drawImageBrush(ctx, sample, config, startX, startY, distance, angle, effectiveSize) {
    // 计算笔触间距
    const spacing = config.spacing * effectiveSize
    const numPoints = Math.max(1, Math.floor(distance / spacing))

    // 特殊处理单点情况
    if (numPoints <= 1) {
        drawBrushPoint(ctx, sample, startX, startY, angle, effectiveSize, config)
        return
    }

    // 绘制多个笔触点
    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints
        const x = startX + (distance * t * Math.cos(angle))
        const y = startY + (distance * t * Math.sin(angle))

        // 添加随机抖动
        const jitter = config.jitter || 0
        const offsetX = jitter ? (Math.random() - 0.5) * jitter * effectiveSize : 0
        const offsetY = jitter ? (Math.random() - 0.5) * jitter * effectiveSize : 0

        // 计算每个点的转角度
        let pointAngle = angle
        if (config.angleJitter) {
            pointAngle += (Math.random() - 0.5) * config.angleJitter
        }


        drawBrushPoint(ctx, sample, x + offsetX, y + offsetY, pointAngle, effectiveSize, config)
    }
}

function drawBrushPoint(ctx, sample, x, y, angle, size, config) {
    const width = size * (config.widthMultiplier || 1)
    const height = size * (config.heightMultiplier || 1)

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle + (config.angle || 0) * Math.PI / 180)

    // 处理特殊效果
    if (config.spreadFactor) {
        const spread = size * config.spreadFactor * Math.random()
        ctx.translate(spread * (Math.random() - 0.5), spread * (Math.random() - 0.5))
    }

    // 处理笔刷纹理
    if (config.textureStrength) {
        ctx.globalAlpha *= (1 - Math.random() * config.textureStrength)
    }
    // 绘制笔刷图像

    // 如果启用了沾染功能，传入 ctx 而不是颜色
    if (config.pickupEnabled) {
        brushImageProcessor.recordPickup(
            Date.now(),
            { x, y },
            ctx,  // 传入整个 context
            config.pressure || 1
        )
    }
    // 如果启用了流动效果，在每个点都添加流动
    if (config.flowEnabled) {
        const color = ctx.fillStyle || '#000000'
        const rgb = typeof color === 'string' ?
            hexToRgb(color) :
            { r: 0, g: 0, b: 0 }

        brushImageProcessor.addFlowEffect(
            { x, y },
            rgb,
            config.pressure || 1,
            {
                type: 'watercolor',
                context: ctx,
                spread: config.spreadFactor || 0.3
            }
        )
    }
   /* ctx.drawImage(
        sample,
        -width / 2,
        -height / 2,
        width,
        height
    )*/

   mixer.mixColors(ctx, sample, x, y, width, height);


    ctx.restore()
}

function drawShapeBrush(ctx, config, startX, startY, endX, endY, effectiveSize) {
    const dx = endX - startX
    const dy = endY - startY
    const distance = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx)

    // 计算笔触间距
    const spacing = config.spacing * effectiveSize
    const numPoints = Math.max(1, Math.floor(distance / spacing))

    // 特殊处理单点情况
    if (numPoints <= 1) {
        drawShapePoint(ctx, config, startX, startY, angle, effectiveSize)
        return
    }

    // 绘制多个形状点
    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints
        const x = startX + (distance * t * Math.cos(angle))
        const y = startY + (distance * t * Math.sin(angle))

        drawShapePoint(ctx, config, x, y, angle, effectiveSize)
    }
}

function drawShapePoint(ctx, config, x, y, angle, size) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle + (config.angle || 0) * Math.PI / 180)

    const width = size * (config.widthMultiplier || 1)
    const height = size * (config.heightMultiplier || 1)

    switch (config.shape) {
        case 'circle':
            drawCircle(ctx, width)
            break
        case 'rectangle':
            drawRectangle(ctx, width, height)
            break
        default:
            drawCircle(ctx, width)
    }

    ctx.restore()
}

function drawCircle(ctx, diameter) {
    ctx.beginPath()
    ctx.arc(0, 0, diameter / 2, 0, Math.PI * 2)
    ctx.fill()
}

function drawRectangle(ctx, width, height) {
    ctx.beginPath()
    ctx.rect(-width / 2, -height / 2, width, height)
    ctx.fill()
}

/**
 * 导出笔刷函数
 */
export const 尖头马克笔 = createBrush('尖头马克笔')
export const 宽头马克笔 = createBrush('宽头马克笔')
export const 水彩笔 = createBrush('水彩笔')
export const 铅笔 = createBrush('铅笔')
export const 钢笔 = createBrush('钢笔')
export const 鸭嘴笔 = createBrush('鸭嘴笔')
export const 毛笔 = createBrush('毛笔')
export const 粉笔 = createBrush('粉笔')
export const 油画笔 = createBrush('油画笔')
export const 喷枪 = createBrush('喷枪')
export const 蜡笔 = createBrush('蜡笔')
export const 针管笔 = createBrush('针管笔')


export { brushImageProcessor } 