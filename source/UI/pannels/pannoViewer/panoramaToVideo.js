import * as THREE from '../../../../static/three/three.mjs';
import { 
    updateCamera,
    预计算球面轨迹,
   // 获取当前帧位置,
    //captureFrame  // 新增导入
} from './useThree.js';
import { createMuxer, ENCODER_CONFIG } from './videoMuxer.js';
import { VideoEncoderManager, updateProgress } from './videoEncoderManager.js';
import { addTextWatermark, addImageWatermark } from './watermarkUtils.js';

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
    },
    // 添加水印默认配置
    WATERMARK: {
        TEXT: {
            ENABLED: false,
            TEXT: '全景视频',
            POSITION: 'bottomRight',
            FONT: '', // 动态计算
            COLOR: 'rgba(255, 255, 255, 0.8)',
            PADDING: 10 // 动态调整
        },
        IMAGE: {
            ENABLED: false,
            POSITION: 'bottomLeft',
            WIDTH: 0.15, // 画布宽度的15%
            HEIGHT: null, // 自动按比例计算
            OPACITY: 0.8,
            PADDING: 10 // 动态调整
        }
    }
};

// 导出这个函数供外部使用
export async function captureFrame(renderer, scene, camera, width, height, flipY = false, watermarkOptions = null) {
  // 创建离屏渲染目标
  const renderTarget = new THREE.WebGLRenderTarget(width, height, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    colorSpace: THREE.SRGBColorSpace  // 修改为colorSpace，保持与预览界面一致
  });
  
  // 设置渲染目标
  renderer.setRenderTarget(renderTarget);
  
  // 执行渲染
  renderer.render(scene, camera);
  
  // 读取像素数据
  const buffer = new Uint8Array(width * height * 4);
  renderer.readRenderTargetPixels(renderTarget, 0, 0, width, height, buffer);
  
  // 创建ImageData对象
  let imageData;
  
  if (flipY) {
    // 如果需要翻转Y轴
    const flippedPixels = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      const srcOffset = y * width * 4;
      const dstOffset = (height - y - 1) * width * 4;
      flippedPixels.set(buffer.subarray(srcOffset, srcOffset + width * 4), dstOffset);
    }
    imageData = new ImageData(
      flippedPixels,
      width,
      height
    );
  } else {
    // 不翻转Y轴
    imageData = new ImageData(
      new Uint8ClampedArray(buffer.buffer),
      width,
      height
    );
  }
  
  // 创建缩略图
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = width;
  canvas.height = height;
  ctx.putImageData(imageData, 0, 0);
  
  // 添加水印
  if (watermarkOptions) {
    // 处理文字水印
    if (watermarkOptions.text && watermarkOptions.text.enabled) {
      addTextWatermark(canvas, {
        text: watermarkOptions.text.text,
        position: watermarkOptions.text.position,
        font: watermarkOptions.text.font || `${Math.max(16, width / 50)}px Arial`,
        color: watermarkOptions.text.color,
        padding: watermarkOptions.text.padding || Math.max(10, width / 100)
      });
    }
    
    // 处理图片水印
    if (watermarkOptions.image && watermarkOptions.image.enabled && watermarkOptions.image.imageObj) {
      addImageWatermark(canvas, {
        image: watermarkOptions.image.imageObj,
        position: watermarkOptions.image.position,
        width: watermarkOptions.image.width,
        height: watermarkOptions.image.height,
        opacity: watermarkOptions.image.opacity,
        padding: watermarkOptions.image.padding || Math.max(10, width / 100)
      });
    }
  }
  
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
    
    // 添加水印配置
    this.watermarkOptions = {
      text: {
        enabled: Constants.WATERMARK.TEXT.ENABLED,
        text: Constants.WATERMARK.TEXT.TEXT,
        position: Constants.WATERMARK.TEXT.POSITION,
        font: Constants.WATERMARK.TEXT.FONT || `${Math.max(16, width / 50)}px Arial`,
        color: Constants.WATERMARK.TEXT.COLOR,
        padding: Constants.WATERMARK.TEXT.PADDING || Math.max(10, width / 100),
        fontWasSetExplicitly: false, // 标记字体是否被明确设置
        paddingWasSetExplicitly: false // 标记内边距是否被明确设置
      },
      image: {
        enabled: Constants.WATERMARK.IMAGE.ENABLED,
        imageObj: null, // 将在setWatermarkImage中设置
        position: Constants.WATERMARK.IMAGE.POSITION,
        width: Constants.WATERMARK.IMAGE.WIDTH,
        height: Constants.WATERMARK.IMAGE.HEIGHT,
        opacity: Constants.WATERMARK.IMAGE.OPACITY,
        padding: Constants.WATERMARK.IMAGE.PADDING || Math.max(10, width / 100),
        paddingWasSetExplicitly: false // 标记内边距是否被明确设置
      }
    };

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

  // 设置文字水印
  setTextWatermark(options) {
    if (!options) {
      this.watermarkOptions.text.enabled = false;
      return;
    }
    
    this.watermarkOptions.text.enabled = true;
    
    // 记录是否明确设置了字体和内边距
    const fontWasProvided = !!options.font;
    const paddingWasProvided = options.padding !== undefined;
    
    // 应用所有选项
    Object.assign(this.watermarkOptions.text, options);
    
    // 设置标志，表示字体是否被明确设置
    this.watermarkOptions.text.fontWasSetExplicitly = fontWasProvided;
    this.watermarkOptions.text.paddingWasSetExplicitly = paddingWasProvided;
    
    // 动态调整字体大小 - 仅在未提供字体时
    if (!fontWasProvided) {
      this.watermarkOptions.text.font = `${Math.max(16, this.width / 50)}px Arial`;
    }
    
    // 动态调整内边距 - 仅在未提供内边距时
    if (!paddingWasProvided) {
      this.watermarkOptions.text.padding = Math.max(10, this.width / 100);
    }
  }
  
  // 设置图片水印
  async setImageWatermark(options) {
    if (!options || !options.imageUrl) {
      this.watermarkOptions.image.enabled = false;
      this.watermarkOptions.image.imageObj = null;
      return;
    }
    
    try {
      // 加载图片
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = options.imageUrl;
      });
      
      this.watermarkOptions.image.enabled = true;
      this.watermarkOptions.image.imageObj = img;
      
      // 记录是否明确设置了内边距
      const paddingWasProvided = options.padding !== undefined;
      
      // 更新其他选项
      if (options.position) this.watermarkOptions.image.position = options.position;
      if (options.width !== undefined) this.watermarkOptions.image.width = options.width;
      if (options.height !== undefined) this.watermarkOptions.image.height = options.height;
      if (options.opacity !== undefined) this.watermarkOptions.image.opacity = options.opacity;
      
      // 设置内边距
      if (paddingWasProvided) {
        this.watermarkOptions.image.padding = options.padding;
      } else {
        this.watermarkOptions.image.padding = Math.max(10, this.width / 100);
      }
      
      // 设置标志，表示内边距是否被明确设置
      this.watermarkOptions.image.paddingWasSetExplicitly = paddingWasProvided;
      
      return true;
    } catch (error) {
      console.error('设置图片水印失败:', error);
      this.watermarkOptions.image.enabled = false;
      this.watermarkOptions.image.imageObj = null;
      return false;
    }
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer(Constants.RENDERER_CONFIG);
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(1); // 固定像素比
    this.renderer.toneMapping = THREE.NoToneMapping; // 修改为NoToneMapping，与预览保持一致
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; // 使用sRGB颜色空间

    // 移除Y轴翻转设置
    // this.renderer.setScissorTest(true);
    // this.renderer.setScissor(0, 0, this.width, this.height);
    // this.renderer.setViewport(0, 0, this.width, this.height);
    // this.renderer.setScissorTest(false);
  }

  async setupScene(texture) {
    // 确保颜色空间设置正确
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      toneMapped: false, // 禁用色调映射，与预览保持一致
      transparent: true,  // 添加透明支持
      opacity: 1,        // 确保完全不透明
      depthWrite: true,  // 确保正确的深度写入
      depthTest: true    // 确保正确的深度测试
    });

    // 创建球体几何体
    const geometry = new THREE.SphereGeometry(
        Constants.SPHERE_CONFIG.RADIUS,
        Constants.SPHERE_CONFIG.WIDTH_SEGMENTS,
        Constants.SPHERE_CONFIG.HEIGHT_SEGMENTS
    );
    geometry.scale(-1, 1, 1); // 确保纹理是内部渲染

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
      format = 'mp4',
      watermarkOptions = null,
      audioConfig = null // 添加音频配置参数
    } = options;

    // 如果有传入水印选项，覆盖现有设置
    if (watermarkOptions) {
      if (watermarkOptions.text) {
        this.setTextWatermark(watermarkOptions.text);
      }
      if (watermarkOptions.image) {
        await this.setImageWatermark(watermarkOptions.image);
      }
    }

    this.videoFormat = format;
    this.updateCameraAndRenderer(width, height);

    const totalFrames = Math.ceil(fps * duration);
    this.duration = duration;
    this.fps = fps;

    const encoderManager = new VideoEncoderManager({
      width: this.width,
      height: this.height,
      fps: this.fps,
      format: this.videoFormat,
      audioConfig: audioConfig // 传递音频配置给VideoEncoderManager
    });
    
    // 传递进度回调
    encoderManager.setProgressCallback(this.progressCallback);

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
        
        // 只有在启用水印时才传入水印选项
        const hasWatermark = 
          (this.watermarkOptions.text && this.watermarkOptions.text.enabled) || 
          (this.watermarkOptions.image && this.watermarkOptions.image.enabled && this.watermarkOptions.image.imageObj);
        
        const frameData = await captureFrame(
          this.renderer,
          this.scene,
          this.camera,
          this.width,
          this.height,
          true, // 修改为true，强制Y轴翻转以修正视频上下颠倒问题
          hasWatermark ? this.watermarkOptions : null
        );

        // 渲染阶段的进度只占总进度的50%
        const renderProgress = frame / totalFrames * 0.5;
        updateProgress({
          frameCounter: Math.floor(renderProgress * totalFrames),
          totalFrames,
          thumbnailDataURL: frameData.thumbnailDataURL,
          progressCallback: this.progressCallback,
          stage: '渲染帧...'
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
