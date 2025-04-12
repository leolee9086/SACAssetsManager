/**
 * 批量全景导出组件 - 文件处理工具函数
 * 提供文件处理相关的函数
 */
import * as THREE from '../../../../../static/three/three.mjs';

/**
 * 从文件路径生成缩略图
 * @param {string} path - 文件路径
 * @returns {Promise<string>} 缩略图数据URL
 */
export function generateThumbnailFromPath(path) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 160;
      canvas.height = 90;
      
      // 计算裁剪区域以保持比例
      let sourceWidth = img.width;
      let sourceHeight = img.height;
      let sourceX = 0;
      let sourceY = 0;
      
      if (img.width / img.height > 16 / 9) {
        sourceWidth = img.height * (16 / 9);
        sourceX = (img.width - sourceWidth) / 2;
      } else {
        sourceHeight = img.width * (9 / 16);
        sourceY = (img.height - sourceHeight) / 2;
      }
      
      ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, 160, 90);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    
    img.onerror = () => {
      reject(new Error('生成缩略图失败'));
    };
    
    img.src = path;
  });
}

/**
 * 从URL生成缩略图
 * @param {string} url - 图片URL
 * @returns {Promise<string>} 缩略图数据URL
 */
export function generateThumbnailFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // 设置处理函数
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 160;
      canvas.height = 90;
      
      // 计算裁剪区域以保持比例
      let sourceWidth = img.width;
      let sourceHeight = img.height;
      let sourceX = 0;
      let sourceY = 0;
      
      if (img.width / img.height > 16 / 9) {
        sourceWidth = img.height * (16 / 9);
        sourceX = (img.width - sourceWidth) / 2;
      } else {
        sourceHeight = img.width * (9 / 16);
        sourceY = (img.height - sourceHeight) / 2;
      }
      
      ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, 160, 90);
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
      
      // 释放对象URL
      URL.revokeObjectURL(url);
      resolve(thumbnail);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url); // 释放对象URL，即使加载失败
      reject(new Error('生成缩略图失败'));
    };
    
    // 开始加载图像
    img.src = url;
  });
}

/**
 * 从THREE.js纹理加载图像
 * @param {Object} fileInfo - 文件信息对象
 * @returns {Promise<THREE.Texture>} 纹理对象
 */
export function loadImageTexture(fileInfo) {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      
      img.onload = () => {
        const texture = new THREE.Texture(img);
        texture.needsUpdate = true;
        resolve(texture);
      };
      
      img.onerror = () => {
        reject(new Error('无法加载图像'));
      };
      
      // 根据文件信息设置图像源
      if (fileInfo.file) {
        const objectUrl = URL.createObjectURL(fileInfo.file);
        img.src = objectUrl;
      } else if (fileInfo.path) {
        img.src = fileInfo.path;
      } else {
        reject(new Error('无效的文件信息'));
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 显示警告信息框
 * @param {string} message - 警告消息
 */
export function showWarningMessage(message) {
  // 创建提示框
  const warningBox = document.createElement('div');
  warningBox.style.position = 'fixed';
  warningBox.style.top = '20px';
  warningBox.style.left = '50%';
  warningBox.style.transform = 'translateX(-50%)';
  warningBox.style.padding = '15px 20px';
  warningBox.style.backgroundColor = '#fff3cd';
  warningBox.style.color = '#856404';
  warningBox.style.borderRadius = '4px';
  warningBox.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
  warningBox.style.zIndex = '9999';
  warningBox.style.maxWidth = '80%';
  warningBox.style.textAlign = 'center';
  warningBox.textContent = message;
  
  // 添加到文档中
  document.body.appendChild(warningBox);
  
  // 3秒后自动移除
  setTimeout(() => {
    document.body.removeChild(warningBox);
  }, 5000);
} 