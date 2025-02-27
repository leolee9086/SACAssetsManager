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


/**
 * 计算坐标轴标签的最佳间隔距离
 * 
 * @param {number} scale - 当前画布缩放比例
 * @param {number} minLabelDistancePx - 标签之间的最小像素距离，默认为60
 * @returns {number} 最佳标签间隔（以世界坐标单位）
 */
export const getOptimalLabelSpacing = (scale, minLabelDistancePx = 60) => {
    // 计算当前缩放下多少世界单位对应于最小标签间距
    const worldUnitsPerMinDistance = minLabelDistancePx / scale;
    
    // 扩展可接受的标签间隔值（添加更多极小值以支持极高缩放）
    const niceIntervals = [
      // 极小值支持
      1e-15, 2e-15, 5e-15,
      1e-14, 2e-14, 5e-14,
      1e-13, 2e-13, 5e-13,
      1e-12, 2e-12, 5e-12,
      1e-11, 2e-11, 5e-11,
      1e-10, 2e-10, 5e-10,
      1e-9, 2e-9, 5e-9,
      1e-8, 2e-8, 5e-8,
      1e-7, 2e-7, 5e-7,
      1e-6, 2e-6, 5e-6,
      0.000001, 0.000002, 0.000005, 
      0.00001, 0.00002, 0.00005, 
      0.0001, 0.0002, 0.0005, 
      0.001, 0.002, 0.005, 
      0.01, 0.02, 0.05, 
      0.1, 0.2, 0.5, 
      1, 2, 5, 
      10, 20, 50, 
      100, 200, 500, 
      1000, 2000, 5000, 
      10000, 20000, 50000,
      100000, 200000, 500000,
      1000000, 2000000, 5000000,
      // 超大值支持
      1e7, 2e7, 5e7,
      1e8, 2e8, 5e8,
      1e9, 2e9, 5e9,
      1e10, 2e10, 5e10,
      1e11, 2e11, 5e11,
      1e12, 2e12, 5e12,
      1e13, 2e13, 5e13,
      1e14, 2e14, 5e14
    ];
    
    // 确保至少有一个间隔，如果缩放太小，使用最小值
    if (worldUnitsPerMinDistance <= niceIntervals[0]) {
      console.log("使用最小间隔值:", niceIntervals[0], "当前计算所需:", worldUnitsPerMinDistance);
      return niceIntervals[0];
    }
    
    // 寻找大于等于所需间隔的最小美观值
    let optimalInterval = niceIntervals[niceIntervals.length - 1];
    for (const interval of niceIntervals) {
      if (interval >= worldUnitsPerMinDistance) {
        optimalInterval = interval;
        break;
      }
    }
    
    return optimalInterval;
  };