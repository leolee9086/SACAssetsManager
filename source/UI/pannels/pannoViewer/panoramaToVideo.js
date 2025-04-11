import * as THREE from '../../../../static/three/three.mjs';
import { 
    updateCamera,
    预计算球面轨迹,
   // 获取当前帧位置,
    //captureFrame  // 新增导入
} from './useThree.js';
import { createMuxer, ENCODER_CONFIG } from './videoMuxer.js';
import { VideoEncoderManager } from './videoEncoderManager.js';
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
function $updateProgress({
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

// 导出这个函数供外部使用
export async function captureFrame(renderer, scene, camera, width, height) {
  // 创建离屏渲染目标
  const renderTarget = new THREE.WebGLRenderTarget(width, height, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    encoding: THREE.sRGBEncoding
  });
  
  // 设置渲染目标
  renderer.setRenderTarget(renderTarget);
  
  // 执行渲染
  renderer.render(scene, camera);
  
  // 读取像素数据
  const buffer = new Uint8Array(width * height * 4);
  renderer.readRenderTargetPixels(renderTarget, 0, 0, width, height, buffer);
  
  // 创建ImageData对象
  const imageData = new ImageData(
    new Uint8ClampedArray(buffer.buffer),
    width,
    height
  );
  
  // 创建缩略图
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = width;
  canvas.height = height;
  ctx.putImageData(imageData, 0, 0);
  
  // 生成缩略图数据URL (压缩比例较高以节省内存)
  const thumbnailCanvas = document.createElement('canvas');
  const thumbCtx = thumbnailCanvas.getContext('2d');
  thumbnailCanvas.width = 160;
  thumbnailCanvas.height = 90;
  thumbCtx.drawImage(canvas, 0, 0, width, height, 0, 0, 160, 90);
  const thumbnailDataURL = thumbnailCanvas.toDataURL('image/jpeg', 0.6);
  
  // 清理资源
  renderer.setRenderTarget(null);
  renderTarget.dispose();
  
  return {
    imageData: canvas,
    thumbnailDataURL
  };
}

// 更新进度回调函数
export function updateProgress({ frameCounter, totalFrames, thumbnailDataURL, progressCallback }) {
  if (!progressCallback) return;
  
  // 计算当前进度
  const progress = frameCounter / (totalFrames - 1);
  
  // 确定当前阶段
  let stage = '渲染中...';
  if (frameCounter === 0) stage = '初始化中...';
  if (frameCounter >= totalFrames - 1) stage = '编码完成';
  
  // 调用进度回调
  progressCallback({
    progress,
    currentFrame: frameCounter + 1,
    totalFrames,
    stage,
    frameImage: thumbnailDataURL
  });
}

// 获取当前帧位置的纯函数
export function 获取当前帧位置(cameraPositions, frameIndex) {
  return cameraPositions[frameIndex] || cameraPositions[cameraPositions.length - 1];
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
