import * as THREE from '../../../../static/three/three.mjs';
import { Muxer,ArrayBufferTarget } from '../../../../static/webm-muxer.mjs';
import { Muxer as MP4Muxer, ArrayBufferTarget as MP4ArrayBufferTarget } from '../../../../static/mp4-muxer.mjs';
export class PanoramaVideoGenerator {
  constructor(width = 2560, height = 1440) {
    this.width = width;
    this.height = height;
    this.fps = 120; // 降低帧率以提高质量
    this.duration = 1; // 默认12秒
    this.videoFormat = 'webm'; // 新增视频格式选项
    this.progressCallback = null; // 新增进度回调函数

    this.initRenderer();

    // 初始化场景和相机
    this.scene = new THREE.Scene();
    const aspect = width / height;
    const isPortrait = height > width;
    // 竖屏模式下使用更大的 FOV 以显示更多内容
    const fov = isPortrait ? 90 : 75;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 1, 1000);

    // 创建MediaRecorder
    this.mediaRecorder = null;
    this.chunks = [];
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
      alpha: true,
      precision: "highp",
      stencil: false,  // 禁用模板缓冲区以提高性能
      depth: true,     // 启用深度测试
      logarithmicDepthBuffer: true,  // 添加对数深度缓冲
      antialias: true, // 启用多重采样抗锯齿
      samples: 8 // 提高多重采样
    });
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
    const geometry = new THREE.SphereGeometry(500, 120, 80); // 增加细分
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
    
    // 将编码器初始化逻辑提取到新方法
    await this.initVideoEncoder(fps);

    // 优化MP4编码参数
    const bitrate = this.videoFormat === 'mp4' ? 50_000_000 : 30_000_000; // MP4使用更高比特率
    const keyFrameInterval = this.videoFormat === 'mp4' ? fps : fps * 2; // MP4每1秒一个关键帧
    const quality = 1.0;

    // 修复时间戳计算
    const frameDuration = 1000000 / fps; // 每帧持续时间（微秒）
    const totalFrames = Math.ceil(fps * duration); // 总帧数
    let currentTimestamp = 0; // 从0开始的时间戳

    // 新增相机动画参数计算
    const totalRotation = (endLon - startLon) * rotations;
    const latDelta = endLat - startLat;
    const smoothFactor = Math.max(0.1, Math.min(smoothness, 0.9)); // 限制平滑系数范围

    // 更新渲染器和相机尺寸
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height);

    // 根据新的宽高比更新相机参数
    const aspect = width / height;
    const isPortrait = height > width;
    this.camera.fov = isPortrait ? 90 : 75; // 竖屏使用更大的 FOV
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

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
      avc: {
        format: 'annexb',
        level: '5.2',
        // 添加优化参数
        profile: 'high',           // 使用High Profile
        chromaFormat: '420',       // 使用4:2:0色度采样
        bitDepth: 8,               // 8位色深
        entropyCoding: 'cabac'     // 使用CABAC熵编码
      }
    });

    let frameCounter = 0;

    // 新增进度计算
    const calculateProgress = () => {
      return Math.min(1, frameCounter / totalFrames);
    };

    // 添加动画循环取消句柄
    this.animationFrameId = null;

    // 新增录制完成Promise
    const recordingPromise = new Promise((resolve, reject) => {
      const animate = async () => {
        if (frameCounter >= totalFrames) {
          videoEncoder.flush().then(() => {
            this.muxer.finalize();
            const buffer = this.muxer.target.buffer;
            const mimeType = this.videoFormat === 'mp4' ? 'video/mp4' : 'video/webm';
            const blob = new Blob([buffer], { type: mimeType });
            resolve(blob);
          });
          return;
        }

        // 渲染当前帧
        this.renderer.render(this.scene, this.camera);

        // 获取当前帧图像
        const currentCanvas = this.renderer.domElement;
        const frameImage = currentCanvas.toDataURL('image/jpeg', 0.8);

        // 更新阶段信息
        let stage = '渲染中...';
        if (frameCounter === 0) stage = '初始化中...';
        if (frameCounter >= totalFrames - 1) stage = '编码中...';

        // 调用进度回调
        if (this.progressCallback) {
          const progress = calculateProgress();
          this.progressCallback({
            progress,
            currentFrame: frameCounter,
            totalFrames,
            stage,
            frameImage
          });
        }

        // 修复时间戳计算（使用累积时间戳）
        currentTimestamp += frameDuration;

        // 新增相机旋转逻辑（使用缓动函数实现平滑移动）
        const progress = Math.pow(frameCounter / totalFrames, 1 / (2 - smoothFactor));
        const currentLon = startLon + progress * totalRotation;
        const currentLat = startLat + progress * latDelta;

        // 将球面坐标转换为三维向量
        const phi = THREE.MathUtils.degToRad(90 - currentLat);
        const theta = THREE.MathUtils.degToRad(currentLon);
        this.camera.position.setFromSphericalCoords(1, phi, theta);
        this.camera.lookAt(0, 0, 0);

        // 创建新的渲染目标
        const renderTarget = new THREE.WebGLRenderTarget(this.width, this.height, {
          format: THREE.RGBAFormat,
          type: THREE.UnsignedByteType,
          stencilBuffer: false,
          colorSpace: THREE.SRGBColorSpace // 确保渲染目标使用 sRGB 颜色空间
        });

        // 修改渲染到纹理的逻辑，添加Y轴翻转
        this.renderer.setRenderTarget(renderTarget);
        this.renderer.clear();
        this.renderer.render(this.scene, this.camera);
        this.renderer.setRenderTarget(null);

        // 修改读取像素数据的逻辑，添加Y轴翻转
        const pixels = new Uint8Array(this.width * this.height * 4);
        this.renderer.readRenderTargetPixels(
          renderTarget,
          0,
          0,
          this.width,
          this.height,
          pixels
        );

        // 创建ImageData时直接翻转Y轴
        const flippedPixels = new Uint8ClampedArray(this.width * this.height * 4);
        for (let y = 0; y < this.height; y++) {
          const srcOffset = y * this.width * 4;
          const dstOffset = (this.height - y - 1) * this.width * 4;
          flippedPixels.set(pixels.subarray(srcOffset, srcOffset + this.width * 4), dstOffset);
        }

        const imageData = new ImageData(
          flippedPixels,
          this.width,
          this.height
        );

        // 创建离屏Canvas
        const canvas = new OffscreenCanvas(this.width, this.height);
        const ctx = canvas.getContext('2d');
        ctx.putImageData(imageData, 0, 0);

        // 计算时间戳（第一帧为0）
        const timestamp = frameCounter * frameDuration;

        // 创建VideoFrame
        const frame = new VideoFrame(canvas, {
          timestamp: timestamp,
          duration: frameDuration,
          colorSpace: 'srgb' // 确保 VideoFrame 使用 sRGB 颜色空间
        });

        // 配置VideoEncoder以允许非零时间戳
        if (frameCounter === 0) {
            videoEncoder.configure({
                codec: codec,
                width: this.width,
                height: this.height,
                bitrate: bitrate, // 使用更高的比特率
                framerate: this.fps,
                quality: quality, // 添加质量参数
                latencyMode: 'quality' // 优先考虑质量
            });
        }

        // 编码帧时使用更高质量设置
        videoEncoder.encode(frame, {
            keyFrame: frameCounter % keyFrameInterval === 0,
            quality: quality
        });
        frame.close();

        // 释放渲染目标
        renderTarget.dispose();

        frameCounter++;

        // 使用setTimeout以最快速度继续下一帧
        setTimeout(animate, 0);
      };

      // 立即开始动画循环
      animate();
    });

    // 启动前重置相机位置
    this.camera.position.set(0, 0, 0);
    this.camera.lookAt(0, 0, -1);

    // 等待录制完成
    await recordingPromise;

    // 返回生成的视频Blob
    const finalBlob = await recordingPromise;
    console.log(finalBlob);
    return finalBlob;
  }

  // 新增方法：初始化视频编码器
  async initVideoEncoder(fps) {
    const bitrate = this.videoFormat === 'mp4' ? 50_000_000 : 30_000_000;
    const keyFrameInterval = this.videoFormat === 'mp4' ? fps : fps * 2;
    const quality = 1.0;

    if (this.videoFormat === 'mp4') {
      this.muxer = new MP4Muxer({
        target: new MP4ArrayBufferTarget(),
        fastStart: 'in-memory',
        video: {
          codec: 'avc',
          width: this.width,
          height: this.height,
          frameRate: this.fps,
          bitrate: bitrate,
          quality: quality,
          gopSize: keyFrameInterval,
          temporalLayerCount: 1,
          bitrateMode: 'vbr',
          hardwareAcceleration: 'prefer-software'
        }
      });
    } else {
      this.muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: {
          codec: 'V_VP9',
          width: this.width,
          height: this.height,
          frameRate: this.fps,
          bitrate: bitrate,
          quality: quality
        }
      });
    }
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
