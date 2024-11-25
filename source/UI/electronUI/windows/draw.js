import { fromURL } from "../../../utils/fromDeps/sharpInterface/useSharp/toSharp.js"
import { requirePluginDeps } from "../../../utils/module/requireDeps.js"
const sharp = requirePluginDeps('sharp')
/**
 * 异步加载图片
 * @param {string} src - 图片路径
 * @returns {Promise<HTMLImageElement>} - 返回加载完成的图片对象
 */
export function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image()

        img.onload = () => {
            resolve(img)
        }

        img.onerror = (error) => {
            reject(new Error(`Failed to load image: ${src}`))
        }

        // 设置跨域属性（如果需要的话）
        img.crossOrigin = 'anonymous'

        // 开始加载图片
        img.src = src
    })
}

/**
 * 批量加载多个图片
 * @param {string[]} sources - 图片路径数组
 * @returns {Promise<HTMLImageElement[]>} - 返回加载完成的图片对象数组
 */
export function loadImages(sources) {
    const promises = sources.map(src => loadImage(src))
    return Promise.all(promises)
}

/**
 * 预加载图片并缓存
 * @param {string} src - 图片路径
 * @returns {Promise<HTMLImageElement>}
 */
const imageCache = new Map()

export function preloadImage(src) {
    if (imageCache.has(src)) {
        return Promise.resolve(imageCache.get(src))
    }

    return loadImage(src).then(img => {
        imageCache.set(src, img)
        return img
    })
}

/**
 * 检查图片是否已经被缓存
 * @param {string} src - 图片路径
 * @returns {boolean}
 */
export function isImageCached(src) {
    return imageCache.has(src)
}

/**
 * 清除图片缓存
 * @param {string} [src] - 可选，特定图片路径。如果不提供，则清除所有缓存
 */
export function clearImageCache(src) {
    if (src) {
        imageCache.delete(src)
    } else {
        imageCache.clear()
    }
}
export class DrawingTools {
    constructor(canvas) {
        this.canvas = canvas
        this.ctx = canvas.getContext('2d')
        this.isDrawing = false
        this.points = []
        this.currentTool = 'marker'
        this.currentColor = '#000000'
        this.currentSize = 1
        this.brushImages = {}
        this.pendingPoints = [] // 添加待渲染点数组
        this.renderingPoints = [] // 添加正在渲染的点数组
        this.isRendering = false; // 添加渲染信号
        this.currentOpacity = 1.0; // 添加透明度属性
        this.currentBlendMode = 'source-over'; // 添加当前混合模式属性
        
        // 添加画笔尺寸配置
        this.brushSizes = {
            marker: { width: 20, height: 20, defaultOpacity: 0.6 },
            wideMaker: { width: 30, height: 30, defaultOpacity: 0.3 },
            watercolor: { width: 40, height: 40, defaultOpacity: 0.2 },
            pencil: { width: 10, height: 10, defaultOpacity: 0.8 }
        }

        // 预加载笔刷图片
        this.brushes = {
            marker: '/plugins/SACAssetsManager/assets/brushes/marker.png',
            wideMaker: '/plugins/SACAssetsManager/assets/brushes/wide-marker.png',
            watercolor: '/plugins/SACAssetsManager/assets/brushes/watercolor.png',
            pencil: '/plugins/SACAssetsManager/assets/brushes/pencil.png'
        }

        // 缓存不同颜色的画笔图片
        this.coloredBrushCache = new Map()
        this.currentBrush = null; // 添加当前画笔缓存

        // 添加混合模式配置
        this.blendModes = [
            'clear',
            'source',
            'over',
            'in',
            'out',
            'atop',
            'dest',
            'dest-over',
            'dest-in',
            'dest-out',
            'dest-atop',
            'xor',
            'add',
            'saturate',
            'multiply',
            'screen',
            'overlay',
            'darken',
            'lighten',
            'colour-dodge',
            'color-dodge',
            'colour-burn',
            'color-burn',
            'hard-light',
            'soft-light',
            'difference',
            'exclusion'
        ];

        this.loadBrushes().then(() => {
            this.initRenderLoop()
            console.log('笔刷加载完成，初始化渲染循环')
        })
    }

    // 异步加载笔刷
    async loadBrushes() {
        try {
            const loadPromises = Object.entries(this.brushes).map(async ([key, path]) => {
                // 使用sharp处理图片
                let processedImageBuffer = await fromURL(path)
                processedImageBuffer =await processedImageBuffer.resize(this.brushSizes[key].width, this.brushSizes[key].height, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .png()
                .toBuffer()
                // 将处理后的Buffer转换为Blob
                const blob = new Blob([processedImageBuffer], { type: 'image/png' })
                const url = URL.createObjectURL(blob)
                
                // 加载处理后的图片
                this.brushImages[key] = await loadImage(url)
                console.log(`加载并处理笔刷: ${key}`)
                
                // 清理URL
                URL.revokeObjectURL(url)
            })
            await Promise.all(loadPromises)
        } catch (error) {
            console.error('加载笔刷失败:', error)
        }
    }


    initRenderLoop() {
        const render = () => {
            if (this.points.length > 2) {
                this.renderPoints()
            }
            requestAnimationFrame(render)
        }
        requestAnimationFrame(render)
    }

    getCanvasPoint(e) {
        const rect = this.canvas.getBoundingClientRect()
        const scaleX = this.canvas.width / rect.width
        const scaleY = this.canvas.height / rect.height

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        }
    }

    startDrawing(e) {
        this.isDrawing = true
        const point = this.getCanvasPoint(e)
        this.points.push({
            x: point.x,
            y: point.y,
            tool: this.currentTool,
            color: this.currentColor,
            size: this.currentSize,
            isStart: true
        })
        console.log('开始绘制', point)
    }

    // 修改处理带颜色的画笔图片方法
    async processColoredBrush(brushKey, color) {
        const cacheKey = `${brushKey}-${color}-${this.currentOpacity}-${this.currentBlendMode}`;
        
        if (this.currentBrush?.cacheKey === cacheKey) {
            return this.currentBrush.img;
        }
        
        if (this.coloredBrushCache.has(cacheKey)) {
            const cached = this.coloredBrushCache.get(cacheKey);
            this.currentBrush = { cacheKey, img: cached };
            return cached;
        }

        try {
            const rgb = this.hexToRgb(color)
            if (!rgb) throw new Error('无效的颜色值')

            let originalImage = await fromURL(this.brushes[brushKey])
            
            // 调整大小并提取alpha通道
            let alphaChannel = await originalImage
                .resize(this.brushSizes[brushKey].width, this.brushSizes[brushKey].height, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .extractChannel(3) // 提取alpha通道

            // 为水彩笔刷添加随机噪波效果
            if (brushKey === 'watercolor') {
                alphaChannel = await alphaChannel
                    .raw()
                    .toBuffer()
                    .then(buffer => {
                        // 创建带随机噪波的新buffer
                        const newBuffer = Buffer.alloc(buffer.length*3)
                        for (let i = 0; i < buffer.length; i++) {
                            const alpha = buffer[i]
                            // 生成-20到20之间的随机噪波
                            const noise = Math.floor(Math.random() * 41) - 20
                            // 混合原始alpha值和噪波，确保在0-255范围内
                            newBuffer[i] = Math.max(0, Math.min(255, 
                                Math.floor((alpha + noise) * this.currentOpacity)
                            ))
                        }
                        return sharp(newBuffer, {
                            raw: {
                                width: this.brushSizes[brushKey].width,
                                height: this.brushSizes[brushKey].height,
                                channels: 1
                            }
                        }).png()
                    })
            } else {
                // 非水彩笔刷正常处理透明度
                alphaChannel = await alphaChannel.linear(this.currentOpacity, 0)
            }

            // 创建RGB通道
            const rgbImage = await sharp({
                create: {
                    width: this.brushSizes[brushKey].width,
                    height: this.brushSizes[brushKey].height,
                    channels: 3,
                    background: { r: rgb.r, g: rgb.g, b: rgb.b }
                }
            }).raw().toBuffer()

            // 使用joinChannel合成最终图片
            const processedImageBuffer = await sharp(rgbImage, {
                raw: {
                    width: this.brushSizes[brushKey].width,
                    height: this.brushSizes[brushKey].height,
                    channels: 3
                }
            })
            .joinChannel(await alphaChannel.toBuffer())
            .png()
            .toBuffer()

            // 转换为Blob并创建URL
            const blob = new Blob([processedImageBuffer], { type: 'image/png' })
            const url = URL.createObjectURL(blob)
            
            // 加载处理后的图片
            const img = await loadImage(url)
            
            // 更新缓存
            this.coloredBrushCache.set(cacheKey, img);
            this.currentBrush = { cacheKey, img };
            
            // 清理URL
            URL.revokeObjectURL(url)
            
            return img
        } catch (error) {
            console.error('处理彩色画笔失败:', error)
            throw error
        }
    }

    // 添加辅助方法：将十六进制颜色转换为RGB对象
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null
    }

    // 修改绘制方法
    draw = async (e, tool, color, size = 1, opacity = null) => {
        if (!this.isDrawing) return;

        const actualOpacity = opacity ?? this.currentOpacity;
        
        if (this.currentTool !== tool || 
            this.currentColor !== color || 
            this.currentOpacity !== actualOpacity) {
            
            this.currentTool = tool;
            this.currentColor = color;
            this.currentSize = size;
            this.currentOpacity = actualOpacity;
            
            this.brushImages[tool] = await this.processColoredBrush(tool, color);
        }

        const point = this.getCanvasPoint(e);
        this.points.push({
            x: point.x,
            y: point.y,
            tool,
            color,
            size,
            opacity: actualOpacity,
            isStart: false
        });
    }

    async renderPoints() {
        if (this.points.length < 2 || this.isRendering) return;

        this.isRendering = true;
        let lastPoint = null;
        const pointsToRender = [...this.points];
        
        for (const point of pointsToRender) {
            if (!point) continue;
            
            if (point.isStart) {
                lastPoint = point;
                continue;
            }

            if (lastPoint) {
                try {
                    await this.drawStroke(lastPoint, point);
                } catch (error) {
                    console.error('绘制错误:', error);
                }
            }
            lastPoint = point;
        }

        if (this.points.includes(null)) {
            this.points = [];
        }
        
        this.isRendering = false;
    }

    // 修改绘制笔画方法
    async drawStroke(lastPoint, point) {
        const drawFn = {
            'marker': this.drawMarker,
            'wideMaker': this.drawWideMarker,
            'watercolor': this.drawWatercolor,
            'pencil': this.drawPencil
        }[point.tool];

        if (drawFn) {
            await drawFn.call(
                this,
                lastPoint.x,
                lastPoint.y,
                point.x,
                point.y,
                point.color,
                point.size,
                point.opacity ?? this.brushSizes[point.tool].defaultOpacity
            );
        }
    }

    drawMarker(startX, startY, endX, endY, color, size, opacity) {
        const spacing = 5
        const dx = endX - startX
        const dy = endY - startY
        const distance = Math.sqrt(dx * dx + dy * dy)
        const angle = Math.atan2(dy, dx)

        this.ctx.save()
        this.ctx.globalAlpha = opacity/20

        for (let i = 0; i < distance; i += spacing) {
            const x = startX + (Math.cos(angle) * i)
            const y = startY + (Math.sin(angle) * i)
            this.ctx.drawImage(
                this.brushImages.marker,
                x - (size * 10) / 2,
                y - (size * 10) / 2,
                size * 10,
                size * 10
            )
        }

        this.ctx.restore()
    }

    drawWideMarker(startX, startY, endX, endY, color, size, opacity) {
        this.ctx.save()
        this.ctx.globalAlpha = opacity/30
        this.ctx.globalCompositeOperation = 'multiply'
        const spacing = 5
        const dx = endX - startX
        const dy = endY - startY
        const distance = Math.sqrt(dx * dx + dy * dy)
        const angle = Math.atan2(dy, dx)

        for (let i = 0; i < distance; i += spacing) {
            const x = startX + (Math.cos(angle) * i)
            const y = startY + (Math.sin(angle) * i)

            this.ctx.drawImage(
                this.brushImages.wideMaker,
                x - (size * 15) / 2,
                y - (size * 15) / 2,
                size * 15,
                size * 15
            )
        }

        this.ctx.restore()
    }

    drawWatercolor(startX, startY, endX, endY, color, size, opacity) {
        this.ctx.save()
        this.ctx.globalAlpha = opacity/10
        this.ctx.globalCompositeOperation = 'source-over'

        const spacing = 5
        const dx = endX - startX
        const dy = endY - startY
        const distance = Math.sqrt(dx * dx + dy * dy)
        const angle = Math.atan2(dy, dx)

        for (let i = 0; i < distance; i += spacing) {
            const x = startX + (Math.cos(angle) * i)
            const y = startY + (Math.sin(angle) * i)

            this.ctx.drawImage(
                this.brushImages.watercolor,
                x - (size * 20) / 2,
                y - (size * 20) / 2,
                size * 20,
                size * 20
            )
        }

        this.ctx.restore()
    }

    drawPencil(startX, startY, endX, endY, color, size, opacity) {
        this.ctx.save()
        this.ctx.globalAlpha = opacity

        const spacing = 2
        const dx = endX - startX
        const dy = endY - startY
        const distance = Math.sqrt(dx * dx + dy * dy)
        const angle = Math.atan2(dy, dx)

        for (let i = 0; i < distance; i += spacing) {
            const x = startX + (Math.cos(angle) * i)
            const y = startY + (Math.sin(angle) * i)

            this.ctx.drawImage(
                this.brushImages.pencil,
                x - (size * 5) / 2,
                y - (size * 5) / 2,
                size * 5,
                size * 5
            )
        }

        this.ctx.restore()
    }

    stopDrawing() {
        this.isDrawing = false
        this.points.push(null)
        console.log('停止绘制')
    }

    // 添加清理方法
    clearBrushCache() {
        this.coloredBrushCache.clear();
        this.currentBrush = null;
    }

    // 添加设置透明度的方法
    setOpacity(opacity) {
        this.currentOpacity = Math.max(0, Math.min(1, opacity));
        this.clearBrushCache(); // 清除缓存以重新生成带新透明度的画笔
    }

    // 添加设置混合模式的方法
    setBlendMode(mode) {
        if (this.blendModes.includes(mode)) {
            this.currentBlendMode = mode;
            this.clearBrushCache(); // 清除缓存以重新生成画笔
        }
    }
}

export function initDrawingTest(containerId) {
    const container = document.getElementById(containerId)
    if (!container) {
        console.error('找不到容器:', containerId)
        return
    }

    // 创建测试容器
    container.style.display = 'flex'
    container.style.flexDirection = 'column'
    container.style.gap = '10px'
    container.style.padding = '20px'

    // 创建画布
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.heigt = 600

    canvas.style.border = '1px solid #ccc'
    canvas.style.backgroundColor = '#fff'
    container.appendChild(canvas)

    // 初始化绘画工具
    const drawingTools = new DrawingTools(canvas)

    // 创建工具栏
    const toolbar = document.createElement('div')
    toolbar.style.display = 'flex'
    toolbar.style.gap = '10px'
    container.appendChild(toolbar)

    // 定义工具
    const tools = [
        { name: 'marker', label: '尖头马克笔', color: '#E24A4A' },
        { name: 'wideMaker', label: '荧光笔', color: '#F7D147' },
        { name: 'watercolor', label: '水彩笔', color: '#4A90E2' },
        { name: 'pencil', label: '铅笔', color: '#2C3E50' }
    ]

    let currentTool = tools[0]
    let currentColor = currentTool.color
    let currentSize = 1

    // 添加工具按钮
    tools.forEach(tool => {
        const button = document.createElement('button')
        button.textContent = tool.label
        button.style.padding = '8px 16px'
        button.style.cursor = 'pointer'
        button.onclick = () => {
            currentTool = tool
            currentColor = tool.color
            colorPicker.value = tool.color
        }
        toolbar.appendChild(button)
    })

    // 添加颜色选择器
    const colorPicker = document.createElement('input')
    colorPicker.type = 'color'
    colorPicker.value = currentColor
    colorPicker.onchange = (e) => {
        currentColor = e.target.value
    }
    toolbar.appendChild(colorPicker)

    // 添加大小滑块
    const sizeSlider = document.createElement('input')
    sizeSlider.type = 'range'
    sizeSlider.min = '0.5'
    sizeSlider.max = '3'
    sizeSlider.step = '0.01'
    sizeSlider.value = '1'
    sizeSlider.onchange = (e) => {
        currentSize = parseFloat(e.target.value)
    }
    toolbar.appendChild(sizeSlider)

    // 添加清除按钮
    const clearButton = document.createElement('button')
    clearButton.textContent = '清除画布'
    clearButton.style.padding = '8px 16px'
    clearButton.style.cursor = 'pointer'
    clearButton.onclick = () => {
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    toolbar.appendChild(clearButton)

    // 添加透明度滑块
    const opacitySlider = document.createElement('input');
    opacitySlider.type = 'range';
    opacitySlider.min = '0';
    opacitySlider.max = '1';
    opacitySlider.step = '0.01';
    opacitySlider.value = '1';
    opacitySlider.onchange = (e) => {
        drawingTools.setOpacity(parseFloat(e.target.value));
    };
    toolbar.appendChild(opacitySlider);

    // 添加混合模式选择器
    const blendModeSelect = document.createElement('select');
    blendModeSelect.style.padding = '8px';
    drawingTools.blendModes.forEach(mode => {
        const option = document.createElement('option');
        option.value = mode;
        option.textContent = mode;
        if (mode === 'source-over') {
            option.selected = true;
        }
        blendModeSelect.appendChild(option);
    });
    
    blendModeSelect.onchange = (e) => {
        drawingTools.setBlendMode(e.target.value);
    };
    
    // 创建标签
    const blendModeLabel = document.createElement('label');
    blendModeLabel.textContent = '混合模式：';
    blendModeLabel.style.display = 'flex';
    blendModeLabel.style.alignItems = 'center';
    blendModeLabel.style.gap = '5px';
    blendModeLabel.appendChild(blendModeSelect);
    
    toolbar.appendChild(blendModeLabel);

    // 添加事件监听
    canvas.addEventListener('mousedown', (e) => {
        drawingTools.startDrawing(e)
    })

    canvas.addEventListener('mousemove', (e) => {
        drawingTools.draw(e, currentTool.name, currentColor, currentSize)
    })

    canvas.addEventListener('mouseup', () => {
        drawingTools.stopDrawing()
    })

    canvas.addEventListener('mouseleave', () => {
        drawingTools.stopDrawing()
    })

    return {
        canvas,
        drawingTools,
        clear: () => {
            const ctx = canvas.getContext('2d')
            ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
    }
}
initDrawingTest('app')