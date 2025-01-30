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

// 添加队列类
class FrameQueue {
  constructor(maxSize = 10) {
    this.queue = [];
    this.maxSize = maxSize;
  }

  async enqueue(frame) {
    while (this.queue.length >= this.maxSize) {
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    this.queue.push(frame);
  }

  dequeue() {
    return this.queue.shift();
  }

  get length() {
    return this.queue.length;
  }
}

// 新增编码器工具函数
async function encodeFramesToVideo({
  frameQueue,
  totalFrames,
  frameDuration,
  videoEncoder,
  keyFrameInterval,
  quality
}) {
  let frameCounter = 0;
  while (frameCounter < totalFrames) {
    if (frameQueue.length > 0) {
      const frameData = frameQueue.dequeue();
      const frame = new VideoFrame(frameData.imageData, {
        timestamp: frameCounter * frameDuration,
        duration: frameDuration,
        colorSpace: 'srgb'
      });

      await videoEncoder.encode(frame, {
        keyFrame: frameCounter % keyFrameInterval === 0,
        quality: quality
      });

      frame.close();
      frameCounter++;
    } else {
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }
}

// 新增纯函数
async function renderFrames({
  totalFrames,
  cameraPositions,
  renderer,
  scene,
  camera,
  width,
  height,
  frameQueue,
  progressCallback
}) {
  for (let frame = 0; frame < totalFrames; frame++) {
    const { currentLon, currentLat } = 获取当前帧位置(cameraPositions, frame);
    updateCamera(camera, { currentLon, currentLat });
    
    const { imageData, thumbnailDataURL } = await captureFrame(
      renderer,
      scene,
      camera,
      width,
      height
    );

    await frameQueue.enqueue({
      imageData,
      thumbnailDataURL,
      frameIndex: frame
    });

    updateProgress({
      frameCounter: frame,
      totalFrames,
      thumbnailDataURL,
      progressCallback
    });
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
    this.muxer = createMuxer({
      format: this.videoFormat,
      width: this.width,
      height: this.height,
      fps,
      bitrate: this.videoFormat === 'mp4' ? ENCODER_CONFIG.MP4_BITRATE : ENCODER_CONFIG.WEBM_BITRATE,
      keyFrameInterval: ENCODER_CONFIG.KEYFRAME_INTERVAL[this.videoFormat](fps),
      quality: ENCODER_CONFIG.QUALITY
    });

    // 更新渲染器和相机尺寸的逻辑移到新方法中
    this.updateCameraAndRenderer(width, height);

    // 优化MP4编码参数
    const bitrate = this.videoFormat === 'mp4' ? ENCODER_CONFIG.MP4_BITRATE : ENCODER_CONFIG.WEBM_BITRATE;
    const keyFrameInterval = ENCODER_CONFIG.KEYFRAME_INTERVAL[this.videoFormat](fps);
    const quality = ENCODER_CONFIG.QUALITY;

    // 修复时间戳计算
    const frameDuration = 1000000 / fps; // 每帧持续时间（微秒）
    const totalFrames = Math.ceil(fps * duration); // 总帧数
    this.duration = duration;
    this.fps = fps;

    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => this.muxer.addVideoChunk(chunk, meta),
      error: (e) => console.error('VideoEncoder error:', e)
    });

    // 优化视频编码器配置
    const codec = this.videoFormat === 'mp4' ? 'avc1.640033' : 'vp09.00.10.08';
    videoEncoder.configure({
      codec: codec,
      width: this.width,
      height: this.height,
      bitrate: bitrate,
      framerate: this.fps,
      quality: quality,
      latencyMode: 'quality',
    });

    // 在动画初始化阶段预计算
    const cameraPositions = 预计算球面轨迹({
        totalFrames,
        startLon,
        endLon,
        startLat,
        endLat,
        rotations,
        smoothness
    });

    const frameQueue = new FrameQueue(5); // 创建帧队列
    let isRendering = true;

    // 使用新的纯函数替换原来的内联函数
    try {
      await Promise.all([
        renderFrames({
          totalFrames,
          cameraPositions,
          renderer: this.renderer,
          scene: this.scene,
          camera: this.camera,
          width: this.width,
          height: this.height,
          frameQueue,
          progressCallback: this.progressCallback
        }),
        encodeFramesToVideo({
          frameQueue,
          totalFrames,
          frameDuration,
          videoEncoder,
          keyFrameInterval,
          quality
        })
      ]);

      await videoEncoder.flush();
      this.muxer.finalize();
      const buffer = this.muxer.target.buffer;
      const mimeType = this.videoFormat === 'mp4' ? 'video/mp4' : 'video/webm';
      return new Blob([buffer], { type: mimeType });
    } finally {
      isRendering = false;
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
