import Konva from '../../../../../static/konva.js';

/**
 * 将画布导出为图片
 * @param {Object} options - 导出选项
 * @param {Object} stageRef - Stage引用
 * @param {Object} layerRefs - 图层引用对象，包含backgroundLayer, mainLayer, uiLayer等
 * @param {Object} viewState - 视图状态
 * @returns {String} 导出的图片数据URL
 */
export const exportCanvasAsImage = (options = {}, stageRef, layerRefs, viewState) => {
  const {
    pixelRatio = 2,
    mimeType = 'image/png',
    quality = 1
  } = options;

  if (!stageRef || !stageRef.getNode()) {
    console.error('无法导出：舞台不存在');
    return null;
  }

  try {
    // 计算当前视口可见范围在屏幕上的尺寸
    const visibleWidth = viewState.width;
    const visibleHeight = viewState.height;

    // 创建临时复制的舞台，以避免改变原始舞台的状态
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '-9999px';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);

    // 创建临时舞台
    const tempStage = new Konva.Stage({
      container: tempContainer,
      width: visibleWidth * pixelRatio,
      height: visibleHeight * pixelRatio
    });

    // 创建背景层
    const tempBackgroundLayer = new Konva.Layer();
    tempStage.add(tempBackgroundLayer);

    // 添加白色背景矩形
    const background = new Konva.Rect({
      x: 0,
      y: 0,
      width: visibleWidth * pixelRatio,
      height: visibleHeight * pixelRatio,
      fill: 'white'
    });
    tempBackgroundLayer.add(background);

    // 创建内容层
    const tempContentLayer = new Konva.Layer();
    tempStage.add(tempContentLayer);

    // 复制各层的内容
    const allLayers = [
      layerRefs.backgroundLayer,
      layerRefs.mainLayer,
      layerRefs.uiLayer
    ].filter(layer => layer && layer.getNode());

    for (const layerRef of allLayers) {
      // 复制图层节点
      const originalLayer = layerRef.getNode();
      const children = originalLayer.getChildren();

      for (const child of children) {
        try {
          // 克隆节点
          const clone = child.clone();

          // 坐标转换过程：
          // 1. 从画布坐标转换到世界坐标
          const canvasX = child.x();
          const canvasY = child.y();

          // 2. 从世界坐标转换到屏幕坐标
          const screenX = canvasX * viewState.scale + viewState.position.x;
          const screenY = canvasY * viewState.scale + viewState.position.y;

          // 3. 应用像素比例
          clone.x(screenX * pixelRatio);
          clone.y(screenY * pixelRatio);

          // 4. 调整缩放比例
          clone.scaleX(child.scaleX() * viewState.scale * pixelRatio);
          clone.scaleY(child.scaleY() * viewState.scale * pixelRatio);

          // 5. 如果是线条，需要特别处理线宽
          if (clone.getClassName() === 'Line') {
            clone.strokeWidth((child.strokeWidth() / viewState.scale) * pixelRatio);
          }

          tempContentLayer.add(clone);
        } catch (cloneError) {
          console.warn('克隆节点时出错:', cloneError);
        }
      }
    }

    // 绘制舞台
    tempStage.draw();

    // 使用toDataURL获取图像数据
    const dataURL = tempStage.toDataURL({
      mimeType,
      quality,
      pixelRatio: 1 // 已经应用了pixelRatio，不需要重复应用
    });

    // 清理临时元素
    tempStage.destroy();
    document.body.removeChild(tempContainer);

    return dataURL;
  } catch (error) {
    console.error('导出图片时出错:', error);
    return null;
  }
};

/**
 * 导出选定区域为图片
 * @param {Object} area - 要导出的区域信息
 * @param {Object} options - 导出选项
 * @param {Object} stageRef - Stage引用
 * @param {Object} layerRefs - 图层引用对象
 * @param {Object} viewState - 视图状态
 * @returns {String} 导出的图片数据URL
 */
export const exportSelectedArea = (area, options = {}, stageRef, layerRefs, viewState) => {
  return exportCanvasAsImage({
    x: area.x,
    y: area.y,
    width: area.width,
    height: area.height,
    ...options
  }, stageRef, layerRefs, viewState);
}; 