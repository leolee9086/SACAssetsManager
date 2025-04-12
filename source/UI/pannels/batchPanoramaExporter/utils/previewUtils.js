/**
 * 批量全景导出组件 - 预览生成工具函数
 */
import * as THREE from '../../../../../static/three/three.mjs';
import { 
  addWatermarkToCanvas 
} from './watermarkUtils.js';
import { 
  loadImageTexture,
  showWarningMessage 
} from './fileUtils.js';

// 缓存已生成的底图 - 避免重复生成
const baseImageCache = new Map();

/**
 * 生成水印预览
 * @param {Object} profile - 配置对象
 * @param {Array} selectedFiles - 选择的文件列表
 * @param {boolean} forceRegenerate - 是否强制重新生成底图
 * @returns {Promise<void>}
 */
export async function generateWatermarkPreview(profile, selectedFiles, forceRegenerate = false) {
  if (!selectedFiles.length) return;
  
  try {
    // 重置预览错误信息
    profile.previewError = null;
    
    // 根据方向调整预览尺寸，保持正确的宽高比
    let previewWidth, previewHeight;
    
    if (profile.isLandscape) {
      // 横屏模式 16:9
      previewWidth = 640;
      previewHeight = 360; // 16:9 比例
    } else {
      // 竖屏模式 9:16
      previewWidth = 360;
      previewHeight = 640; // 9:16 比例
    }
    
    // 计算预览与实际导出的缩放比例
    // 获取实际导出分辨率宽度
    let exportWidth;
    switch(profile.resolution) {
      case '4k':
        exportWidth = profile.isLandscape ? 3840 : 2160;
        break;
      case '2k':
        exportWidth = profile.isLandscape ? 2560 : 1440;
        break;
      default: // 1080p
        exportWidth = profile.isLandscape ? 1920 : 1080;
    }
    
    // 计算缩放比例 (预览宽度/导出宽度)
    const scaleRatio = previewWidth / exportWidth;
    
    // 创建一个临时的Canvas元素用于渲染最终结果
    const canvas = document.createElement('canvas');
    canvas.width = previewWidth;
    canvas.height = previewHeight;
    const ctx = canvas.getContext('2d');

    // 生成或获取缓存的底图
    let baseImage;
    
    // 生成缓存键 - 使用文件路径+宽高比+分辨率作为键，确保在这些改变时重新生成
    const filePath = selectedFiles[0].path || selectedFiles[0].name;
    const cacheKey = `${filePath}_${profile.isLandscape ? 'landscape' : 'portrait'}_${profile.resolution}`;
    
    // 仅当需要时才重新生成底图 (初次生成、布局变化或强制重新生成)
    if (forceRegenerate || !baseImageCache.has(cacheKey)) {
      console.log('生成新的预览底图', cacheKey);
      
      // 加载图像 - 仅在需要生成底图时加载
      const texture = await loadImageTexture(selectedFiles[0]);
      if (!texture) {
        showWarningMessage('无法加载图像进行预览');
        return;
      }
      
      // 创建一个临时的渲染容器
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      document.body.appendChild(container);
      
      // 创建一个新的预览生成器
      const generator = createPreviewGenerator(previewWidth, previewHeight);
      
      // 使用try-finally确保资源清理
      try {
        // 设置场景
        await setupPreviewScene(generator, texture);
        
        // 渲染一帧 - 不带水印的基础全景图
        generator.renderer.domElement.style.width = `${previewWidth}px`;
        generator.renderer.domElement.style.height = `${previewHeight}px`;
        container.appendChild(generator.renderer.domElement);
        
        // 设置相机位置
        generator.camera.position.set(0, 0, 0);
        generator.camera.rotation.set(0, 0, 0);
        generator.camera.rotateY(THREE.MathUtils.degToRad(0)); // 初始经度
        generator.camera.rotateX(THREE.MathUtils.degToRad(0)); // 初始纬度
        
        // 渲染 - 生成基础底图
        generator.renderer.render(generator.scene, generator.camera);
        
        // 创建基础图缓存
        const baseCanvas = document.createElement('canvas');
        baseCanvas.width = previewWidth;
        baseCanvas.height = previewHeight;
        const baseCtx = baseCanvas.getContext('2d');
        baseCtx.drawImage(generator.renderer.domElement, 0, 0);
        
        // 缓存生成的底图
        baseImage = baseCanvas;
        baseImageCache.set(cacheKey, baseCanvas);
        
        console.log('底图已生成并缓存', cacheKey);
      } finally {
        // 清理资源
        try {
          if (generator.renderer) {
            if (generator.renderer.domElement && generator.renderer.domElement.parentNode) {
              generator.renderer.domElement.parentNode.removeChild(generator.renderer.domElement);
            }
            generator.renderer.dispose();
          }
          if (container && container.parentNode) {
            container.parentNode.removeChild(container);
          }
        } catch (cleanupError) {
          console.warn('清理预览资源时出错:', cleanupError);
        }
      }
    } else {
      // 使用缓存的底图
      baseImage = baseImageCache.get(cacheKey);
      console.log('使用缓存的底图', cacheKey);
    }
    
    // 绘制底图到最终结果画布
    ctx.drawImage(baseImage, 0, 0);
    
    // 应用水印 - 这部分每次都需要重新生成
    if (profile.watermark.text.enabled) {
      // 添加文字水印
      addWatermarkToCanvas(canvas, profile, exportWidth, scaleRatio);
    }
    
    // 如果有图片水印，也需要添加
    if (profile.watermark.image.enabled && profile.watermark.image.preview) {
      try {
        const imgElement = await loadImageElement(profile.watermark.image.preview);
        addImageWatermarkToCanvas(canvas, profile, imgElement, scaleRatio);
      } catch (error) {
        console.error('添加图片水印失败:', error);
      }
    }
    
    // 将Canvas转换为数据URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    profile.previewImage = dataUrl;
  } catch (error) {
    console.error('渲染预览失败:', error);
    profile.previewError = error.message;
    showWarningMessage(`生成预览失败: ${error.message}`);
  }
}

/**
 * 添加图片水印到画布
 * @param {HTMLCanvasElement} canvas - 画布元素
 * @param {Object} profile - 配置对象 
 * @param {HTMLImageElement} imgElement - 图片元素
 * @param {number} scaleRatio - 缩放比例
 */
function addImageWatermarkToCanvas(canvas, profile, imgElement, scaleRatio) {
  const ctx = canvas.getContext('2d');
  if (!ctx || !imgElement) return;
  
  const { position, size, opacity } = profile.watermark.image;
  
  // 计算水印尺寸 - 水印宽度为画布宽度的百分比
  const watermarkWidth = canvas.width * size;
  
  // 保持图片原始宽高比
  const aspectRatio = imgElement.width / imgElement.height;
  const watermarkHeight = watermarkWidth / aspectRatio;
  
  // 计算水印位置
  const padding = Math.max(10 * scaleRatio, 20);
  let x, y;
  
  switch (position) {
    case 'topLeft':
      x = padding;
      y = padding;
      break;
    case 'topRight':
      x = canvas.width - watermarkWidth - padding;
      y = padding;
      break;
    case 'bottomLeft':
      x = padding;
      y = canvas.height - watermarkHeight - padding;
      break;
    case 'bottomRight':
      x = canvas.width - watermarkWidth - padding;
      y = canvas.height - watermarkHeight - padding;
      break;
    case 'center':
      x = (canvas.width - watermarkWidth) / 2;
      y = (canvas.height - watermarkHeight) / 2;
      break;
    default:
      x = padding;
      y = canvas.height - watermarkHeight - padding;
  }
  
  // 保存当前上下文状态
  ctx.save();
  
  // 设置全局透明度
  ctx.globalAlpha = opacity;
  
  // 绘制图片
  ctx.drawImage(imgElement, x, y, watermarkWidth, watermarkHeight);
  
  // 恢复上下文状态
  ctx.restore();
}

/**
 * 清除预览缓存 
 * 当文件列表变化或强制刷新时调用
 */
export function clearPreviewCache() {
  console.log('清除预览底图缓存');
  baseImageCache.clear();
}

/**
 * 创建预览生成器实例
 * @param {number} width - 预览宽度
 * @param {number} height - 预览高度
 * @returns {Object} 生成器实例
 */
function createPreviewGenerator(width, height) {
  // 创建渲染器 - 参照旧版实现修复过曝问题
  const renderer = new THREE.WebGLRenderer({
    antialias: true, 
    preserveDrawingBuffer: true,
    alpha: true
  });
  
  // 设置渲染器属性
  renderer.setSize(width, height);
  
  // 修复过曝问题 - 根据旧版实现更新配置
  renderer.outputColorSpace = THREE.SRGBColorSpace; // 更新为现代Three.js API
  renderer.toneMapping = THREE.NoToneMapping; // 禁用色调映射以修复过曝
  
  // 创建场景
  const scene = new THREE.Scene();
  scene.background = null; // 透明背景
  
  // 创建相机
  const camera = new THREE.PerspectiveCamera(75, width / height, 1, 1000);
  
  return {
    renderer,
    scene,
    camera,
    width,
    height,
    textWatermark: null,
    imageWatermark: null
  };
}

/**
 * 设置预览场景
 * @param {Object} generator - 生成器实例 
 * @param {THREE.Texture} texture - 预览用的纹理
 * @returns {Promise<void>}
 */
async function setupPreviewScene(generator, texture) {
  // 设置纹理编码，修复过曝问题
  texture.colorSpace = THREE.SRGBColorSpace; // 更新为现代Three.js API
  texture.needsUpdate = true;
  
  // 创建一个球形几何体用于全景图
  const geometry = new THREE.SphereGeometry(500, 60, 40);
  
  // 创建材质，修复过曝问题
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide, // 将面朝内，以便从内部观看
    toneMapped: false, // 关闭色调映射，解决过曝问题
    transparent: true, // 增加透明度支持
    opacity: 1 // 确保完全不透明
  });
  
  // 创建网格并添加到场景
  const mesh = new THREE.Mesh(geometry, material);
  generator.scene.add(mesh);
}

/**
 * 加载图片元素
 * @param {string} url - 图片URL
 * @returns {Promise<HTMLImageElement>} 图片元素
 */
function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = err => reject(new Error('图片加载失败'));
    img.src = url;
  });
} 