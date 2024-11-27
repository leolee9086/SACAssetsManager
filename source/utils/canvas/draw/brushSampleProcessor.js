import { requirePluginDeps } from "../../module/requireDeps.js"
const sharp = requirePluginDeps('sharp')
import { hexToRgb, rgbToHex,rgbToHsl,hslToRgb,rgbToCmy,cmyToRgb } from "../../color/convert.js"
import { fromURL } from "../../fromDeps/sharpInterface/useSharp/toSharp.js"

const brushImageProcessor = {
    cache: new Map(),
    sharpCache: new Map(),
    currentBrush: null,
    processingQueue: new Map(),
    pickupHistory: [],
    flowEffects: {
        active: new Set(),
        gravity: 0.2,        // 保持重力
        tension: 0.4,        // 保持表面张力
        viscosity: 0.92,     // 保持粘度
        maxFlowDistance: 50, // 减小最大流动距离
        minOpacity: 0.05,    // 降低最小不透明度
    },

    async bufferToImage(buffer) {
        const blob = new Blob([buffer], { type: 'image/png' });
        try {
            // 使用 createImageBitmap 直接创建可用于 Canvas 的位图对象
            // 这比创建 Image 对象更高效，因为它是为 Canvas 渲染优化的
            const bitmap = await createImageBitmap(blob);
            return bitmap;
        } catch (error) {
            throw new Error('图片处理失败: ' + error.message);
        }
    },
    async processColoredBrush(brushImagePath, color, opacity, options = {}) {
        const cacheKey = `${brushImagePath}-${color}`

        // 检查缓存
        if (this.currentBrush?.cacheKey === cacheKey) {
            return this.currentBrush.variants
        }

        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey)
            this.currentBrush = {
                cacheKey,
                variants: cached,
                brushImagePath,
                opacity,
                options: { ...options }  // 保存完整的选项
            }
            return cached
        }

        if (this.processingQueue.has(cacheKey)) {
            return this.processingQueue.get(cacheKey)
        }

        let processingPromise = (async () => {
            try {
                // 检查 Sharp 对象缓存
                let sharpObj
                if (this.sharpCache.has(brushImagePath)) {
                    sharpObj = this.sharpCache.get(brushImagePath).clone() // 克隆缓存的 Sharp 对象
                } else {
                    sharpObj = await fromURL(brushImagePath)
                    this.sharpCache.set(brushImagePath, sharpObj.clone()) // 存储一个克隆副本
                }

                const rgb = hexToRgb(color)
                if (!rgb) throw new Error('无效的颜色值')

                // 确保有有效的尺寸
                const width = options.width || 100
                const height = options.height || 100

                let alphaChannel = await sharpObj
                    .extractChannel(3)
                    .resize(width, height, {
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                    })

                const variants = await this.generateVariants(alphaChannel, opacity, {
                    ...options,
                    rgb,
                    width,
                    height
                })

                // 保存完整的状态
                this.currentBrush = {
                    cacheKey,
                    variants,
                    brushImagePath,
                    opacity,
                    options: { ...options, width, height }
                }

                this.cache.set(cacheKey, variants)
                return variants
            } catch (error) {
                console.error('处理笔刷图片失败:', error)
                throw error
            } finally {
                if (this.processingQueue.get(cacheKey) === processingPromise) {
                    this.processingQueue.delete(cacheKey)
                }
            }
        })()

        this.processingQueue.set(cacheKey, processingPromise)
        return await processingPromise
    },

    // 辅助方法
    async applyWatercolorEffect(alphaChannel, opacity, options) {
        return alphaChannel
            .raw()
            .toBuffer()
            .then(buffer => {
                const newBuffer = Buffer.alloc(buffer.length * 3)
                for (let i = 0; i < buffer.length; i++) {
                    const alpha = buffer[i]
                    const noise = Math.floor(Math.random() * 41) - 20
                    newBuffer[i] = Math.max(0, Math.min(255,
                        Math.floor((alpha + noise) * opacity)
                    ))
                }
                return sharp(newBuffer, {
                    raw: {
                        width: options.width,
                        height: options.height,
                        channels: 1
                    }
                }).png()
            })
    },

    async createColoredImage(rgb, alphaChannel, options) {
        const rgbImage = await sharp({
            create: {
                width: options.width,
                height: options.height,
                channels: 3,
                background: rgb
            }
        }).raw().toBuffer()
        let buffer = await sharp(rgbImage, {
            raw: {
                width: options.width,
                height: options.height,
                channels: 3
            }
        })
            .joinChannel(await alphaChannel.toBuffer())
            .png()
            .toBuffer()
        return this.bufferToImage(buffer)
    },

    clearCache() {
        this.cache.clear()
        this.sharpCache.clear()
        this.currentBrush = null
        this.processingQueue.clear()
    },

    async generateVariants(alphaChannel, opacity, options) {
        const { rgb } = options
        const variants = []
        const variantCount = 5
        let currentIndex = 0
        
        // 创建初始的几个变体以供立即使用
        await this.generateInitialVariants(variants, alphaChannel, opacity, options, 5)
        
        // 使用 requestIdleCallback 在空闲时间生成其余变体
        const generateRemainingVariants = async (deadline) => {
            while (currentIndex < variantCount && deadline.timeRemaining() > 0) {
                const opacityLevel = 0.4 + (1.2 * (currentIndex / (variantCount - 1)))
                const noiseLevel = 0.1 + (
                    0.35 * (1 + Math.sin(currentIndex * Math.PI / (variantCount / 4))) +
                    (currentIndex / variantCount) * 0.35
                )
                
                try {
                    const variant = await this.processBaseImage(
                        alphaChannel,
                        opacity * opacityLevel,
                        {
                            ...options,
                            rgb,
                            effect: 'watercolor',
                            noiseLevel
                        }
                    )
                    variants.push(variant)
                } catch (error) {
                    console.error('生成变体失败:', error)
                }
                
                currentIndex++
            }
            
            // 如果还有变体需要生成，继续请求闲时回调
            if (currentIndex < variantCount) {
                requestIdleCallback(generateRemainingVariants)
            }
        }
        
        // 开始在空闲时间生成变体
        if ('requestIdleCallback' in window) {
            requestIdleCallback(generateRemainingVariants)
        } else {
            // 降级方案：使用 setTimeout 分批处理
            const fallbackGeneration = () => {
                const batchSize = 5
                const startIndex = currentIndex
                const endIndex = Math.min(startIndex + batchSize, variantCount)
                
                for (let i = startIndex; i < endIndex; i++) {
                    const opacityLevel = 0.4 + (1.2 * (i / (variantCount - 1)))
                    const noiseLevel = 0.1 + (
                        0.35 * (1 + Math.sin(i * Math.PI / (variantCount / 4))) +
                        (i / variantCount) * 0.35
                    )
                    
                    this.processBaseImage(
                        alphaChannel,
                        opacity * opacityLevel,
                        {
                            ...options,
                            rgb,
                            effect: 'watercolor',
                            noiseLevel
                        }
                    ).then(variant => variants.push(variant))
                    
                    currentIndex = i + 1
                }
                
                if (currentIndex < variantCount) {
                    setTimeout(fallbackGeneration, 0)
                }
            }
            
            setTimeout(fallbackGeneration, 0)
        }
        
        // 添加获取随机变体的辅助方法
        const getRandomVariant = () => {
            return variants[Math.floor(Math.random() * variants.length)]
        }
        
        return {
            variants,
            getRandomVariant,
            isComplete: () => currentIndex >= variantCount,
            getProgress: () => currentIndex / variantCount
        }
    },

    // 生成初始变体的辅助方法
    async generateInitialVariants(variants, alphaChannel, opacity, options, count) {
        const { rgb } = options
        const variantCount = 50
        for (let i = 0; i < count; i++) {
            const opacityLevel = 0.4 + (1.2 * (i / (variantCount - 1)))
            const noiseLevel = 0.1 + (
                0.35 * (1 + Math.sin(i * Math.PI / (variantCount / 4))) +
                (i / variantCount) * 0.35
            )
            
            const variant = await this.processBaseImage(
                alphaChannel,
                opacity * opacityLevel,
                {
                    ...options,
                    rgb,
                    effect: 'watercolor',
                    noiseLevel
                }
            )
            variants.push(variant)
        }
    },

    async processBaseImage(alphaChannel, opacity, options) {
        const { width, height, rgb } = options

        if (!width || !height) {
            throw new Error('必须指定有效的宽度和高度')
        }

        let processedAlpha
        if (options.effect === 'watercolor') {
            processedAlpha = await this.applyWatercolorEffect(alphaChannel, opacity, options)
        } else {
            processedAlpha = await alphaChannel.linear(opacity, 0)
        }

        return await this.createColoredImage(rgb, processedAlpha, options)
    },

    // 修改: 记录沾染事件
    async recordPickup(timestamp, position, ctx, pressure) {
        const radius = 5
        const imageData = ctx.getImageData(
            Math.max(0, position.x - radius),
            Math.max(0, position.y - radius),
            radius * 2,
            radius * 2
        )

        // 使用 Uint32Array 加速像素处理
        const uint32View = new Uint32Array(imageData.data.buffer)
        let r = 0, g = 0, b = 0, totalAlpha = 0
        let count = 0
        
        // 使用跳跃式采样来减少计算量
        // 每隔几个像素采样一次，可以显著提高性能
        const sampleStep = 2
        for (let i = 0; i < uint32View.length; i += sampleStep) {
            const pixel = uint32View[i]
            const alpha = (pixel >> 24) & 0xff
            
            // 使用位运算提取颜色值，并且只在alpha值足够大时处理
            if (alpha > 25) { // 0.1 * 255 ≈ 25
                b += pixel & 0xff
                g += (pixel >> 8) & 0xff
                r += (pixel >> 16) & 0xff
                totalAlpha += alpha
                count++
            }
        }

        // 快速检查是否有足够的有效像素
        if (count === 0) return false
        
        const averageAlpha = totalAlpha / (count * 255) // 归一化 alpha 值

        // 提前返回，避免不必要的计算
        if (averageAlpha <= 0.15) return false

        // 创建颜色对象时直接计算平均值
        const color = {
            r: r / count,
            g: g / count,
            b: b / count,
            a: averageAlpha
        }

        // 使用数组的unshift代替shift，并直接限制长度
        this.pickupHistory.unshift({
            timestamp,
            position: { x: position.x, y: position.y }, // 创建新对象避免引用问题
            color,
            pressure: Math.min(pressure, 1),
            alpha: Math.min(averageAlpha, 0.9)
        })
        
        // 直接截断数组而不是循环移除
        if (this.pickupHistory.length > 20) {
            this.pickupHistory.length = 20
        }

        // 只在必要时处理效果
        if (averageAlpha > 0.3) {
            // 并行处理效果
            await Promise.all([
                this.processPickupEffects(),
                this.addFlowEffect(
                    position,
                    color,
                    pressure * averageAlpha * 0.7,
                    { type: 'watercolor', context: ctx }
                )
            ])
        } else {
            await this.processPickupEffects()
        }

        return true
    },

  

    // 减色混合
    mixColors(color1, color2, ratio = 0.5) {
        // 转换为 CMY
        const cmy1 = rgbToCmy(color1)
        const cmy2 = rgbToCmy(color2)

        // 在 CMY 空间中混合（减色混合）
        const mixedCmy = {
            c: cmy1.c + (cmy2.c * ratio),
            m: cmy1.m + (cmy2.m * ratio),
            y: cmy1.y + (cmy2.y * ratio)
        }

        // 确保值不超过1
        mixedCmy.c = Math.min(1, mixedCmy.c)
        mixedCmy.m = Math.min(1, mixedCmy.m)
        mixedCmy.y = Math.min(1, mixedCmy.y)

        // 转换回 RGB
        return cmyToRgb(mixedCmy)
    },

    async processPickupEffects() {
        if (this.pickupHistory.length === 0) return;

        const now = Date.now();
        const recentHistory = this.pickupHistory.filter(
            record => (now - record.timestamp) / 1000 <= 1
        );

        if (recentHistory.length === 0) return;

        let mixedColor = recentHistory[0].color;
        let currentAlpha = recentHistory[0].alpha;

        // 调整混合比例和强度
        for (let i = 1; i < recentHistory.length; i++) {
            const record = recentHistory[i];
            const ratio = record.alpha * 0.4; // 增加混合强度

            mixedColor = this.mixPigments(mixedColor, record.color, ratio);
            currentAlpha = Math.min(0.9, currentAlpha + (record.alpha * 0.25)); // 提高最大不透明度
        }

        // 更新笔刷变体时保持较高的不透明度
        await this.updateBrushVariants({
            ...mixedColor,
            a: Math.min(0.9, currentAlpha * 1.2) // 略微提高不透明度
        });

        this.pickupHistory = recentHistory;
    },

    // 新增: 更新笔刷变体
    async updateBrushVariants(mixedColor) {
        if (!this.currentBrush) return

        try {
            // 确保颜色值在合理范围���
            const color = {
                r: Math.min(255, Math.max(0, Math.round(mixedColor.r))),
                g: Math.min(255, Math.max(0, Math.round(mixedColor.g))),
                b: Math.min(255, Math.max(0, Math.round(mixedColor.b)))
            }

            // 转换为十六进制颜色
            const hexColor = rgbToHex(color)

            // 使用较低的不透明度生成新变体
            const newVariants = await this.processColoredBrush(
                this.currentBrush.brushImagePath,
                hexColor,
                Math.min(this.currentBrush.opacity * 0.8, 0.6), // 降低不透明度
                {
                    ...this.currentBrush.options,
                    type: 'watercolor'
                }
            )

            if (newVariants?.base) {
                this.cache.set(this.currentBrush.cacheKey, newVariants)
                this.currentBrush.variants = newVariants
            }

            return newVariants
        } catch (error) {
            console.error('更新笔刷变体失败:', error)
            return this.currentBrush.variants
        }
    },

    // 添加流动效果
    addFlowEffect(position, color, pressure, options = {}) {
        // 从当前笔刷中获取颜色
        let effectColor 
        if (!effectColor && this.currentBrush) {
            const hexColor = this.currentBrush.cacheKey.split('-')[1]
            if (hexColor) {
                effectColor = hexToRgb(hexColor)
            }
        }

        if (!effectColor) {
            console.warn('无法获取有效的颜色，使用默认颜色')
            effectColor = { r: 0, g: 0, b: 0 }
        }

        // 进一步降低基础不透明度
        const baseOpacity = Math.min(0.3, pressure)

        const flowEffect = {
            id: Date.now() + Math.random(),
            position: { ...position },
            velocity: { x: 0, y: 0 },
            color: effectColor,
            pressure,
            opacity: baseOpacity,
            age: 0,
            droplets: [],
            options: {
                type: 'watercolor',
                spread: 0.2,
                ...options
            }
        }

        // 保持较少的水滴数量
        this.addDroplets(flowEffect, 1 + Math.floor(pressure * 2))

        this.flowEffects.active.add(flowEffect)
        this.startFlowAnimation()
    },

    // 添加水滴
    addDroplets(flowEffect, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2
            const distance = Math.random() * 3 * flowEffect.pressure

            // 进一步降低初始不透明度
            const dropletOpacity = flowEffect.opacity * (0.1 + Math.random() * 0.2)

            flowEffect.droplets.push({
                position: {
                    x: flowEffect.position.x + Math.cos(angle) * distance,
                    y: flowEffect.position.y + Math.sin(angle) * distance
                },
                velocity: {
                    x: (Math.random() * 1 - 0.5) * flowEffect.pressure,
                    y: Math.random() * 1 * flowEffect.pressure
                },
                size: (0.3 + Math.random() * 0.4) * flowEffect.pressure * 4,
                opacity: dropletOpacity
            })
        }
    },

    // 开始流动动画
    startFlowAnimation() {
        if (this.flowAnimationFrame) return

        const animate = () => {
            this.updateFlowEffects()
            if (this.flowEffects.active.size > 0) {
                this.flowAnimationFrame = requestAnimationFrame(animate)
            } else {
                this.flowAnimationFrame = null
            }
        }

        this.flowAnimationFrame = requestAnimationFrame(animate)
    },

    // 更新流动效果
    updateFlowEffects() {
        for (const effect of this.flowEffects.active) {
            effect.age++

            effect.droplets = effect.droplets.filter(droplet => {
                // 应用重力
                droplet.velocity.y += this.flowEffects.gravity

                // 应用粘度
                droplet.velocity.x *= this.flowEffects.viscosity
                droplet.velocity.y *= this.flowEffects.viscosity

                // 更新位置
                droplet.position.x += droplet.velocity.x
                droplet.position.y += droplet.velocity.y

                // 更平缓的不透明度衰减
                droplet.opacity *= 0.99

                // 降低分裂概率
                if (Math.random() < 0.02 * effect.pressure) {
                    this.splitDroplet(effect, droplet)
                }

                // 检查距离限制
                const dx = droplet.position.x - effect.position.x
                const dy = droplet.position.y - effect.position.y
                const distance = Math.sqrt(dx * dx + dy * dy)

                return distance < this.flowEffects.maxFlowDistance 
                    && droplet.opacity > this.flowEffects.minOpacity
            })

            if (effect.droplets.length === 0) {
                this.flowEffects.active.delete(effect)
            }
        }
    },

    // 分裂水滴
    splitDroplet(effect, parentDroplet) {
        if (Math.random() > effect.pressure * 0.5) return

        const newDroplet = {
            position: { ...parentDroplet.position },
            velocity: {
                x: parentDroplet.velocity.x + (Math.random() - 0.5),
                y: parentDroplet.velocity.y + Math.random() * 0.5
            },
            size: parentDroplet.size * 0.5,
            // 子水滴继承更低的不透明度
            opacity: parentDroplet.opacity * 0.3
        }

        effect.droplets.push(newDroplet)
    },

    // 渲染流动效果
    renderFlowEffects(ctx) {
        for (const effect of this.flowEffects.active) {
            for (const droplet of effect.droplets) {
                ctx.save()

                // 改为变亮混合模式
                ctx.globalCompositeOperation = 'lighten'

                const r = effect.color?.r ?? 0
                const g = effect.color?.g ?? 0
                const b = effect.color?.b ?? 0
                // 确保最大不透明度非常低
                const a = Math.min(0.05, droplet.opacity ?? 0.02)

                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`

                ctx.beginPath()
                ctx.arc(
                    droplet.position.x,
                    droplet.position.y,
                    droplet.size,
                    0,
                    Math.PI * 2
                )
                ctx.fill()

                ctx.restore()
            }
        }
    },

    // 混合两种颜料颜色
    mixPigments(color1, color2, ratio = 0.5) {
        // 转换为 HSL 空间进行混合
        const hsl1 = rgbToHsl(color1.r, color1.g, color1.b);
        const hsl2 = rgbToHsl(color2.r, color2.g, color2.b);

        // 智能色相混合
        let h1 = hsl1.h * 360;
        let h2 = hsl2.h * 360;

        // 调整色相差值，确保走最短路径
        if (Math.abs(h1 - h2) > 180) {
            if (h1 > h2) h2 += 360;
            else h1 += 360;
        }

        // 混合色相
        const hue = ((h1 * (1 - ratio) + h2 * ratio) % 360) / 360;

        // 饱和度和亮度使用非线性混合
        const sat = Math.pow(
            Math.pow(hsl1.s, 2) * (1 - ratio) + Math.pow(hsl2.s, 2) * ratio,
            0.5
        );

        // 提高亮度以增加鲜艳度
        const light = Math.min(1,
            Math.pow(hsl1.l * (1 - ratio) + hsl2.l * ratio, 0.8)
        );

        // 转换回 RGB
        const rgb = hslToRgb(hue, sat, light);

        return {
            r: Math.round(rgb.r),
            g: Math.round(rgb.g),
            b: Math.round(rgb.b)
        };
    },


}

// 导出笔刷图片处理器
export { brushImageProcessor }

