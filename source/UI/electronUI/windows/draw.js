import { fromURL } from "../../../utils/fromDeps/sharpInterface/useSharp/toSharp.js"
import { batchLoadImageFromUrl as loadImages, loadImageFromUrl as loadImage } from "../../../utils/image/loader/fromURL.js"
import { hexToRgb } from "../../../utils/color/convert.js"
import { requirePluginDeps } from "../../../utils/module/requireDeps.js"
import { 获取事件canvas坐标 } from "../../../utils/canvas/events.js"
import { ispressureSupported } from "../../../utils/system/surport/pressure.js"
const sharp = requirePluginDeps('sharp')


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
        this.lastPoint = null;  // 添加最后一个点的记录
        this.brushSizes = {
            marker: { width: 20, height: 20, defaultOpacity: 0.6 },
            wideMaker: { width: 30, height: 30, defaultOpacity: 0.3 },
            watercolor: { width: 40, height: 40, defaultOpacity: 0.2 },
            pencil: { width: 10, height: 10, defaultOpacity: 0.8 },
            pen: { width: 2, height: 2, defaultOpacity: 1.0 },
            flatBrush: { width: 8, height: 8, defaultOpacity: 1.0 }
        }
        this.brushes = {
            marker: '/plugins/SACAssetsManager/assets/brushes/marker.png',
            wideMaker: '/plugins/SACAssetsManager/assets/brushes/wide-marker.png',
            watercolor: '/plugins/SACAssetsManager/assets/brushes/watercolor.png',
            pencil: '/plugins/SACAssetsManager/assets/brushes/pencil.png'
        }
        this.coloredBrushCache = new Map()
        this.currentBrush = null;
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
        this.pressureSupported = ispressureSupported()

        if (this.pressureSupported) {
            this.canvas.style.touchAction = 'none';
            this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this), { passive: true });
            this.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this), { passive: true });
            this.canvas.addEventListener('pointerup', this.handlePointerUp.bind(this), { passive: true });
            this.canvas.addEventListener('pointerout', this.handlePointerUp.bind(this), { passive: true });
        }

        this.loadBrushes().then(() => {
            this.initRenderLoop()
            console.log('笔刷加载完成，初始化渲染循环')
        })
        this.currentTool = 'marker'
        this.currentColor = '#000000'  // 设置默认颜色
        this.currentSize = 1
        this.toolConfigs = {
            marker: { defaultColor: '#e24a4a', defaultSize: 1, defaultOpacity: 0.6 },
            wideMaker: { defaultColor: '#f7d147', defaultSize: 1, defaultOpacity: 0.3 },
            watercolor: { defaultColor: '#4a90e2', defaultSize: 1, defaultOpacity: 0.2 },
            pencil: { defaultColor: '#2c3e50', defaultSize: 1, defaultOpacity: 0.8 },
            pen: { defaultColor: '#000000', defaultSize: 1, defaultOpacity: 1.0 },
            flatBrush: { defaultColor: '#000000', defaultSize: 1, defaultOpacity: 1.0 }
        }
        this.pointProcessConfig = {
            minDistance: 0.5,        // 降低最小距离阈值
            maxDistance: 100,        // 提高最大距离容忍度
            samplingInterval: 4,     // 提高采样频率 (~240fps)
            batchSize: 3            // 小批量处理点数
        };
        this.pointCollector = {
            points: [],
            lastTime: performance.now()
        };
        this.usePredictedPoints = false;

        // 添加工具配置
        this.tools = [
            { name: 'marker', label: '尖头马克笔', color: '#e24a4a' },
            { name: 'wideMaker', label: '荧光笔', color: '#f7d147' },
            { name: 'watercolor', label: '水彩笔', color: '#4a90e2' },
            { name: 'pencil', label: '铅笔', color: '#2c3e50' },
            { name: 'pen', label: '钢笔', color: '#000000' },
            { name: 'flatBrush', label: '鸭嘴笔', color: '#000000' }
        ];

        // 添加基础事件监听
        this.initBaseEvents();
    }

    // 添加新方法
    initBaseEvents() {
        this.canvas.addEventListener('mousedown', (e) => {
            this.startDrawing(e);
        }, { passive: true });

        this.canvas.addEventListener('mousemove', (e) => {
            this.draw(e);
        }, { passive: true });

        this.canvas.addEventListener('mouseup', () => {
            this.stopDrawing();
        }, { passive: true });

        this.canvas.addEventListener('mouseleave', () => {
            this.stopDrawing();
        }, { passive: true });
    }

    // 添加清除画布方法
    clearCanvas() {
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // 异步加载笔刷
    async loadBrushes() {
        try {
            const loadPromises = Object.entries(this.brushes).map(async ([key, path]) => {
                // 使用sharp处理图片
                let processedImageBuffer = await fromURL(path)
                processedImageBuffer = await processedImageBuffer.resize(this.brushSizes[key].width, this.brushSizes[key].height, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                }).png().toBuffer()
                const blob = new Blob([processedImageBuffer], { type: 'image/png' })
                const url = URL.createObjectURL(blob)
                this.brushImages[key] = await loadImage(url)
                console.log(`加载并处理笔刷: ${key}`)
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
            // 直接请求下一帧，不做任何时序控制
            requestAnimationFrame(render)
        }
        requestAnimationFrame(render)
    }

    getCanvasPoint(e) {
        return 获取事件canvas坐标(e, this.canvas)
    }
    startDrawing(e) {
        this.isDrawing = true;
        this.points = [];
        this.lastPoint = null;
        const point = 获取事件canvas坐标(e, this.canvas);
        this.points.push({
            x: point.x,
            y: point.y,
            pressure: this.getPressure(e),
            tool: this.currentTool,
            color: this.currentColor,
            size: this.currentSize,
            isStart: true  // 标记为起始点
        });
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
            const rgb = hexToRgb(color)
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
                        const newBuffer = Buffer.alloc(buffer.length * 3)
                        for (let i = 0; i < buffer.length; i++) {
                            const alpha = buffer[i]
                            const noise = Math.floor(Math.random() * 41) - 20
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
                alphaChannel = await alphaChannel.linear(this.currentOpacity, 0)
            }
            const rgbImage = await sharp({
                create: {
                    width: this.brushSizes[brushKey].width,
                    height: this.brushSizes[brushKey].height,
                    channels: 3,
                    background: { r: rgb.r, g: rgb.g, b: rgb.b }
                }
            }).raw().toBuffer()
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
            const blob = new Blob([processedImageBuffer], { type: 'image/png' })
            const url = URL.createObjectURL(blob)
            const img = await loadImage(url)
            this.coloredBrushCache.set(cacheKey, img);
            this.currentBrush = { cacheKey, img };
            URL.revokeObjectURL(url)
            return img
        } catch (error) {
            console.error('处理彩色画笔失败:', error)
            throw error
        }
    }



    // 修改绘制方法
    draw = async (e) => {
        if (!this.isDrawing) return;
        const point = 获取事件canvas坐标(e, this.canvas);
        const toolConfig = this.toolConfigs[this.currentTool];
        const actualOpacity = this.currentOpacity || toolConfig.defaultOpacity;
        if (!['pen', 'flatBrush'].includes(this.currentTool)) {
            const brushKey = `${this.currentTool}-${this.currentColor}-${actualOpacity}-${this.currentBlendMode}`;
            if (!this.currentBrush || this.currentBrush.cacheKey !== brushKey) {
                this.brushImages[this.currentTool] = await this.processColoredBrush(this.currentTool, this.currentColor);
            }
        }
        this.points.push({
            x: point.x,
            y: point.y,
            pressure: this.getPressure(e),
            tool: this.currentTool,
            color: this.currentColor,
            size: this.currentSize,
            opacity: actualOpacity,
            isStart: false
        });
    }
    async renderPoints() {
        if (this.points.length < 2 || this.isRendering) return;
        this.isRendering = true;
        let lastPoint = null;
        for (const point of this.points) {
            if (!lastPoint) {
                lastPoint = point;
                continue;
            }
            this.drawStroke(lastPoint, point);
            lastPoint = point;
        }
        this.points = this.points.slice(-1);
        this.isRendering = false;
    }
    async drawStroke(lastPoint, point) {
        const drawFn = {
            'marker': this.drawMarker,
            'wideMaker': this.drawWideMarker,
            'watercolor': this.drawWatercolor,
            'pencil': this.drawPencil,
            'pen': this.drawPen,
            'flatBrush': this.drawFlatBrush
        }[point.tool];
        if (drawFn) {
            const pressure = point.pressure || 1.0;
            const sizeMultiplier = pressure * 0.5 + 0.5; // 压感对大小的影响较小
            const opacityMultiplier = point.opacity * pressure; // 压感对透明度的影响更明显
            drawFn.call(
                this,
                lastPoint.x,
                lastPoint.y,
                point.x,
                point.y,
                point.color,
                point.size * sizeMultiplier,
                opacityMultiplier);
        }
    }

    drawMarker(startX, startY, endX, endY, color, size, opacity) {
        const spacing = 1
        const dx = endX - startX
        const dy = endY - startY
        const distance = Math.sqrt(dx * dx + dy * dy)
        const angle = Math.atan2(dy, dx)
        this.ctx.save()
        this.ctx.globalAlpha = opacity / 10
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
        this.ctx.globalAlpha = opacity / 30
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
        this.ctx.globalAlpha = opacity / 10
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

    drawPen(startX, startY, endX, endY, color, size, opacity) {
        this.ctx.save();
        this.ctx.globalAlpha = opacity;

        const spacing = 0.5; // 非常密集的间距
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        for (let i = 0; i < distance; i += spacing) {
            const x = startX + (Math.cos(angle) * i);
            const y = startY + (Math.sin(angle) * i);

            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = color;
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    drawFlatBrush(startX, startY, endX, endY, color, size, opacity) {
        this.ctx.save();
        this.ctx.globalAlpha = opacity;

        const spacing = 0.5; // 非常密集的间距
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        for (let i = 0; i < distance; i += spacing) {
            const x = startX + (Math.cos(angle) * i);
            const y = startY + (Math.sin(angle) * i);

            this.ctx.fillStyle = color;
            this.ctx.fillRect(
                x - (size * 2),
                y - size / 2,
                size * 4,
                size
            );
        }

        this.ctx.restore();
    }
    stopDrawing() {
        if (this.pointCollector.points.length > 0) {
            this.processPoints(); // 处理剩余的点
        }
        this.isDrawing = false;
        this.points = [];
        this.pointCollector.points = [];
        this.pointCollector.lastTime = performance.now();
    }
    clearBrushCache() {
        this.coloredBrushCache.clear();
        this.currentBrush = null;
    }
    setOpacity(opacity) {
        this.currentOpacity = Math.max(0, Math.min(1, opacity));
        this.clearBrushCache(); // 清除缓存以重新生成带新透明度的画笔
    }
    setBlendMode(mode) {
        if (this.blendModes.includes(mode)) {
            this.currentBlendMode = mode;
            this.clearBrushCache(); // 清除缓存以重新生成画笔
        }
    }
    getPressure(e) {
        if (this.pressureSupported && e.pressure !== undefined && e.pressure !== 0) {
            return e.pressure;
        }
        return 1.0;
    }
    handlePointerDown(e) {
        this.currentTool = this.currentTool;  // 确保使用当前选中的工具
        this.currentColor = this.currentColor;  // 确保使用当前选中的颜色
        this.startDrawing(e);
    }
    handlePointerMove(e) {
        if (!this.isDrawing) return;
        if (e.getCoalescedEvents) {
            const events = e.getCoalescedEvents();
            for (const event of events) {
                this.draw(event);
            }
            if (this.usePredictedPoints && e.getPredictedEvents) {
                const predicted = e.getPredictedEvents();
                for (const event of predicted) {
                    this.draw(event);
                }
            }
        } else {
            this.draw(e);
        }
    }
    handlePointerUp(e) {
        this.stopDrawing();
    }
    setTool(toolName) {
        if (this.toolConfigs[toolName]) {
            this.currentTool = toolName;
            const config = this.toolConfigs[toolName];
            this.currentColor = config.defaultColor;
            this.currentSize = config.defaultSize;
            this.currentOpacity = config.defaultOpacity;
            this.clearBrushCache(); // 清除缓存以重新生成画笔
        }
    }
    collectPoint(e) {
        const point = 获取事件canvas坐标(e, this.canvas)
        this.points.push({
            x: point.x,
            y: point.y,
            pressure: this.getPressure(e),
            tool: this.currentTool,
            color: this.currentColor,
            size: this.currentSize,
            opacity: this.currentOpacity
        })
    }
    processPoints() {
        const points = this.pointCollector.points;
        if (points.length < 2) return;
        const filteredPoints = this.filterPoints(points);
        for (const point of filteredPoints) {
            this.points.push(point);
        }
        this.pointCollector.points = [points[points.length - 1]];
    }
    filterPoints(points) {
        return points.reduce((filtered, point, index, array) => {
            if (filtered.length === 0) {
                filtered.push(point);
                return filtered;
            }
            const lastPoint = filtered[filtered.length - 1];
            const distance = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
            if (distance >= this.pointProcessConfig.minDistance &&
                distance <= this.pointProcessConfig.maxDistance) {
                filtered.push(point);
            }
            return filtered;
        }, []);
    }
}
export function initDrawingTest(containerId) {
    const container = document.getElementById(containerId)
    if (!container) {
        console.error('找不到容器:', containerId)
        return
    }
    container.style.display = 'flex'
    container.style.flexDirection = 'column'
    container.style.gap = '10px'
    container.style.padding = '20px'
    const canvas = document.createElement('canvas')
    canvas.width = 4096
    canvas.height = 1960
    canvas.style.border = '1px solid #ccc'
    canvas.style.backgroundColor = '#fff'
    container.appendChild(canvas)
    const drawingTools = new DrawingTools(canvas)
    const toolbar = document.createElement('div')
    toolbar.style.display = 'flex'
    toolbar.style.gap = '10px'
    container.appendChild(toolbar)
    const tools = [
        { name: 'marker', label: '尖头马克笔', color: '#e24a4a' },
        { name: 'wideMaker', label: '荧光笔', color: '#f7d147' },
        { name: 'watercolor', label: '水彩笔', color: '#4a90e2' },
        { name: 'pencil', label: '铅笔', color: '#2c3e50' },
        { name: 'pen', label: '钢笔', color: '#000000' },
        { name: 'flatBrush', label: '鸭嘴笔', color: '#000000' }
    ]
    let currentTool = tools[0]
    let currentColor = currentTool.color
    tools.forEach(tool => {
        const button = document.createElement('button')
        button.textContent = tool.label
        button.style.padding = '8px 16px'
        button.style.cursor = 'pointer'

        button.addEventListener('click', () => {
            drawingTools.setTool(tool.name);  // 使用新的setTool方法
            colorPicker.value = drawingTools.currentColor;  // 更新颜色选择器的值
        })
        toolbar.appendChild(button)
    })
    const colorPicker = document.createElement('input')
    colorPicker.type = 'color'
    colorPicker.value = currentColor
    colorPicker.onchange = (e) => {
        drawingTools.currentColor = e.target.value;
        drawingTools.clearBrushCache();  // ��除缓存以重新生成画笔
    }
    toolbar.appendChild(colorPicker)
    const sizeSlider = document.createElement('input')
    sizeSlider.type = 'range'
    sizeSlider.min = '0.5'
    sizeSlider.max = '3'
    sizeSlider.step = '0.01'
    sizeSlider.value = '1'
    sizeSlider.onchange = (e) => {
        const newSize = parseFloat(e.target.value);
        drawingTools.currentSize = newSize;  // 直接更新 drawingTools 的状态
    }
    toolbar.appendChild(sizeSlider)
    const clearButton = document.createElement('button')
    clearButton.textContent = '清除画布'
    clearButton.style.padding = '8px 16px'
    clearButton.style.cursor = 'pointer'
    clearButton.addEventListener('click', () => {
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
    })
    toolbar.appendChild(clearButton)
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
    const blendModeLabel = document.createElement('label');
    blendModeLabel.textContent = '混合模式：';
    blendModeLabel.style.display = 'flex';
    blendModeLabel.style.alignItems = 'center';
    blendModeLabel.style.gap = '5px';
    blendModeLabel.appendChild(blendModeSelect);
    toolbar.appendChild(blendModeLabel);
    const predictContainer = document.createElement('div');
    predictContainer.style.display = 'flex';
    predictContainer.style.alignItems = 'center';
    predictContainer.style.gap = '5px';
    const predictSwitch = document.createElement('input');
    predictSwitch.type = 'checkbox';
    predictSwitch.id = 'predictSwitch';
    predictSwitch.checked = false;
    const predictLabel = document.createElement('label');
    predictLabel.htmlFor = 'predictSwitch';
    predictLabel.textContent = '引用预测点优化';
    predictSwitch.onchange = (e) => {
        drawingTools.usePredictedPoints = e.target.checked;
    };
    predictContainer.appendChild(predictSwitch);
    predictContainer.appendChild(predictLabel);
    toolbar.appendChild(predictContainer);
    return {
        canvas,
        drawingTools,
        clear: () => drawingTools.clearCanvas()
    }
}
initDrawingTest('app')