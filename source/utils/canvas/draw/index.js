import { fromURL } from "../../../utils/fromDeps/sharpInterface/useSharp/toSharp.js"
import { loadImageFromUrl as loadImage } from "../../../utils/image/loader/fromURL.js"
import { 获取事件canvas坐标 } from "../../../utils/canvas/events.js"
import { 当前设备支持压感 } from "../../../utils/system/surport/pressure.js"
import { 尖头马克笔, 宽头马克笔, 水彩笔, 铅笔, 钢笔, 鸭嘴笔 } from "../../../utils/canvas/draw/brushes.js"
import { brushImageProcessor } from '../../../utils/canvas/draw/brushes.js'
import { 按距离采样点序列 } from "../../math/geometry/geom2d.js"
import { 获取事件压力值 } from "../../events/getPressure.js"
import { $canvas混合模式 } from "../../constants/browser.js"
import { brushConfigs } from "./brushes/configs.js"
export class DrawingTools {
    constructor(canvas) {
        this.canvas = canvas
        this.ctx = canvas.getContext('2d', {
            willReadFrequently: true  // 添加此属性以优化频繁读取性能
        })
        this.toolConfigs = {
            marker: brushConfigs.尖头马克笔,
            wideMaker:brushConfigs.宽头马克笔,
            watercolor: brushConfigs.水彩笔,
            pencil: brushConfigs.铅笔,
            pen: brushConfigs.钢笔,
            flatBrush: brushConfigs.鸭嘴笔
        };
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
        this.blendModes =Object.values($canvas混合模式)
        if (当前设备支持压感) {
            this.canvas.style.touchAction = 'none';
            this.canvas.style.userSelect = 'none';
            this.canvas.style.webkitUserSelect = 'none';
            this.canvas.style.webkitTouchCallout = 'none';
            this.canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
            this.canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
            this.canvas.addEventListener('touchend', e => e.preventDefault(), { passive: false });
            this.canvas.addEventListener('mousedown', e => e.preventDefault(), { passive: false });
            this.canvas.addEventListener('mousemove', e => e.preventDefault(), { passive: false });
            this.canvas.addEventListener('mouseup', e => e.preventDefault(), { passive: false });
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
        this.currentDrawFn = null;  // 添加currentDrawFn属性
    }

    clearCanvas() {
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // 异步加载笔刷
    async loadBrushes() {
        try {
            const loadPromises = Object.values(this.toolConfigs)
                .filter(config => config.brushPath) // 只处理有笔刷图片的工具
                .map(async (config) => {
                    let processedImageBuffer = await fromURL(config.brushPath)
                    processedImageBuffer = await processedImageBuffer.resize(
                        config.brushSize.width,
                        config.brushSize.height,
                        {
                            fit: 'contain',
                            background: { r: 0, g: 0, b: 0, alpha: 0 }
                        }
                    ).png().toBuffer()
                    
                    const blob = new Blob([processedImageBuffer], { type: 'image/png' })
                    const url = URL.createObjectURL(blob)
                    this.brushImages[config.name] = await loadImage(url)
                    console.log(`加载并处理笔刷: ${config.name}`)
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
            pressure: 获取事件压力值(e),
            tool: this.currentTool,
            color: this.currentColor,
            size: this.currentSize,
            isStart: true  // 标记为起始点
        });
    }
    draw = async (e) => {
        if (!this.isDrawing) return;
        const point = 获取事件canvas坐标(e, this.canvas);
        const toolConfig = this.toolConfigs[this.currentTool];
        const actualOpacity = this.currentOpacity || toolConfig.defaultOpacity;
        if (!['pen', 'flatBrush'].includes(this.currentTool)) {
            const brushImage = await brushImageProcessor.processColoredBrush(
                this.toolConfigs[this.currentTool].brushPath,
                this.currentColor,
                actualOpacity,
                {
                    width: this.toolConfigs[this.currentTool].width,
                    height: this.toolConfigs[this.currentTool].height,
                    effect: this.currentTool === 'watercolor' ? 'watercolor' : null
                }
            )
            this.brushImages[this.currentTool] = brushImage;
        }
        this.points.push({
            x: point.x,
            y: point.y,
            pressure: 获取事件压力值(e),
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
        if (this.currentDrawFn) {
            const pressure = point.pressure || 1.0;
            const sizeMultiplier = pressure * 0.5 + 0.5;
            const opacityMultiplier = point.opacity * pressure;
            
            this.currentDrawFn(
                lastPoint.x,
                lastPoint.y,
                point.x,
                point.y,
                point.color,
                point.size * sizeMultiplier,
                opacityMultiplier
            );
        }
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
            const baseDrawFn = {
                'marker': 尖头马克笔,
                'wideMaker': 宽头马克笔,
                'watercolor': 水彩笔,
                'pencil': 铅笔,
                'pen': 钢笔,
                'flatBrush': 鸭嘴笔
            }[toolName];
            const ctx = this.ctx
            this.currentDrawFn = (x1, y1, x2, y2, color, size, opacity) => {
                baseDrawFn(
                    ctx,
                    this.brushImages[toolName] || null,
                    x1, y1, x2, y2,
                    color,
                    size,
                    opacity
                );
            };
            this.clearBrushCache();
        }
    }
    collectPoint(e) {
        const point = 获取事件canvas坐标(e, this.canvas)
        this.points.push({
            x: point.x,
            y: point.y,
            pressure: 获取事件压力值(e),
            tool: this.currentTool,
            color: this.currentColor,
            size: this.currentSize,
            opacity: this.currentOpacity
        })
    }
    processPoints() {
        const points = this.pointCollector.points;
        if (points.length < 2) return;
        const filteredPoints = 按距离采样点序列(
            points,
            this.pointProcessConfig.minDistance,
            this.pointProcessConfig.maxDistance
        );
        for (const point of filteredPoints) {
            this.points.push(point);
        }
        this.pointCollector.points = [points[points.length - 1]];
    }
 
}

