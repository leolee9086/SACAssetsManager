import { fromURL } from "../../../utils/fromDeps/sharpInterface/useSharp/toSharp.js"
import { batchLoadImageFromUrl as loadImages, loadImageFromUrl as loadImage } from "../../../utils/image/loader/fromURL.js"
import { 获取事件canvas坐标 } from "../../../utils/canvas/events.js"
import { ispressureSupported } from "../../../utils/system/surport/pressure.js"
import { 尖头马克笔, 宽头马克笔, 水彩笔, 铅笔, 钢笔, 鸭嘴笔 } from "../../../utils/canvas/draw/brushes.js"
import { brushImageProcessor } from '../../../utils/canvas/draw/brushes.js'
import { preloadImage, isImageCached, clearImageCache } from "./cache.js"
import { 按距离采样点序列 } from "../../math/geometry/geom2d.js"
export class DrawingTools {
    constructor(canvas) {
        this.canvas = canvas
        this.ctx = canvas.getContext('2d', {
            willReadFrequently: true  // 添加此属性以优化频繁读取性能
        })
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
            // 阻止所有默认的鼠标和触摸事件
            this.canvas.style.touchAction = 'none';
            this.canvas.style.userSelect = 'none';
            this.canvas.style.webkitUserSelect = 'none';
            this.canvas.style.webkitTouchCallout = 'none';
            // 阻止默认事件
            this.canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
            this.canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
            this.canvas.addEventListener('touchend', e => e.preventDefault(), { passive: false });
            this.canvas.addEventListener('mousedown', e => e.preventDefault(), { passive: false });
            this.canvas.addEventListener('mousemove', e => e.preventDefault(), { passive: false });
            this.canvas.addEventListener('mouseup', e => e.preventDefault(), { passive: false });


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
        this.tools = [
            { name: 'marker', label: '尖头马克笔', color: '#e24a4a' },
            { name: 'wideMaker', label: '荧光笔', color: '#f7d147' },
            { name: 'watercolor', label: '水彩笔', color: '#4a90e2' },
            { name: 'pencil', label: '铅笔', color: '#2c3e50' },
            { name: 'pen', label: '钢笔', color: '#000000' },
            { name: 'flatBrush', label: '鸭嘴笔', color: '#000000' }
        ];
    }

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

    // 修改绘制方法
    draw = async (e) => {
        if (!this.isDrawing) return;
        const point = 获取事件canvas坐标(e, this.canvas);
        const toolConfig = this.toolConfigs[this.currentTool];
        const actualOpacity = this.currentOpacity || toolConfig.defaultOpacity;
        if (!['pen', 'flatBrush'].includes(this.currentTool)) {
            const brushImage = await brushImageProcessor.processColoredBrush(
                this.brushes[this.currentTool],
                this.currentColor,
                actualOpacity,
                // this.currentBlendMode,
                {
                    width: this.brushSizes[this.currentTool].width,
                    height: this.brushSizes[this.currentTool].height,
                    effect: this.currentTool === 'watercolor' ? 'watercolor' : null
                }
            )
            this.brushImages[this.currentTool] = brushImage;
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
        尖头马克笔(this.ctx, this.brushImages.marker, startX, startY, endX, endY, color, size, opacity)
    }
    drawWideMarker(startX, startY, endX, endY, color, size, opacity) {
        宽头马克笔(this.ctx, this.brushImages.wideMaker, startX, startY, endX, endY, color, size, opacity)
    }
    drawWatercolor(startX, startY, endX, endY, color, size, opacity) {
        水彩笔(this.ctx, this.brushImages.watercolor, startX, startY, endX, endY, color, size, opacity)
    }
    drawPencil(startX, startY, endX, endY, color, size, opacity) {
        铅笔(this.ctx, this.brushImages.pencil, startX, startY, endX, endY, color, size, opacity)
    }
    drawPen(startX, startY, endX, endY, color, size, opacity) {
        钢笔(this.ctx, null, startX, startY, endX, endY, color, size, opacity)
    }

    drawFlatBrush(startX, startY, endX, endY, color, size, opacity) {
        鸭嘴笔(this.ctx, null, startX, startY, endX, endY, color, size, opacity)
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
        brushImageProcessor.clearCache()
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
    async handlePointerMove(e) {
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
        return 按距离采样点序列(
            points,
            this.pointProcessConfig.minDistance,
            this.pointProcessConfig.maxDistance
        );
    }
}

