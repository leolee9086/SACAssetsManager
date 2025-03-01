export const 创建响应式视图状态 = (inputs) => {
    const { canvasProps, reactive } = inputs;
    
    return reactive({
        scale: canvasProps.initialScale,
        position: { ...canvasProps.initialPosition },
        width: 0,
        height: 0,
        isPanning: false,
        lastPointerPosition: null,
        mousePosition: { x: 0, y: 0 },
        mousePointerScreenPosition: null,
        initialized: false,
        elements: [],
        drawingElement: null, // 当前正在绘制的元素
        drawMode: null, // 当前绘制模式：null, 'line', 'circle', 'rect', 'text'等
        selectedElement: null, // 当前选中的元素
        lodLevel: 0, // 当前LOD级别
        visibleElements: new Set(), // 当前可见元素的ID集合
        // 添加FPS相关状态
        fps: 0,
        frameCount: 0,
        lastFpsUpdateTime: 0,
        showFps: true, // 是否显示FPS
        // 添加元素显隐统计
        elementStats: {
            total: 0,        // 总元素数量(不含系统元素)
            visible: 0,      // 可见元素数量
            hidden: 0,       // 隐藏元素数量
            hideReasons: {   // 隐藏原因统计
                lodScale: 0,   // 因LOD缩放级别隐藏
                lodRange: 0,   // 因自定义LOD范围隐藏
                manual: 0,     // 手动隐藏
                other: 0       // 其他原因
            }
        }
    });
}


// 更新元素统计信息 - 函数式单参数模式
export const 更新元素统计信息 = (inputs) => {
    const { viewState, visibleList, enableLod } = inputs;
    
    // 初始化统计信息
    const stats = {
      total: viewState.elements?.length || 0,
      visible: visibleList.length,
      hidden: (viewState.elements?.length || 0) - visibleList.length,
      visibleElementIds: visibleList.map(el => el.id),
      hideReasons: {
        lodScale: 0,
        lodRange: 0,
        manual: 0,
        other: 0
      }
    };
    
    // 计算不可见元素的原因
    (viewState.elements || []).forEach(element => {
      // 跳过系统元素和可见元素
      if (element.isSystemElement || visibleList.some(e => e.id === element.id)) return;
      
      // 确定隐藏原因
      if (element.manuallyHidden === true) {
        stats.hideReasons.manual++;
      } else if (element.lodRange && (
          (element.lodRange.minScale !== undefined && viewState.scale < element.lodRange.minScale) || 
          (element.lodRange.maxScale !== undefined && viewState.scale > element.lodRange.maxScale)
      )) {
        stats.hideReasons.lodRange++;
      } else if (enableLod && element._hiddenByLod) {
        stats.hideReasons.lodScale++;
      } else {
        stats.hideReasons.other++;
      }
    });
    
    // 返回新的统计信息，而不是直接修改viewState
    return stats;
};