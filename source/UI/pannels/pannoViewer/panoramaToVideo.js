import * as THREE from '../../../../static/three/three.mjs';
import { Muxer,ArrayBufferTarget } from '../../../../static/webm-muxer.mjs';

export class PanoramaVideoGenerator {
  constructor(width = 2560, height = 1440) {
    this.width = width;
    this.height = height;
    this.fps = 120; // 降低帧率以提高质量
    this.duration = 1; // 默认12秒

    // 优化渲染器设置
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
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(1); // 固定像素比
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5; // 增加曝光值
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; // 使用sRGB颜色空间

    // 添加Y轴翻转
    this.renderer.setScissorTest(true);
    this.renderer.setScissor(0, 0, width, height);
    this.renderer.setViewport(0, 0, width, height);
    this.renderer.setScissorTest(false);

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

  async startRecording(options = {}) {
    const {
      duration = 12,
      fps = 60, // 降低帧率以提高质量
      startLon = 0,
      endLon = 360,
      startLat = 0,
      endLat = 0,
      rotations = 1,
      smoothness = 0.8,
      width = this.width,
      height = this.height
    } = options;

    // 提高视频质量参数
    const bitrate = 30_000_000; // 提高到20 Mbps
    const keyFrameInterval = fps * 2; // 每2秒一个关键帧
    const quality = 1.0; // 最高质量

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

    // 初始化webm-muxer
    this.muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {
        codec: 'V_VP9',
        width: this.width,
        height: this.height,
        frameRate: this.fps,
        bitrate: bitrate, // 添加比特率设置
        quality: quality // 添加质量设置
      }
    });

    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => this.muxer.addVideoChunk(chunk, meta),
      error: (e) => console.error('VideoEncoder error:', e)
    });

    videoEncoder.configure({
      codec: 'vp09.00.10.08',
      width: this.width,
      height: this.height,
      bitrate: bitrate,
      framerate: this.fps,
      quality: quality,
      latencyMode: 'quality'
    });

    let frameCounter = 0;
    const startTime = performance.now();

    // 添加动画循环取消句柄
    this.animationFrameId = null;

    // 新增录制完成Promise
    const recordingPromise = new Promise((resolve, reject) => {
      const animate = async () => {
        if (frameCounter >= totalFrames) {
          videoEncoder.flush().then(() => {
            this.muxer.finalize();
            const buffer = this.muxer.target.buffer;
            const blob = new Blob([buffer], { type: 'video/webm' });
            resolve(blob);
          });
          return;
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
                codec: 'vp09.00.10.08',
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

        this.animationFrameId = requestAnimationFrame(animate);
      };

      // 启动动画循环
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

  // 生成帧的异步迭代器（带调试日志）
  async *generateFrames(totalFrames) {
    console.log('开始生成帧...');
    const gl = this.renderer.getContext();

    for (let i = 0; i < totalFrames; i++) {
      // 渲染场景
      this.renderer.render(this.scene, this.camera);

      // 确保渲染完成
      await new Promise(resolve => {
        gl.finish(); // 使用WebGL原生方法
        requestAnimationFrame(resolve);
      });

      // 读取像素数据（修复参数顺序）
      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;
      const pixels = new Uint8Array(width * height * 4);

      // 正确读取RGBA数据
      gl.readPixels(
        0, 0,
        width, height,
        gl.RGBA,         // 格式
        gl.UNSIGNED_BYTE, // 类型
        pixels           // 目标数组
      );

      // 验证像素数据
      if (pixels[0] === undefined) {
        throw new Error('读取像素数据失败');
      }
      console.log(`像素数据大小: ${pixels.length} bytes`);

      // 创建离屏Canvas（修复翻转逻辑）
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // 直接写入翻转后的图像
      const imageData = new ImageData(
        new Uint8ClampedArray(pixels),
        width,
        height
      );

      // 垂直翻转
      ctx.translate(0, height);
      ctx.scale(1, -1);
      ctx.putImageData(imageData, 0, 0);

      // 生成ImageBitmap（添加选项）
      const imageBitmap = await createImageBitmap(canvas, {
        premultiplyAlpha: 'none',
        colorSpaceConversion: 'none'
      });

      // 验证图像尺寸
      if (imageBitmap.width !== width || imageBitmap.height !== height) {
        throw new Error(`图像尺寸不符 ${imageBitmap.width}x${imageBitmap.height}`);
      }

      console.log(`生成第${i + 1}帧成功，尺寸: ${imageBitmap.width}x${imageBitmap.height}`);
      yield imageBitmap;
    }
  }

  dispose() {
    // 增强资源清理
    if (this.muxer) {
      this.muxer.dispose();
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.renderer.forceContextLoss();  // 强制释放WebGL资源
    this.renderer.dispose();
    this.scene.clear();
  }
}

// 新增视频保存方法
export async function saveVideoBlob(blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `panorama-video-${Date.now()}.webm`;
  a.click();
  URL.revokeObjectURL(a.href);
}
