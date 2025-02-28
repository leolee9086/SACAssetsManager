import { shouldElementBeVisible } from './index.js';

/**
 * 处理单个元素的可见性
 * 
 * @param {Object} element - 要处理的元素
 * @param {Object} options - 处理选项
 * @param {Object} options.viewState - 当前视图状态
 * @param {Object} options.props - 组件props
 * @param {Object} options.bufferedBounds - 带缓冲的视口边界
 * @param {Set} options.newVisibleElements - 可见元素的ID集合
 * @param {Object} options.layer - Konva图层引用
 * @returns {Object} 更新后的统计信息
 */
export function processElementVisibility(element, options) {
  const { viewState, props, bufferedBounds, newVisibleElements, layer } = options;
  const stats = { ...viewState.elementStats };

  // 跳过系统元素
  if (element.isSystemElement || element.id?.startsWith('system_')) {
    return stats;
  }

  // 增加总元素计数
  stats.total++;

  // 转换为LOD计算所需格式
  const elementForLod = {
    type: element.type,
    config: element
  };

  // 获取元素中心点坐标
  let elementX = element.x || 0;
  let elementY = element.y || 0;

  // 线条元素需要特殊处理，使用点的平均值
  if (element.type === 'line' && element.points && element.points.length >= 4) {
    const points = element.points;
    let sumX = 0, sumY = 0, pointCount = 0;
    for (let i = 0; i < points.length; i += 2) {
      sumX += points[i];
      sumY += points[i + 1];
      pointCount++;
    }
    elementX = sumX / pointCount;
    elementY = sumY / pointCount;
  }

  // 视口剪裁 - 如果元素在可见区域外，直接隐藏
  const isInViewport = (
    elementX >= bufferedBounds.left &&
    elementX <= bufferedBounds.right &&
    elementY >= bufferedBounds.top &&
    elementY <= bufferedBounds.bottom
  );

  // 检查是否应该显示
  let visible = isInViewport; // 首先检查是否在视口内
  let hideReason = isInViewport ? null : 'outOfView';

  if (visible) { // 只有在视口内才进行其他检查
    // 检查手动隐藏
    if (element.visible === false) {
      visible = false;
      hideReason = 'manual';
    }
    // 检查LOD显隐
    else {
      // 获取可见性和透明度信息
      const visibilityResult = shouldElementBeVisible(elementForLod, viewState, props);
      
      if (!visibilityResult.visible) {
        visible = false;

        // 确定隐藏原因
        if (element.lodRange) {
          hideReason = 'lodRange';
        } else {
          // 基于元素屏幕尺寸的LOD
          hideReason = 'lodScale';
        }
      } else {
        // 元素可见，保存透明度信息供后续使用
        visible = true;
        element._lodOpacity = visibilityResult.opacity;
      }
    }
  }

  // 更新元素可见性
  if (visible) {
    newVisibleElements.add(element.id);
    stats.visible++;

    // 更新Konva元素可见性
    const konvaElement = layer?.findOne('#' + element.id);
    if (konvaElement) {
      konvaElement.visible(true);
      // 设置透明度 - 使用LOD计算的透明度值
      if (element._lodOpacity !== undefined) {
        konvaElement.opacity(element._lodOpacity);
      }
    }
  } else {
    stats.hidden++;

    // 记录隐藏原因
    if (hideReason === 'lodRange') {
      stats.hideReasons.lodRange++;
    } else if (hideReason === 'lodScale') {
      stats.hideReasons.lodScale++;
    } else if (hideReason === 'manual') {
      stats.hideReasons.manual++;
    } else {
      stats.hideReasons.other++;
    }

    // 隐藏Konva元素 - 使用查找缓存提高性能
    const konvaElement = layer?.findOne('#' + element.id);
    if (konvaElement) {
      konvaElement.visible(false);
    }
  }

  return stats;
} 