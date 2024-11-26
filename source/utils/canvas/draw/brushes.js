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
        opacity: 0.1,
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
        opacity:  1,
        spacing: 1,
        sizeMultiplier: 20,
        compositeOperation: 'source-over',
        pickupEnabled: true,  // 启用沾染
       pickupRadius: 20,     // 沾染影响半径
       pickupDecay: 0.95,    // 沾衰减率
     flowEnabled: true,
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
    const spacing = config.spacing * effectiveSize
    const numPoints = Math.max(1, Math.floor(distance / spacing))

    // 特殊处理单点情况
    if (numPoints <= 1) {
        await drawBrushPoint(ctx, sample, startX, startY, angle, effectiveSize, config)
        return
    }

    // 创建一个数组来存储所有的绘制操作
    const drawOperations = []

    // 准备所有绘制点
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

        // 计算当前点的压力（可以根据距离渐变）
        const pointPressure = config.pressure * (1 - (i / numPoints) * 0.3)

        // 将每个点的绘制操作添加到数组中
        drawOperations.push(
            drawBrushPoint(
                ctx, 
                sample, 
                x + offsetX, 
                y + offsetY, 
                pointAngle, 
                effectiveSize,
                {
                    ...config,
                    pressure: pointPressure
                }
            )
        )
    }

    // 按顺序执行所有绘制操作
    for (const operation of drawOperations) {
        await operation
    }

    // 最后一次渲染流动效果
    if (config.flowEnabled) {
        brushImageProcessor.renderFlowEffects(ctx)
    }
}

async function drawBrushPoint(ctx, sample, x, y, angle, size, config) {
    const width = size * (config.widthMultiplier || 1)
    const height = size * (config.heightMultiplier || 1)

    try {
        ctx.save()
        
        // 获取当前变换矩阵
        const transform = ctx.getTransform()
        
        // 使用变换矩阵计算实际的世界坐标
        const worldPoint = {
            x: x * transform.a + y * transform.c + transform.e,
            y: x * transform.b + y * transform.d + transform.f
        }

        // 处理特殊效果的偏移
        let offsetX = 0
        let offsetY = 0
        if (config.spreadFactor) {
            const spread = size * config.spreadFactor * Math.random()
            offsetX = spread * (Math.random() - 0.5)
            offsetY = spread * (Math.random() - 0.5)
        }

        // 计算偏移后的世界坐标
        const effectPoint = {
            x: worldPoint.x + (offsetX * transform.a + offsetY * transform.c),
            y: worldPoint.y + (offsetX * transform.b + offsetY * transform.d)
        }

        // 处理沾染效果 - 使用世界坐标
        if (config.pickupEnabled) {
            // 临时重置变换以处理沾染
            const currentState = ctx.save()
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            
            await brushImageProcessor.recordPickup(
                Date.now(),
                effectPoint,
                ctx,
                config.pressure || 1
            )
            
            ctx.restore(currentState)
        }

        // 应用绘制变换
        ctx.translate(x, y)
        ctx.rotate(angle + (config.angle || 0) * Math.PI / 180)

        // 应用特殊效果的偏移
        if (config.spreadFactor) {
            ctx.translate(offsetX, offsetY)
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
            // 图像笔刷绘制
            try {
                ctx.drawImage(sample, -width/2, -height/2, width, height)
                
                // 处理流动效果 - 使用世界坐标
                if (config.flowEnabled) {
                    const currentColor = ctx.fillStyle || '#000000'
                    const rgb = typeof currentColor === 'string' ?
                        hexToRgb(currentColor) :
                        { r: 0, g: 0, b: 0 }

                    // 临时重置变换以添加流动效果
                    const currentState = ctx.save()
                    ctx.setTransform(1, 0, 0, 1, 0, 0)
                    
                    await brushImageProcessor.addFlowEffect(
                        { x, y },
                        rgb,
                        config.pressure || 1,
                        {
                            type: 'watercolor',
                            context: ctx,
                            spread: config.spreadFactor || 0.3
                        }
                    )

                    // 渲染流动效果
                    brushImageProcessor.renderFlowEffects(ctx)

                    ctx.restore(currentState)
                }
            } catch (error) {
                console.error('绘制失败:', error)
            }
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