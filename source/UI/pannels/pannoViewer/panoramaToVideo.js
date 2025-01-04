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
      'video/webm;codecs=h264',
      'video/webm;codecs=vp9',
      'video/webm'
    ].find(type => MediaRecorder.isTypeSupported(type));

    if (!mimeType) {
      throw new Error('浏览器不支持任何可用的视频录制格式');
    }

    const stream = this.renderer.domElement.captureStream(fps);
    
    // 修改 MediaRecorder 配置
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: mimeType,
      videoBitsPerSecond: 16000000  // 增加到16Mbps以适应2K分辨率
    });

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

      // 开始录制
      this.mediaRecorder.start();

      // 动画循环
      let frame = 0;
      const totalFrames = duration * fps;
      
      const animate = () => {
        if (frame >= totalFrames) {
          this.mediaRecorder.stop();
          return;
        }
    
        // 增加子帧数量以获得更好的运动模糊效果
        const subFrames = 16; // 从8增加到16，获得更平滑的运动
        for (let i = 0; i < subFrames; i++) {
          const subProgress = (frame + i / subFrames) / totalFrames;
          // 使用更平滑的缓动函数
          const easeProgress = cubicBezier(0.4, 0, 0.2, 1)(smoothness * subProgress + (1 - smoothness) * subProgress);
          
          // 计算当前经度和纬度
          const lon = startLon + (endLon - startLon) * easeProgress * rotations;
          const lat = startLat + (endLat - startLat) * easeProgress;
    
          // 更新相机位置
          const phi = THREE.MathUtils.degToRad(90 - lat);
          const theta = THREE.MathUtils.degToRad(lon);
          
          const x = 500 * Math.sin(phi) * Math.cos(theta);
          const y = 500 * Math.cos(phi);
          const z = 500 * Math.sin(phi) * Math.sin(theta);
          
          this.camera.lookAt(x, y, z);
          
          // 在渲染前强制进行垃圾回收
          if (frame % 60 === 0) {
            this.renderer.info.reset();
          }
          
          // 使用更高质量的渲染
          this.renderer.setPixelRatio(window.devicePixelRatio); // 临时使用最高像素比
          this.renderer.render(this.scene, this.camera);
          this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 恢复正常像素比
        }
    
        frame++;
        requestAnimationFrame(animate);
      };
      animate();
    });
  }

  dispose() {
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