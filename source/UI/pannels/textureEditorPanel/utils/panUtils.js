/**
 * 处理画布平移逻辑
 * @param {Object} viewState 视图状态对象
 * @param {Object} pointerPos 当前指针位置
 * @param {Object} options 平移选项
 * @returns {Object} 更新后的位置
 */
export function handlePanMovement(viewState, pointerPos, options = {}) {
  const { constrainPan = false, maxPanDistance = Infinity } = options;
  
  // 计算自上次位置以来的移动距离
  const dx = pointerPos.x - viewState.lastPointerPosition.x;
  const dy = pointerPos.y - viewState.lastPointerPosition.y;
  
  // 应用移动
  let newPositionX = viewState.position.x + dx;
  let newPositionY = viewState.position.y + dy;
  
  // 如果启用了平移约束，检查是否超出最大距离
  if (constrainPan && maxPanDistance !== Infinity) {
    // 计算新位置下原点到屏幕中心的距离
    const screenCenterX = viewState.width / 2;
    const screenCenterY = viewState.height / 2;

    // 原点在屏幕上的新位置
    const newOriginX = newPositionX;
    const newOriginY = newPositionY;
    
    // 计算新距离
    const newDx = newOriginX - screenCenterX;
    const newDy = newOriginY - screenCenterY;
    const newDistance = Math.sqrt(newDx * newDx + newDy * newDy);

    // 只有在距离范围内才应用新位置
    if (newDistance > maxPanDistance) {
      // 计算合法的最大位置
      const ratio = maxPanDistance / newDistance;
      newPositionX = screenCenterX + newDx * ratio;
      newPositionY = screenCenterY + newDy * ratio;
    }
  }
  
  return { x: newPositionX, y: newPositionY };
}

/**
 * 判断是否可以平移
 * @param {Object} viewState 视图状态对象
 * @param {Event} event 鼠标事件
 * @returns {boolean} 是否可以平移
 */
export function canPan(viewState, event) {
  return viewState.isPanning && 
         viewState.lastPointerPosition && 
         !viewState.drawMode;
} 