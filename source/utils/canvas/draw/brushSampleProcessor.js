import { requirePluginDeps } from "../../module/requireDeps.js"
const sharp = requirePluginDeps('sharp')
import { hexToRgb, rgbToHex,rgbToHsl,hslToRgb} from "../../color/convert.js"
import { 基于色相的颜料混色 } from "../../color/mix.js"
import { fromURL } from "../../fromDeps/sharpInterface/useSharp/toSharp.js"
import { GPU图像平均颜色分析器 } from "../../image/analyze/calculateAverage.js"
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

    // 添加节流控制
    lastPickupTime: 0,
    pickupThrottleInterval: 50, // 50ms 的节流间隔

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
        await this.generateInitialVariants(variants, alphaChannel, opacity, options, 5)
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
        const variantCount = 5
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
        // 添加节流控制
        if (timestamp - this.lastPickupTime < this.pickupThrottleInterval) {
            return false;
        }
        this.lastPickupTime = timestamp;

        const RADIUS = 5
        const SIZE = RADIUS * 2
        const x = Math.max(0, Math.floor(position.x - RADIUS))
        const y = Math.max(0, Math.floor(position.y - RADIUS))
        const 颜色分析器 = await this.getGPUAnalyzer()
        try {
            const imageData = ctx.getImageData(x, y, SIZE, SIZE)
            const { 平均颜色: color, 平均透明度: averageAlpha } = await 颜色分析器.计算平均颜色(
                imageData.data,
                SIZE,
                SIZE
            )
            if (averageAlpha <= 0.15) return false
            const historyEntry = {
                timestamp,
                position: { x: position.x, y: position.y },
                color,
                pressure: Math.min(pressure, 1),
                alpha: Math.min(averageAlpha, 0.9)
            }
            this.pickupHistory.unshift(historyEntry)
            this.pickupHistory.length = Math.min(this.pickupHistory.length, 10) // 减少历史记录长度
            return averageAlpha > 0.3
                ? Promise.all([
                    this.processPickupEffects(),
                    this.addFlowEffect(
                        position,
                        color,
                        pressure * averageAlpha * 0.7,
                        { type: 'watercolor', context: ctx }
                    )
                ]).then(() => true)
                : this.processPickupEffects().then(() => true)
        } catch (error) {
            console.warn('颜色分析失败:', error)
            return false
        }
    },

    // 获取或创建GPU分析器的单例
    async getGPUAnalyzer() {
        if (!this._gpuAnalyzer) {
            this._gpuAnalyzer = new GPU图像平均颜色分析器()
            this._ensureCleanup()
        }
        return this._gpuAnalyzer
    },

    // 确保清理GPU资源
    _ensureCleanup() {
        if (this._cleanupRegistered) return
        
        this._cleanupRegistered = true
        // 在对象被销毁时清理GPU资源
        Object.defineProperty(this, 'cleanup', {
            value: function() {
                if (this._gpuAnalyzer) {
                    this._gpuAnalyzer.释放资源()
                    this._gpuAnalyzer = null
                }
            },
            writable: false,
            configurable: false
        })
    },

    // 优化处理沾染效果
    async processPickupEffects() {
        if (this.pickupHistory.length === 0) return;
        const now = Date.now();
        const recentHistory = this.pickupHistory.filter(
            record => (now - record.timestamp) / 1000 <= 0.5 // 减少时间窗口到0.5秒
        );
        if (recentHistory.length === 0) return;
        let mixedColor = recentHistory[0].color;
        let currentAlpha = recentHistory[0].alpha;
        for (let i = 1; i < recentHistory.length; i++) {
            const record = recentHistory[i];
            const ratio = record.alpha * 0.3; // 稍微降低混合强度
            mixedColor = 基于色相的颜料混色(mixedColor, record.color, ratio);
            currentAlpha = Math.min(0.8, currentAlpha + (record.alpha * 0.2)); // 降低最大不透明度
        }
        await this.updateBrushVariants({
            ...mixedColor,
            a: Math.min(0.8, currentAlpha * 1.1) // 略微降低不透明度
        });
        this.pickupHistory = recentHistory;
    },

    // 新增: 更新笔刷变体
    async updateBrushVariants(mixedColor) {
        // 快速返回检查
        if (!this.currentBrush) return
        try {
            // 使用位运算进行颜色值限制
            const color = {
                r: mixedColor.r >> 0,  // 向下取整
                g: mixedColor.g >> 0,
                b: mixedColor.b >> 0
            }
            color.r = color.r < 0 ? 0 : (color.r > 255 ? 255 : color.r)
            color.g = color.g < 0 ? 0 : (color.g > 255 ? 255 : color.g)
            color.b = color.b < 0 ? 0 : (color.b > 255 ? 255 : color.b)
            const { brushImagePath, opacity, options, cacheKey } = this.currentBrush
            const newOpacity = opacity * 0.8 > 0.6 ? 0.6 : opacity * 0.8
            const hexColor = rgbToHex(color)
            const brushOptions = Object.assign({}, options, { type: 'watercolor' })
            const newVariants = await this.processColoredBrush(
                brushImagePath,
                hexColor,
                newOpacity,
                brushOptions
            )
            if (newVariants?.base) {
                this.cache.set(cacheKey, newVariants)
                this.currentBrush.variants = newVariants
            }
            return newVariants
        } catch (error) {
            console.error('更新笔刷变体失��:', error)
            return this.currentBrush.variants
        }
    },

    // 添加流动效果
    addFlowEffect(position, color, pressure, options = {}) {
        // 确保使用正确的坐标系
        const ctx = options.context
        if (!ctx) {
            console.warn('缺少上下文信息，无法正确处理流动特效')
            return
        }

        // 获取当前变换矩阵的逆矩阵
        const transform = ctx.getTransform()
        const inverseTransform = transform.inverse()
        
        // 将世界坐标转换回本地坐标
        const localPosition = {
            x: position.x * inverseTransform.a + position.y * inverseTransform.c + inverseTransform.e,
            y: position.x * inverseTransform.b + position.y * inverseTransform.d + inverseTransform.f
        }

        // 从当前笔刷中获取颜色
        let effectColor 
        if (!effectColor && this.currentBrush) {
            const hexColor = this.currentBrush.cacheKey.split('-')[1]
            if (hexColor) {
                effectColor = hexToRgb(hexColor)
            }
        }

        if (!effectColor) {
            effectColor = color || { r: 0, g: 0, b: 0 }
        }

        const flowEffect = {
            id: Date.now() + Math.random(),
            position: localPosition,  // 使用本地坐标
            transform: transform,     // 保存当前变换矩阵
            velocity: { x: 0, y: 0 },
            color: effectColor,
            pressure,
            opacity: Math.min(0.3, pressure),
            age: 0,
            droplets: [],
            options: {
                type: 'watercolor',
                spread: 0.2,
                ...options
            }
        }

        this.addDroplets(flowEffect, 1 + Math.floor(pressure * 1.5))
        this.flowEffects.active.add(flowEffect)
        this.startFlowAnimation()
    },

    // 优化水滴添加
    addDroplets(flowEffect, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2
            const distance = Math.random() * 2 * flowEffect.pressure // 减小距离

            // 进一步降低初始不透明度
            const dropletOpacity = flowEffect.opacity * (0.05 + Math.random() * 0.15)

            flowEffect.droplets.push({
                position: {
                    x: flowEffect.position.x + Math.cos(angle) * distance,
                    y: flowEffect.position.y + Math.sin(angle) * distance
                },
                velocity: {
                    x: (Math.random() * 0.5 - 0.25) * flowEffect.pressure,
                    y: Math.random() * 0.5 * flowEffect.pressure
                },
                size: (0.2 + Math.random() * 0.3) * flowEffect.pressure * 3,
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

    // 优化流动效果更新
    updateFlowEffects() {
        for (const effect of this.flowEffects.active) {
            effect.age++

            // 获取变换矩阵的缩放因子
            const scale = effect.transform ? Math.sqrt(
                effect.transform.a * effect.transform.a + 
                effect.transform.b * effect.transform.b
            ) : 1

            effect.droplets = effect.droplets.filter(droplet => {
                // 应用考虑缩放的重力和速度
                droplet.velocity.y += this.flowEffects.gravity * 0.5 / scale
                droplet.velocity.x *= this.flowEffects.viscosity
                droplet.velocity.y *= this.flowEffects.viscosity

                // 更新位置（在本地坐标系中）
                droplet.position.x += droplet.velocity.x / scale
                droplet.position.y += droplet.velocity.y / scale

                // 计算与原始位置的距离（考虑缩放）
                const dx = droplet.position.x - effect.position.x
                const dy = droplet.position.y - effect.position.y
                const distance = Math.sqrt(dx * dx + dy * dy) * scale

                droplet.opacity *= 0.95

                return distance < this.flowEffects.maxFlowDistance * 0.3
                    && droplet.opacity > this.flowEffects.minOpacity * 1.5
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

    // 优化流动效果渲染
    renderFlowEffects(ctx) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighten'

        for (const effect of this.flowEffects.active) {
            // 应用原始变换矩阵
            if (effect.transform) {
                ctx.setTransform(effect.transform)
            }

            for (const droplet of effect.droplets) {
                const r = effect.color?.r ?? 0
                const g = effect.color?.g ?? 0
                const b = effect.color?.b ?? 0
                const a = Math.min(0.03, droplet.opacity ?? 0.01)

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
            }
        }

        ctx.restore()
    },

}

// 导出笔刷图片处理器
export { brushImageProcessor }

