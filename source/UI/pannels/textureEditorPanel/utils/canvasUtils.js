import { buildGrid } from "./gridUtils/index.js";
import { getLODGridSize, getLODLevel } from "./LODUtils/index.js";
import { getOptimalLabelSpacing } from "./labelUtils/index.js";
export {
  buildGrid,
  getLODGridSize,
  getLODLevel,
  getOptimalLabelSpacing
}
/**
 * 计算当前视口在世界坐标系中的边界
 * @param {Object} viewState - 包含位置、缩放和尺寸信息的视图状态
 * @returns {Object} 视口边界，包含left, right, top, bottom, width, height属性
 */
export const getViewportBounds = (viewState) => {
  // 计算视口左上角和右下角的世界坐标
  const topLeft = {
    x: -viewState.position.x / viewState.scale,
    y: -viewState.position.y / viewState.scale
  };

  const bottomRight = {
    x: (viewState.width - viewState.position.x) / viewState.scale,
    y: (viewState.height - viewState.position.y) / viewState.scale
  };

  // 返回视口边界，增加20%的余量确保覆盖整个视口
  const width = bottomRight.x - topLeft.x;
  const height = bottomRight.y - topLeft.y;

  return {
    left: topLeft.x - width * 0.2,
    right: bottomRight.x + width * 0.2,
    top: topLeft.y - height * 0.2,
    bottom: bottomRight.y + height * 0.2,
    width: width * 1.4, // 增加40%宽度
    height: height * 1.4 // 增加40%高度
  };
};


