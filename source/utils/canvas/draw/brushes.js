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
        opacity: 1/30,
        spacing: 5,
        sizeMultiplier: 15,
        compositeOperation: 'multiply'
    },
    水彩笔: {
        type: BRUSH_TYPES.IMAGE,
        opacity: 2,
        spacing: 5,
        sizeMultiplier: 20,
        compositeOperation: 'source-over'
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
    return (ctx, brushImage, startX, startY, endX, endY, color, size, opacity, pressure = 1) => {
        ctx.save()
        ctx.globalAlpha = opacity * config.opacity
        ctx.fillStyle = color
        ctx.strokeStyle = color

        if (config.type === BRUSH_TYPES.SHAPE) {
            const dx = endX - startX
            const dy = endY - startY
            const distance = Math.sqrt(dx * dx + dy * dy)
            const angle = Math.atan2(dy, dx)
            
            const effectiveSize = size * config.sizeMultiplier * (pressure || 1)

            if (config.shape === 'circle') {
                ctx.beginPath()
                ctx.lineWidth = effectiveSize * 2
                ctx.lineCap = 'round'
                ctx.lineJoin = 'round'
                ctx.moveTo(startX, startY)
                ctx.lineTo(endX, endY)
                ctx.stroke()
            } else if (config.shape === 'rectangle') {
                const width = effectiveSize * config.widthMultiplier
                const height = effectiveSize * config.heightMultiplier
                
                ctx.beginPath()
                ctx.translate(startX, startY)
                ctx.rotate(angle)
                ctx.fillRect(-width / 2, -height / 2, width, height)
                ctx.translate(-startX, -startY)
                
                if (distance > 0) {
                    ctx.translate(endX, endY)
                    ctx.rotate(angle)
                    ctx.fillRect(-width / 2, -height / 2, width, height)
                    ctx.translate(-endX, -endY)
                }
            }
        } else {
            const dx = endX - startX
            const dy = endY - startY
            const distance = Math.sqrt(dx * dx + dy * dy)
            const angle = Math.atan2(dy, dx)

            const effectiveSize = config.pressureSensitive ? 
                size * pressure * config.sizeMultiplier : 
                size * config.sizeMultiplier

            for (let i = 0; i < distance; i += config.spacing) {
                const x = startX + (Math.cos(angle) * i)
                const y = startY + (Math.sin(angle) * i)
                
                if (config.type === BRUSH_TYPES.IMAGE) {
                    if (config.inkFlow) {
                        const flowVariation = Math.random() * config.inkFlow
                        ctx.globalAlpha *= (1 - flowVariation)
                    }
                    
                    if (config.textureStrength) {
                        const textureVariation = Math.random() * config.textureStrength
                        ctx.globalAlpha *= (1 - textureVariation)
                    }

                    ctx.drawImage(
                        brushImage,
                        x - effectiveSize / 2,
                        y - effectiveSize / 2,
                        effectiveSize,
                        effectiveSize
                    )
                }
            }
        }
        ctx.restore()
    }
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


export {brushImageProcessor} from './brushSampleProcessor.js'