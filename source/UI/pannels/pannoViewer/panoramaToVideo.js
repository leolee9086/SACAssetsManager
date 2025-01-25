import * as THREE from '../../../../static/three/three.mjs';

export class PanoramaVideoGenerator {
  constructor(width = 2560, height = 1440) {
    this.width = width;
    this.height = height;
    this.fps = 120;
    this.duration = 12; // 默认12秒
    
    // 优化渲染器设置
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
      alpha: true,
      precision: "highp",
      stencil: false,  // 禁用模板缓冲区以提高性能
      depth: true,     // 启用深度测试
      logarithmicDepthBuffer: true  // 添加对数深度缓冲
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制最大像素比
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;  // 添加电影级色调映射
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputEncoding = THREE.sRGBEncoding;  // 使用sRGB颜色空间
    
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
    // 创建球体几何体
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);
    
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
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
      height = this.height
    } = options;

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

    // 首先检查支持的格式
    const mimeType = [
    //  'video/webm;codecs=h264',

      'video/webm;codecs=vp9',  // 调整优先级顺序
      'video/webm'
    ].find(type => MediaRecorder.isTypeSupported(type));

    if (!mimeType) {
      throw new Error('浏览器不支持任何可用的视频录制格式');
    }

    const stream = this.renderer.domElement.captureStream(fps);
    
    // 优化2：动态调整比特率（保持质量同时降低编码压力）
    const targetBitrate = this.width >= 2560 ? 25000000 : 16000000; // 2K使用25Mbps
    const bitrateFactor = fps > 60 ? 1.2 : 1.0; // 高帧率适当提升比特率
    
    // 优化3：分块录制避免内存压力
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: mimeType,
      videoBitsPerSecond: targetBitrate * bitrateFactor,
      audioBitsPerSecond: 0  // 明确禁用音频
    });

    // 优化4：设置合理的时间分片（100ms）
    this.mediaRecorder.start(100);  // 添加分片参数

    // 优化1：使用更精确的时间控制
    const frameInterval = 1000 / this.fps;
    const totalFrames = this.duration * this.fps;
    let frame = 0;
    let lastRender = performance.now();
    let nextFrameTime = lastRender;
    let frameTimeAccumulator = 0; // 新增帧时间累加器

    const animate = () => {
      const now = performance.now();
      const deltaTime = now - lastRender;
      lastRender = now;
      frameTimeAccumulator += deltaTime;

      // 优化2：基于固定时间步长的更新
      while (frameTimeAccumulator >= frameInterval) {
        frameTimeAccumulator -= frameInterval;
        frame++;

        if (frame >= totalFrames) {
          this.mediaRecorder.stop();
          return;
        }

        // 优化3：使用更平滑的插值函数
        const realProgress = frame / totalFrames;
        const easeProgress = cubicBezier(0.42, 0, 0.58, 1)(realProgress);

        // 优化4：提前计算相机位置
        const lon = startLon + (endLon - startLon) * easeProgress * rotations;
        const lat = startLat + (endLat - startLat) * easeProgress;
        const phi = THREE.MathUtils.degToRad(90 - lat);
        const theta = THREE.MathUtils.degToRad(lon + 90);

        // 优化5：使用缓存的计算结果
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        this.camera.position.set(
          sinPhi * cosTheta,
          cosPhi,
          sinPhi * sinTheta
        );

        this.camera.up.set(0, 1, 0);
        this.camera.lookAt(0, 0, 0);
      }

      // 优化6：使用双缓冲渲染
      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);

      // 优化7：更精确的帧调度
      const targetTime = nextFrameTime - performance.now();
      if (targetTime > 1) {
        setTimeout(() => requestAnimationFrame(animate), targetTime);
      } else {
        requestAnimationFrame(animate);
      }
      nextFrameTime += frameInterval;
    };

    // 优化8：预热渲染器
    this.renderer.render(this.scene, this.camera);
    const startTime = performance.now();
    this.animationRequestId = requestAnimationFrame(animate);

    return new Promise((resolve, reject) => {
      this.chunks = [];
      
      // 添加错误处理
      this.mediaRecorder.onerror = (error) => {
        reject(new Error(`视频录制失败: ${error.message}`));
      };
      
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {  // 确保数据有效
          this.chunks.push(e.data);
        }
      };
      
      this.mediaRecorder.onstop = async () => {
        if (this.chunks.length === 0) {
          reject(new Error('没有收到任何视频数据'));
          return;
        }
        
        try {
          const blob = new Blob(this.chunks, { type: mimeType });
          if (blob.size === 0) {
            reject(new Error('生成的视频文件大小为0'));
            return;
          }
          resolve(blob);
        } catch (error) {
          reject(new Error(`创建视频文件失败: ${error.message}`));
        }
      };
    });
  }

  dispose() {
    // 添加动画循环取消
    if (this.animationRequestId) {
      cancelAnimationFrame(this.animationRequestId);
    }
    this.renderer.dispose();
    this.scene.clear();
  }
}

// 辅助函数：保存视频文件
export function saveVideoBlob(blob, fileName = 'panorama_video.mp4') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


function cubicBezier(x1, y1, x2, y2) {
  return function(t) {
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;
    
    function sampleCurveX(t) {
      return ((ax * t + bx) * t + cx) * t;
    }
    
    function sampleCurveY(t) {
      return ((ay * t + by) * t + cy) * t;
    }
    
    function solveCurveX(x) {
      let t2 = x;
      for (let i = 0; i < 8; i++) {
        const x2 = sampleCurveX(t2) - x;
        if (Math.abs(x2) < 1e-6) return t2;
        const d2 = (3 * ax * t2 + 2 * bx) * t2 + cx;
        if (Math.abs(d2) < 1e-6) break;
        t2 = t2 - x2 / d2;
      }
      return t2;
    }
    
    return sampleCurveY(solveCurveX(t));
  };
} 