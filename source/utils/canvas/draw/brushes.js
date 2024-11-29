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
        opacity: 1,
        spacing: 1,
        sizeMultiplier: 10,
        usePigment: true

    },
    宽头马克笔: {
        type: BRUSH_TYPES.IMAGE,
        opacity: 1 / 30,
        spacing: 5,
        sizeMultiplier: 15,
    },
    水彩笔: {
        type: BRUSH_TYPES.IMAGE,
        opacity: 0.1,
        spacing: 0.08,
        sizeMultiplier: 20,
        pickupEnabled: true,  // 启用沾染
        pickupRadius: 20,     // 沾染影响半径
        pickupDecay: 0.95,    // 沾衰减率
        flowEnabled: true,
        usePigment: true
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

    return async (ctx, brushSamples, startX, startY, endX, endY, color, size, opacity, pressure = 1, velocity = 0) => {
        ctx.save()

        try {
            const dx = endX - startX
            const dy = endY - startY
            const distance = Math.sqrt(dx * dx + dy * dy)
            const angle = Math.atan2(dy, dx)

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
                if (sample) {
                    await drawImageBrush(ctx, sample, config, startX, startY, distance, angle, effectiveSize)
                } else {
                    console.error('无效的笔刷样本')
                }
            }
        } catch (error) {
            console.error('笔刷绘制失败:', error)
        } finally {
            ctx.restore()
        }
    }
}

function selectBrushSample(samples, pressure, velocity, config) {

    if (config.type === BRUSH_TYPES.SHAPE) {
        return null;
    }

    if (!samples) {
        console.error('笔刷样本为空')
        return null
    }

    // 检查是否是新的变体系统
    if (samples.variants && Array.isArray(samples.variants)) {
        const intensityFactor = pressure * (1 + velocity * 0.2)
        const index = Math.min(
            samples.variants.length - 1,
            Math.floor(Math.random() * samples.variants.length + intensityFactor * 2)
        )
        const selectedSample = samples.variants[index] || samples.variants[0]
        return selectedSample
    }

    // 向后兼容
    const sample = samples.base || samples
    return sample
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

// 修改 drawImageBrush 函数
async function drawImageBrush(ctx, sample, config, startX, startY, distance, angle, effectiveSize) {
    // 计算笔触间距
    const spacing = config.spacing * effectiveSize
    const numPoints = Math.max(1, Math.floor(distance / spacing))
    if (numPoints <= 1) {
        await drawBrushPoint(ctx, sample, startX, startY, angle, effectiveSize, config)
        return
    }
    const drawOperations = []
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

        // 将每个点的绘制操作添加到数组中
        drawOperations.push(
            drawBrushPoint(
                ctx,
                sample,
                x + offsetX,
                y + offsetY,
                pointAngle,
                effectiveSize,
                config
            )
        )
    }

    // 按顺序执行所有绘制操作
    for (const operation of drawOperations) {
        await operation
    }
}

async function drawBrushPoint(ctx, sample, x, y, angle, size, config) {
    const width = size * (config.widthMultiplier || 1)
    const height = size * (config.heightMultiplier || 1)
    try {
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
        if (config.type === BRUSH_TYPES.SHAPE) {
            // 几何笔刷直接绘制
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
        } else if (sample) {
            const transform = ctx.getTransform()
            ctx.resetTransform()
            const transformedX = transform.e - width / 2
            const transformedY = transform.f - height / 2
            if(config.usePigment){
                mixer.mixColors(ctx, sample, transformedX, transformedY, width, height)
                return
            }
            ctx.drawImage(sample, x-width / 2, y- height / 2, width, height)

        }
    } catch (error) {
        console.error('绘制点失败:', error)
    } finally {
        ctx.restore()
    }
}


function drawShapeBrush(ctx, config, startX, startY, endX, endY, effectiveSize) {
    const dx = endX - startX
    const dy = endY - startY
    const distance = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx)

    const spacing = config.spacing * effectiveSize
    const numPoints = Math.max(1, Math.floor(distance / spacing))

    if (numPoints <= 1) {
        drawBrushPoint(ctx, null, startX, startY, angle, effectiveSize, config)
        return
    }

    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints
        const x = startX + (distance * t * Math.cos(angle))
        const y = startY + (distance * t * Math.sin(angle))
        drawBrushPoint(ctx, null, x, y, angle, effectiveSize, config)
    }
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