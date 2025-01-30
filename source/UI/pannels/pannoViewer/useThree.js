import * as THREE from '../../../../static/three/three.mjs';

// 纯函数方式处理相机旋转逻辑
export const calculateCameraPosition = ({
    frameCounter,
    totalFrames,
    startLon,
    endLon,
    startLat,
    endLat,
    rotations,
    smoothness
}) => {
    const totalRotation = (endLon - startLon) * rotations;
    const latDelta = endLat - startLat;
    const smoothFactor = Math.max(0.1, Math.min(smoothness, 0.9));
    const progress = Math.pow(frameCounter / totalFrames, 1 / (2 - smoothFactor));
    
    return {
        currentLon: startLon + progress * totalRotation,
        currentLat: startLat + progress * latDelta,
        progress
    };
};

// 纯函数方式更新相机位置
export const updateCamera = (camera, { currentLon, currentLat }) => {
    const phi = THREE.MathUtils.degToRad(90 - currentLat);
    const theta = THREE.MathUtils.degToRad(currentLon);
    camera.position.setFromSphericalCoords(1, phi, theta);
    camera.lookAt(0, 0, 0);
    return camera;
}; 