import * as THREE from '../../../../static/three/three.mjs';
import { 
    updateCamera,
    预计算球面轨迹,
    获取当前帧位置,
    captureFrame  // 新增导入
} from './useThree.js';
import { createMuxer, ENCODER_CONFIG } from './videoMuxer.js';
// 在类定义前添加常量配置对象
const Constants = {
    DEFAULT_VALUES: {
        WIDTH: 3840,
        HEIGHT: 2160,
        FPS: 120,
        DURATION: 12,
        FORMAT: 'mp4'
    },
    RENDERER_CONFIG: {
        ANTIALIAS: true,
        PRESERVE_DRAWING_BUFFER: true,
        POWER_PREFERENCE: "high-performance",
        ALPHA: true,
        PRECISION: "highp",
        STENCIL: false,
        DEPTH: true,
        LOGARITHMIC_DEPTH_BUFFER: true,
        SAMPLES: 8
    },
    CAMERA_CONFIG: {
        PORTRAIT_FOV: 90,
        LANDSCAPE_FOV: 75
    },
    SPHERE_CONFIG: {
        RADIUS: 500,
        WIDTH_SEGMENTS: 120,
        HEIGHT_SEGMENTS: 80
    }
};

// 新增工具函数
function updateProgress({
  frameCounter,
  totalFrames,
  thumbnailDataURL,
  progressCallback
}) {
  const progress = Math.min(1, frameCounter / totalFrames);
  let stage = '渲染中...';
  if (frameCounter === 0) stage = '初始化中...';
  if (frameCounter >= totalFrames - 1) stage = '编码中...';

  if (progressCallback) {
    progressCallback({
      progress,
      currentFrame: frameCounter,
      totalFrames,
      stage,
      frameImage: thumbnailDataURL
    });
  }
}

// 添加自适应队列类
class AdaptiveFrameQueue {
  constructor(initialSize = 10, minSize = 5, maxSize = 60) {
    this.queue = [];
    this.minSize = minSize;
    this.maxSize = maxSize;
    this.currentMaxSize = initialSize;
    this.lastProcessTime = Date.now();
    this.processingTimes = [];
  }

  async enqueue(frame) {
    // 自适应等待策略
    while (this.queue.length >= this.currentMaxSize) {
      const waitTime = this.calculateWaitTime();
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.adjustQueueSize();
    }
    this.queue.push(frame);
  }

  dequeue() {
    if (this.queue.length === 0) return null;
    const startTime = Date.now();
    const frame = this.queue.shift();
    const processTime = Date.now() - startTime;
    
    this.processingTimes.push(processTime);
    if (this.processingTimes.length > 10) {
      this.processingTimes.shift();
    }
    
    this.lastProcessTime = Date.now();
    return frame;
  }

  calculateWaitTime() {
    const avgProcessTime = this.getAverageProcessingTime();
    return Math.max(1, Math.min(avgProcessTime / 2, 100));
  }

  getAverageProcessingTime() {
    if (this.processingTimes.length === 0) return 10;
    return this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
  }

  adjustQueueSize() {
    const avgProcessTime = this.getAverageProcessingTime();
    const queueUtilization = this.queue.length / this.currentMaxSize;
    
    if (queueUtilization > 0.8 && avgProcessTime < 50) {
      // 队列接近满且处理速度快，增加容量
      this.currentMaxSize = Math.min(this.maxSize, this.currentMaxSize + 5);
    } else if (queueUtilization < 0.3 && avgProcessTime > 100) {
      // 队列较空且处理速度慢，减少容量
      this.currentMaxSize = Math.max(this.minSize, this.currentMaxSize - 2);
    }
  }

  get length() {
    return this.queue.length;
  }

  get capacity() {
    return this.currentMaxSize;
  }
}



// 新增 VideoEncoderManager 类
class VideoEncoderManager {
  constructor(options) {
    const {
      width,
      height,
      fps,
      format = 'mp4',
      bitrate = format === 'mp4' ? ENCODER_CONFIG.MP4_BITRATE : ENCODER_CONFIG.WEBM_BITRATE,
      keyFrameInterval = ENCODER_CONFIG.KEYFRAME_INTERVAL[format](fps),
      quality = ENCODER_CONFIG.QUALITY
    } = options;

    this.width = width;
    this.height = height;
    this.fps = fps;
    this.format = format;
    this.frameDuration = 1000000 / fps; // 微秒
    this.frameQueue = new AdaptiveFrameQueue(10, 5, 60);
    this.isEncoding = false;
    this.encodingStats = {
      totalFramesProcessed: 0,
      startTime: 0,
      lastProgressUpdate: 0,
      averageEncodingTime: 0
    };
    
    this.initializeMuxer({
      format,
      width,
      height,
      fps,
      bitrate,
      keyFrameInterval,
      quality
    });
    
    this.initializeEncoder(bitrate, keyFrameInterval, quality);
  }

  initializeMuxer(config) {
    this.muxer = createMuxer(config);
  }

  initializeEncoder(bitrate, keyFrameInterval, quality) {
    const codec = this.format === 'mp4' ? 'avc1.640033' : 'vp09.00.10.08';
    
    this.videoEncoder = new VideoEncoder({
      output: (chunk, meta) => this.muxer.addVideoChunk(chunk, meta),
      error: (e) => console.error('VideoEncoder error:', e)
    });

    this.videoEncoder.configure({
      codec,
      width: this.width,
      height: this.height,
      bitrate,
      framerate: this.fps,
      quality,
      latencyMode: 'quality',
    });
  }

  async addFrame(imageData, thumbnailDataURL, frameIndex) {
    await this.frameQueue.enqueue({
      imageData,
      thumbnailDataURL,
      frameIndex
    });
  }

  async encode(frame) {
    const videoFrame = new VideoFrame(frame.imageData, {
      timestamp: frame.frameIndex * this.frameDuration,
      duration: this.frameDuration,
      colorSpace: 'srgb'
    });

    await this.videoEncoder.encode(videoFrame, {
      keyFrame: frame.frameIndex % ENCODER_CONFIG.KEYFRAME_INTERVAL[this.format](this.fps) === 0,
      quality: ENCODER_CONFIG.QUALITY
    });

    videoFrame.close();
  }

  async startEncoding(totalFrames) {
    if (this.isEncoding) return;
    this.isEncoding = true;
    this.encodingStats.startTime = Date.now();
    
    try {
      let encodedFrames = 0;
      while (encodedFrames < totalFrames || this.frameQueue.length > 0) {
        const frame = this.frameQueue.dequeue();
        if (frame) {
          const encodeStartTime = Date.now();
          await this.encode(frame);
          
          // 更新编码统计
          const encodingTime = Date.now() - encodeStartTime;
          this.encodingStats.averageEncodingTime = 
            (this.encodingStats.averageEncodingTime * encodedFrames + encodingTime) / (encodedFrames + 1);
          
          encodedFrames++;
          this.encodingStats.totalFramesProcessed = encodedFrames;
          
          // 定期输出性能统计
          if (Date.now() - this.encodingStats.lastProgressUpdate > 1000) {
            this.logEncodingStats(totalFrames);
            this.encodingStats.lastProgressUpdate = Date.now();
          }
        } else {
          // 动态调整等待时间
          const waitTime = Math.max(1, this.encodingStats.averageEncodingTime / 4);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    } finally {
      this.isEncoding = false;
      this.logEncodingStats(totalFrames, true);
    }
  }

  logEncodingStats(totalFrames, isFinal = false) {
    const elapsedTime = (Date.now() - this.encodingStats.startTime) / 1000;
    const fps = this.encodingStats.totalFramesProcessed / elapsedTime;
    const queueSize = this.frameQueue.length;
    const queueCapacity = this.frameQueue.capacity;
    
    console.log(`编码统计:
      进度: ${this.encodingStats.totalFramesProcessed}/${totalFrames} (${((this.encodingStats.totalFramesProcessed/totalFrames)*100).toFixed(1)}%)
      平均编码时间: ${this.encodingStats.averageEncodingTime.toFixed(1)}ms
      编码FPS: ${fps.toFixed(1)}
      队列状态: ${queueSize}/${queueCapacity}
      ${isFinal ? '总耗时: ' + elapsedTime.toFixed(1) + '秒' : ''}
    `);
  }

  async processFrames(totalFrames, frameGenerator) {
    // 并行处理渲染和编码
    const encodingPromise = this.startEncoding(totalFrames);
    const renderingPromise = this.renderFrames(totalFrames, frameGenerator);
    
    await Promise.all([encodingPromise, renderingPromise]);
  }

  async renderFrames(totalFrames, frameGenerator) {
    for (let frame = 0; frame < totalFrames; frame++) {
      const { imageData, thumbnailDataURL } = await frameGenerator(frame);
      await this.addFrame(imageData, thumbnailDataURL, frame);
    }
  }

  async finalize() {
    await this.videoEncoder.flush();
    this.muxer.finalize();
    const buffer = this.muxer.target.buffer;
    const mimeType = this.format === 'mp4' ? 'video/mp4' : 'video/webm';
    return new Blob([buffer], { type: mimeType });
  }
}

export class PanoramaVideoGenerator {
  constructor(width = Constants.DEFAULT_VALUES.WIDTH, height = Constants.DEFAULT_VALUES.HEIGHT) {
    this.width = width;
    this.height = height;
    this.fps = Constants.DEFAULT_VALUES.FPS;
    this.duration = Constants.DEFAULT_VALUES.DURATION;
    this.videoFormat = Constants.DEFAULT_VALUES.FORMAT;
    this.progressCallback = null; // 新增进度回调函数

    this.initRenderer();

    // 初始化场景和相机
    this.scene = new THREE.Scene();
    const aspect = width / height;
    const isPortrait = height > width;
    // 竖屏模式下使用更大的 FOV 以显示更多内容
    const fov = isPortrait ? Constants.CAMERA_CONFIG.PORTRAIT_FOV : Constants.CAMERA_CONFIG.LANDSCAPE_FOV;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 1, 1000);

    // 创建MediaRecorder
    this.mediaRecorder = null;
    this.chunks = [];
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer(Constants.RENDERER_CONFIG);
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(1); // 固定像素比
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5; // 增加曝光值
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; // 使用sRGB颜色空间

    // 添加Y轴翻转
    this.renderer.setScissorTest(true);
    this.renderer.setScissor(0, 0, this.width, this.height);
    this.renderer.setViewport(0, 0, this.width, this.height);
    this.renderer.setScissorTest(false);
  }

  async setupScene(texture) {
    // 修复颜色空间设置
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      toneMapped: true, // 启用色调映射
      transparent: true,  // 添加透明支持
      opacity: 1,        // 确保完全不透明
      depthWrite: true,  // 确保正确的深度写入
      depthTest: true,   // 确保正确的深度测试
      precision: 'highp' // 提高材质精度
    });

    // 创建球体几何体
    const geometry = new THREE.SphereGeometry(
        Constants.SPHERE_CONFIG.RADIUS,
        Constants.SPHERE_CONFIG.WIDTH_SEGMENTS,
        Constants.SPHERE_CONFIG.HEIGHT_SEGMENTS
    );
    geometry.scale(-1, 1, 1);

    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
  }

  // 新增设置进度回调的方法
  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  async startRecording(options = {}) {
    const {
      duration = 12,
      fps = 120,
      startLon = 0,
      endLon = 360,
      startLat = 0,
      endLat = 0,
      rotations = 1,
      smoothness = 0.8,
      width = this.width,
      height = this.height,
      format = 'mp4'
    } = options;

    this.videoFormat = format;
    this.updateCameraAndRenderer(width, height);

    const totalFrames = Math.ceil(fps * duration);
    this.duration = duration;
    this.fps = fps;

    const encoderManager = new VideoEncoderManager({
      width: this.width,
      height: this.height,
      fps: this.fps,
      format: this.videoFormat
    });

    const cameraPositions = 预计算球面轨迹({
      totalFrames,
      startLon,
      endLon,
      startLat,
      endLat,
      rotations,
      smoothness
    });

    try {
      const frameGenerator = async (frame) => {
        const { currentLon, currentLat } = 获取当前帧位置(cameraPositions, frame);
        updateCamera(this.camera, { currentLon, currentLat });
        
        const frameData = await captureFrame(
          this.renderer,
          this.scene,
          this.camera,
          this.width,
          this.height
        );

        updateProgress({
          frameCounter: frame,
          totalFrames,
          thumbnailDataURL: frameData.thumbnailDataURL,
          progressCallback: this.progressCallback
        });

        return frameData;
      };

      await encoderManager.processFrames(totalFrames, frameGenerator);
      return await encoderManager.finalize();
    } catch (error) {
      console.error('视频生成错误:', error);
      throw error;
    }
  }

  // 新增方法：更新相机和渲染器设置
  updateCameraAndRenderer(width, height) {
    // 更新渲染器尺寸
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height);

    // 根据新的宽高比更新相机参数
    const aspect = width / height;
    const isPortrait = height > width;
    this.camera.fov = isPortrait ? Constants.CAMERA_CONFIG.PORTRAIT_FOV : Constants.CAMERA_CONFIG.LANDSCAPE_FOV;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    // 增强资源清理
 
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.renderer.forceContextLoss();  // 强制释放WebGL资源
    this.renderer.dispose();
    this.scene.clear();
  }
}

// 修改视频保存方法以支持MP4
export async function saveVideoBlob(blob, format = 'mp4') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const extension = format === 'mp4' ? 'mp4' : 'webm';
  a.download = `panorama-video-${Date.now()}.${extension}`;
  a.click();
  URL.revokeObjectURL(a.href);
}
