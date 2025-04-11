import * as THREE from '../../../../static/three/three.mjs';
import { flipPixelsYAxis } from './utils/pixels.js';
// 一次性预计算所有帧的相机位置，使用线性插值确保确定性
export const 预计算球面轨迹 = ({
    totalFrames,
    startLon,
    endLon,
    startLat,
    endLat,
    rotations,
    smoothness
}) => {
    const positions = [];
    // 使用简单线性插值替代非线性插值，确保帧的均匀分布
    const totalRotation = (endLon - startLon) * rotations;
    const latDelta = endLat - startLat;

    for (let frameCounter = 0; frameCounter < totalFrames; frameCounter++) {
        // 使用线性插值确保帧间的确定性
        const linearProgress = frameCounter / (totalFrames - 1);
        
        // 对于需要缓入缓出效果的情况，可以使用确定性的三次插值
        // 这里使用三次样条插值替代之前的幂函数计算
        const progress = computeEaseInOutCubic(linearProgress);
        
        positions.push({
            currentLon: startLon + progress * totalRotation,
            currentLat: startLat + progress * latDelta,
            progress: linearProgress // 保存线性进度，便于调试
        });
    }
    
    // 添加调试信息
    console.log('预计算了', positions.length, '个相机位置');
    
    return positions; // 返回所有帧的位置数组
};

// 使用确定性的三次缓动函数替代幂函数
function computeEaseInOutCubic(t) {
    // 标准三次缓入缓出函数：t^2 * (3 - 2t)
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// 更新后的获取单帧位置方法
export const 获取当前帧位置 = (positions, frameCounter) => {
    return positions[Math.min(frameCounter, positions.length - 1)];
};


// 纯函数方式更新相机位置
export const updateCamera = (camera, { currentLon, currentLat }) => {
    const phi = THREE.MathUtils.degToRad(90 - currentLat);
    const theta = THREE.MathUtils.degToRad(currentLon);
    
    // 使用球面坐标定位相机，确保定位的确定性
    const radius = 1; // 固定相机半径为1
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
    
    return camera;
};

// 新增截图处理函数
export async function captureFrame(renderer, scene, camera, width, height) {
  const renderTarget = new THREE.WebGLRenderTarget(width, height, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    stencilBuffer: false,
    colorSpace: THREE.SRGBColorSpace
  });

  try {
    // 渲染到纹理
    renderer.setRenderTarget(renderTarget);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);

    // 读取并处理像素数据
    const pixels = new Uint8Array(width * height * 4);
    renderer.readRenderTargetPixels(renderTarget, 0, 0, width, height, pixels);
    const imageData = flipPixelsYAxis(new Uint8ClampedArray(pixels.buffer), width, height);

    // 生成缩略图
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    const thumbnailCanvas = document.createElement('canvas');
    thumbnailCanvas.width = 320;
    thumbnailCanvas.height = 180;
    thumbnailCanvas.getContext('2d').drawImage(canvas, 0, 0, 320, 180);

    return {
      imageData: canvas,
      thumbnailDataURL: thumbnailCanvas.toDataURL('image/jpeg', 0.8)
    };
  } finally {
    // 确保释放资源
    renderTarget.dispose();
  }
} 