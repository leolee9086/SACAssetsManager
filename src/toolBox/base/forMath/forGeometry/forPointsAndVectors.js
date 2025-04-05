/**
 * 计算两点之间的距离和角度
 * @param {Array} point1 - 第一个点 [x1, y1]
 * @param {Array} point2 - 第二个点 [x2, y2]
 * @returns {Object} 包含距离和角度的对象 {distance, angle}
 */
export function 计算点距离和角度(point1, point2) {
    const dx = point2[0] - point1[0];
    const dy = point2[1] - point1[1];
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    return { distance, angle };
}

/**
 * 按距离采样点序列
 * @param {Array} points - 点序列 [[x1,y1], [x2,y2], ...]
 * @param {Number} distance - 采样间隔距离
 * @returns {Array} 采样后的点序列
 */
export function 按距离采样点序列(points, distance) {
    if (points.length < 2) return points;
    
    const result = [points[0]];
    let accumulatedDistance = 0;
    
    for (let i = 1; i < points.length; i++) {
        const prev = points[i-1];
        const curr = points[i];
        const segmentLength = Math.sqrt(
            Math.pow(curr[0] - prev[0], 2) + 
            Math.pow(curr[1] - prev[1], 2)
        );
        
        if (accumulatedDistance + segmentLength >= distance) {
            const ratio = (distance - accumulatedDistance) / segmentLength;
            const x = prev[0] + ratio * (curr[0] - prev[0]);
            const y = prev[1] + ratio * (curr[1] - prev[1]);
            result.push([x, y]);
            accumulatedDistance = 0;
        } else {
            accumulatedDistance += segmentLength;
        }
    }
    
    return result;
}

import { 向量归一化 } from "./forVectors/forNormalization";
export {向量归一化}