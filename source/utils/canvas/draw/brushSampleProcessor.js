import { requirePluginDeps } from "../../module/requireDeps.js"
const sharp = requirePluginDeps('sharp')
import { hexToRgb } from "../../color/convert.js"
import { fromURL } from "../../fromDeps/sharpInterface/useSharp/toSharp.js"

const brushImageProcessor = {
    cache: new Map(),
    currentBrush: null,
    processingQueue: new Map(),

    async bufferToImage(buffer) {
        return new Promise((resolve, reject) => {
            const blob = new Blob([buffer], { type: 'image/png' })
            const url = URL.createObjectURL(blob)
            const img = new Image()
            img.onload = () => {
                URL.revokeObjectURL(url)
                resolve(img)
            }
            img.onerror = () => {
                URL.revokeObjectURL(url)
                reject(new Error('图片加载失败'))
            }
            img.src = url
        })
    },
    async processColoredBrush(brushImagePath, color, opacity, blendMode, options = {}) {
        const cacheKey = `${brushImagePath}-${color}`
        
        if (this.currentBrush?.cacheKey === cacheKey) {
            return this.currentBrush.img
        }
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey)
            this.currentBrush = { cacheKey, img: cached }
            return cached
        }

        if (this.processingQueue.has(cacheKey)) {
            return await this.processingQueue.get(cacheKey)
        }
        let processingPromise
         processingPromise = (async () => {
            try {
                const sharpObj = await fromURL(brushImagePath)
                const rgb = hexToRgb(color)
                if (!rgb) throw new Error('无效的颜色值')
                
                let alphaChannel = await sharpObj
                    .extractChannel(3)
                    .resize(options.width, options.height, {
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 }
                    })

                if (options.effect === 'watercolor') {
                    alphaChannel = await this.applyWatercolorEffect(alphaChannel, opacity, options)
                } else {
                    alphaChannel = await alphaChannel.linear(opacity, 0)
                }

                const processedBuffer = await this.createColoredImage(rgb, alphaChannel, options)
                const processedImage = await this.bufferToImage(processedBuffer)
                
                if (this.processingQueue.get(cacheKey) === processingPromise) {
                    this.cache.set(cacheKey, processedImage)
                    this.currentBrush = { cacheKey, img: processedImage }
                }

                return processedImage
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
        return await sharp(rgbImage, {
            raw: {
                width: options.width,
                height: options.height,
                channels: 3
            }
        })
            .joinChannel(await alphaChannel.toBuffer())
            .png()
            .toBuffer()
    },

    clearCache() {
        this.cache.clear()
        this.currentBrush = null
        this.processingQueue.clear()
    }
}

// 导出笔刷图片处理器
export { brushImageProcessor }
