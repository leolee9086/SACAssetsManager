import * as THREE from '../../../../static/three/three.mjs';
import { flipPixelsYAxis } from './utils/pixels.js';
// 一次性预计算所有帧的相机位置
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
    const smoothFactor = Math.max(0.1, Math.min(smoothness, 0.9));
    const totalRotation = (endLon - startLon) * rotations;
    const latDelta = endLat - startLat;

    for (let frameCounter = 0; frameCounter < totalFrames; frameCounter++) {
        const progress = Math.pow(frameCounter / totalFrames, 1 / (2 - smoothFactor));
        positions.push({
            currentLon: startLon + progress * totalRotation,
            currentLat: startLat + progress * latDelta,
            progress
        });
    }
    return positions; // 返回所有帧的位置数组
};

// 更新后的获取单帧位置方法
export const 获取当前帧位置 = (positions, frameCounter) => {
    return positions[Math.min(frameCounter, positions.length - 1)];
};


// 纯函数方式更新相机位置
export const updateCamera = (camera, { currentLon, currentLat }) => {
    const phi = THREE.MathUtils.degToRad(90 - currentLat);
    const theta = THREE.MathUtils.degToRad(currentLon);
    camera.position.setFromSphericalCoords(1, phi, theta);
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