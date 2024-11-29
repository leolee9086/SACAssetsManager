import { brushImageProcessor } from './brushSampleProcessor.js'
import { mixer } from './gpuMix.js'
import { brushConfigs,BRUSH_TYPES } from './brushes/configs.js'
/**
 * 工厂函数
 */
const createBrush = (config) => {
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
export const 尖头马克笔 = createBrush(brushConfigs.尖头马克笔)
export const 宽头马克笔 = createBrush(brushConfigs.宽头马克笔)
export const 水彩笔 = createBrush(brushConfigs.水彩笔)
export const 铅笔 = createBrush(brushConfigs.铅笔)
export const 钢笔 = createBrush(brushConfigs.钢笔)
export const 鸭嘴笔 = createBrush(brushConfigs.鸭嘴笔)
export const 毛笔 = createBrush(brushConfigs.毛笔)
export const 粉笔 = createBrush(brushConfigs.粉笔)
export const 油画笔 = createBrush(brushConfigs.油画笔)
export const 喷枪 = createBrush(brushConfigs.喷枪)
export const 蜡笔 = createBrush(brushConfigs.蜡笔)
export const 针管笔 = createBrush(brushConfigs.针管笔)


export { brushImageProcessor } 