// 添加一个全局计数器用于生成唯一ID
let layerIdCounter = 1;

// 获取新的唯一ID
const getNextLayerId = () => layerIdCounter++;

// 创建初始状态
const createInitialState = (mainCanvas) => {
  if (!mainCanvas) {
    console.error('创建初始状态失败: 主画布不存在');
    return null;
  }

  // 创建默认图层的 offscreenCanvas
  const defaultOffscreenCanvas = document.createElement('canvas');
  defaultOffscreenCanvas.width = mainCanvas.width;
  defaultOffscreenCanvas.height = mainCanvas.height;
  
  // 确保能获取上下文
  const ctx = defaultOffscreenCanvas.getContext('2d');
  if (!ctx) {
    console.error('创建初始状态失败: 无法获取画布上下文');
    return null;
  }
  
  ctx.clearRect(0, 0, defaultOffscreenCanvas.width, defaultOffscreenCanvas.height);

  // 创建初始状态对象
  const initialState = {
    mainCanvas,
    displayCanvases: [mainCanvas],
    layers: [{
      id: 1,
      name: '图层 1',
      visible: true,
      locked: false,
      opacity: 1,
      type: 'canvas',
      offscreenCanvas: defaultOffscreenCanvas,
      isGroup: false,
      parentId: null,
      children: [],
      depth: 0  // 添加深度属性
    }],
    activeLayerId: 1
  };

  // 验证初始状态
  if (!Array.isArray(initialState.layers) || initialState.layers.length === 0) {
    console.error('创建初始状态失败: 图层数组无效');
    return null;
  }

  return initialState;
};

// 添加图层深度计算辅助函数
const calculateLayerDepth = (layers, parentId = null, depth = 0) => {
  return layers.map(layer => {
    const newLayer = { ...layer, depth };
    if (layer.isGroup && Array.isArray(layer.children)) {
      newLayer.children = calculateLayerDepth(layer.children, layer.id, depth + 1);
    }
    return newLayer;
  });
};

// 创建离屏画布的辅助函数
const createOffscreenCanvas = (width, height, mainCanvas) => {
  if (!width || !height) {
    console.error('创建画布失败：无效的尺寸', { width, height });
    return null;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取画布上下文');
    }
    ctx.clearRect(0, 0, width, height);
    return canvas;
  } catch (error) {
    console.error('创建离屏画布失败:', error);
    return null;
  }
};

// 初始化图层画布
const initLayerCanvas = (layer, width, height, state) => {
  const w = width || state.mainCanvas.width;
  const h = height || state.mainCanvas.height;
  
  return {
    ...layer,
    offscreenCanvas: layer.offscreenCanvas 
      ? Object.assign(layer.offscreenCanvas, { width: w, height: h })
      : createOffscreenCanvas(w, h, state.mainCanvas)
  };
};

// 添加新图层
const addLayer = (state, parentId = null, type = 'canvas') => {
  if (!state || !state.mainCanvas) {
    console.error('无效的状态或主画布');
    return state;
  }

  const newId = getNextLayerId();
  const parentLayer = parentId ? findLayerById(parentId, state.layers) : null;
  const depth = parentLayer ? parentLayer.depth + 1 : 0;
  
  // 创建新的离屏画布
  const offscreenCanvas = type === 'canvas' 
    ? createOffscreenCanvas(
        state.mainCanvas.width,
        state.mainCanvas.height,
        state.mainCanvas
      )
    : null;

  if (type === 'canvas' && !offscreenCanvas) {
    console.error('创建图层失败：无法创建离屏画布');
    return state;
  }

  const newLayer = {
    id: newId,
    name: `图层 ${newId}`,
    visible: true,
    locked: false,
    opacity: 1,
    type,
    offscreenCanvas,
    isGroup: false,
    parentId,
    children: [],
    depth
  };

  // 更新状态
  const newState = {
    ...state,
    layers: parentId 
      ? updateLayerInTree(state.layers, parentId, parent => ({
          ...parent,
          children: [...parent.children, newLayer]
        }))
      : [...state.layers, newLayer]
  };

  // 重新计算所有图层深度
  newState.layers = calculateLayerDepth(newState.layers);

  return newState;
};

// 渲染图层
const renderLayers = (state) => {
  if (!state || !Array.isArray(state.layers)) {
    console.error('无效的状态对象或图层列表');
    return state;
  }

  // 确保 displayCanvases 是数组
  if (!Array.isArray(state.displayCanvases)) {
    console.error('显示画布列表无效');
    return state;
  }

  // 渲染到每个显示画布
  state.displayCanvases.forEach(canvas => {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('无法获取画布上下文');
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const renderLayer = (layer) => {
      if (!layer || !layer.visible) return;
      
      if (layer.isGroup && Array.isArray(layer.children)) {
        layer.children.forEach(child => {
          if (child) {
            ctx.globalAlpha = layer.opacity * (child.opacity || 1);
            renderLayer(child);
          }
        });
      } else if (layer.type === 'canvas') {
        if (!layer.offscreenCanvas) {
          console.warn(`图层 ${layer.id} 没有有效的画布，尝试创建新画布`);
          layer.offscreenCanvas = createOffscreenCanvas(
            canvas.width,
            canvas.height,
            canvas
          );
        }
        
        if (layer.offscreenCanvas) {
          ctx.globalAlpha = layer.opacity || 1;
          ctx.drawImage(layer.offscreenCanvas, 0, 0);
        }
      }
    };
    
    state.layers.forEach(layer => {
      if (layer) renderLayer(layer);
    });
  });

  return state;
};

// 添加组
const addGroup = (state) => {
  const newId = getNextLayerId();
  const newGroup = {
    id: newId,
    name: `组 ${newId}`,
    visible: true,
    locked: false,
    opacity: 1,
    isGroup: true,
    parentId: null,
    children: []
  };
  
  return {
    ...state,
    layers: [...state.layers, newGroup]
  };
};

// 获取所有图层 ID
const getAllLayerIds = (layers) => {
  const ids = new Set();
  
  const collectIds = (layers) => {
    if (!Array.isArray(layers)) return;
    layers.forEach(layer => {
      if (layer && typeof layer.id === 'number') {
        ids.add(layer.id);
      }
      if (layer && layer.isGroup && Array.isArray(layer.children)) {
        collectIds(layer.children);
      }
    });
  };
  
  collectIds(layers);
  return Array.from(ids);
};

// 初始化 SVG 图层
const initSvgLayer = (layer, state) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', state.mainCanvas.width);
  svg.setAttribute('height', state.mainCanvas.height);
  svg.style.position = 'absolute';
  svg.style.pointerEvents = 'none';
  layer.svgElement = svg;
  
  state.mainCanvas.parentElement.appendChild(svg);

  return {
    ...state,
    layers: updateLayerInTree(state.layers, layer.id, layer => ({
      ...layer,
      svgElement: svg
    }))
  };
};

// 查找图
const findLayerById = (id, layers) => {
  const find = (layers) => {
    for (const layer of layers) {
      if (layer.id === id) return layer;
      if (layer.isGroup && layer.children.length > 0) {
        const found = find(layer.children);
        if (found) return found;
      }
    }
    return null;
  };
  return find(layers);
};

// 移动图层
const moveLayer = (layerId, newParentId, newIndex, state) => {
  // 获取所有图层ID进行验证
  const allLayerIds = getAllLayerIds(state.layers);
  
  // 验证 layerId 和 newParentId 是否有效
  if (!allLayerIds.includes(layerId)) {
    console.error('无效的图层ID:', layerId);
    return state;
  }
  
  if (newParentId !== null && !allLayerIds.includes(newParentId)) {
    console.error('无效的父图层ID:', newParentId);
    return state;
  }
  
  const layer = findLayerById(layerId, state.layers);
  if (!layer) return state;

  const removeFromParent = (layers, id) => {
    for (let i = 0; i < layers.length; i++) {
      if (layers[i].id === id) {
        return layers.splice(i, 1)[0];
      }
      if (layers[i].isGroup) {
        const removed = removeFromParent(layers[i].children, id);
        if (removed) return removed;
      }
    }
    return null;
  };

  const newState = {
    ...state,
    layers: removeFromParent(state.layers, layerId)
  };

  if (newParentId) {
    const newParent = findLayerById(newParentId, newState.layers);
    if (newParent && newParent.isGroup) {
      newState.layers = updateLayerInTree(newState.layers, newParentId, parent => ({
        ...parent,
        children: [...parent.children, layer]
      }));
      layer.parentId = newParentId;
    }
  } else {
    newState.layers = [...newState.layers, layer];
    layer.parentId = null;
  }

  return renderLayers(newState);
};

// 更新图层属性
const updateLayerProperties = (layerId, properties, state) => {
  // 验证图层ID是否存在
  const allLayerIds = getAllLayerIds(state.layers);
  if (!allLayerIds.includes(layerId)) {
    console.error('尝试更新不存在的图层:', layerId);
    return state;
  }
  
  const layer = findLayerById(layerId, state.layers);
  if (!layer) return state;
  
  // 添加 offscreenCanvas 到允许的属性列表中
  const allowedProps = ['name', 'visible', 'locked', 'opacity', 'offscreenCanvas'];
  
  // 创建新的图层对象
  const newLayer = {
    ...layer,
    ...Object.keys(properties).reduce((acc, key) => {
      if (allowedProps.includes(key)) {
        acc[key] = properties[key];
      }
      return acc;
    }, {})
  };

  // 如果是画布类型但没有 offscreenCanvas，尝试创建一个
  if (newLayer.type === 'canvas' && !newLayer.offscreenCanvas) {
    const canvas = createOffscreenCanvas(
      state.mainCanvas.width,
      state.mainCanvas.height,
      state.mainCanvas
    );
    
    if (canvas) {
      newLayer.offscreenCanvas = canvas;
    } else {
      console.error(`无法为图层 ${layerId} 创建画布`);
    }
  }

  // 更新状态并重新渲染
  const newState = {
    ...state,
    layers: updateLayerInTree(state.layers, layerId, () => newLayer)
  };

  return renderLayers(newState);
};

// 处理尺寸变化
const handleResize = (width, height, state) => {
  const resizeLayer = (layer) => {
    if (layer.type === 'canvas') {
      const newLayer = initLayerCanvas(layer, width, height, state);
      return updateLayerInTree(state.layers, layer.id, layer => newLayer);
    } else if (layer.type === 'svg' && layer.svgElement) {
      const newLayer = {
        ...layer,
        svgElement: Object.assign(layer.svgElement, {
          width: width,
          height: height
        })
      };
      return updateLayerInTree(state.layers, layer.id, layer => newLayer);
    }
    
    if (layer.children) {
      layer.children = layer.children.map(resizeLayer);
    }
    return layer;
  };
  
  const newState = {
    ...state,
    layers: state.layers.map(resizeLayer)
  };

  newState.displayCanvases.forEach(canvas => {
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
    }
  });

  return renderLayers(newState);
};

// 移除图层
const removeLayer = (layerId, state) => {
  // 防御性检查
  if (!state || !Array.isArray(state.layers)) {
    console.error('无效的状态对象或图层列表',state);
    return state;
  }

  // 验证图层ID是否存在
  const allLayerIds = getAllLayerIds(state.layers);
  if (!allLayerIds.includes(layerId)) {
    console.error('尝试删除不存在的图层:', layerId);
    return state;
  }

  // 创建新的图层数组，而不是直接修改原数组
  const newLayers = [...state.layers];
  
  const removeFromParent = (layers, id) => {
    for (let i = 0; i < layers.length; i++) {
      if (layers[i].id === id) {
        const layer = layers[i];
        if (layer.type === 'svg' && layer.svgElement) {
          layer.svgElement.remove();
        }
        if (layer.isGroup && Array.isArray(layer.children)) {
          layer.children.forEach(child => {
            if (child && child.id) {
              removeFromParent(layers, child.id);
            }
          });
        }
        layers.splice(i, 1);
        return true;
      }
      if (layers[i]?.isGroup && Array.isArray(layers[i].children)) {
        if (removeFromParent(layers[i].children, id)) {
          return true;
        }
      }
    }
    return false;
  };

  // 创建新的状态对象
  const newState = {
    ...state,
    layers: newLayers.filter(layer => {
      if (layer.id === layerId) {
        // 如果是要删除的图层，返回 false
        return false;
      }
      return true;
    })
  };

  removeFromParent(newState.layers, layerId);
  return renderLayers(newState);
};

// 添加显示画布
const addDisplayCanvas = (canvas, state) => {
  return {
    ...state,
    displayCanvases: [...state.displayCanvases, canvas]
  };
};

// 移除显示画布
const removeDisplayCanvas = (canvas, state) => {
  const index = state.displayCanvases.indexOf(canvas);
  if (index > -1) {
    return {
      ...state,
      displayCanvases: state.displayCanvases.filter(c => c !== canvas)
    };
  }
  return state;
};

// 获取图层预览
const getLayerPreview = (layerId, state) => {
  const layer = findLayerById(layerId, state.layers);
  if (!layer || layer.isGroup) return null;

  const previewCanvas = createOffscreenCanvas(
    state.mainCanvas.width,
    state.mainCanvas.height
  );
  const ctx = previewCanvas.getContext('2d');

  if (layer.type === 'canvas' && layer.offscreenCanvas) {
    ctx.globalAlpha = layer.opacity;
    ctx.drawImage(layer.offscreenCanvas, 0, 0);
  } else if (layer.type === 'svg' && layer.svgElement) {
    // 对于SVG图层，可以考虑将SVG转换为图像
    const svgData = new XMLSerializer().serializeToString(layer.svgElement);
    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    ctx.drawImage(img, 0, 0);
  }

  return previewCanvas;
};

// 更新树结构
const updateLayerInTree = (layers, id, updateFn) => {
  // 添加防御性检查
  if (!layers || !Array.isArray(layers)) {
    console.warn('无效的图层列表，返回空数组');
    return [];
  }

  if (!id || !updateFn) {
    console.warn('无效的参数，返回原图层列表');
    return layers;
  }

  return layers.map(layer => {
    if (!layer) return layer;  // 跳过空图层

    if (layer.id === id) {
      const updatedLayer = updateFn(layer);
      // 确保更新后的图层保持正确的结构
      return {
        ...layer,
        ...updatedLayer,
        children: Array.isArray(updatedLayer?.children) ? updatedLayer.children : []
      };
    }

    if (layer.isGroup && Array.isArray(layer.children)) {
      return {
        ...layer,
        children: updateLayerInTree(layer.children, id, updateFn)
      };
    }

    return layer;
  });
};

// 在文件末尾添加导出语句
export {
  createInitialState,
  addLayer,
  addGroup,
  moveLayer,
  updateLayerProperties,
  removeLayer,
  renderLayers,
  handleResize,
  addDisplayCanvas,
  removeDisplayCanvas,
  getLayerPreview,
  initLayerCanvas,
  initSvgLayer
} 