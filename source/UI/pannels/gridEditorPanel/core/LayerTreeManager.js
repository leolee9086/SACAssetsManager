class Layer {
  static #idCounter = 1;
  static #getNextId = () => Layer.#idCounter++;

  constructor({ 
    id = Layer.#getNextId(),
    type = 'canvas',
    parentId = null,
    meta = {},
    state = {}
  } = {}) {
    this.id = id;
    this.children = [];
    this.meta = {
      name: meta.name || `图层 ${id}`,
      type,
      ...meta
    };
    this.state = {
      visible: state.visible ?? true,
      locked: state.locked ?? false,
      opacity: state.opacity ?? 1,
      isGroup: type === 'group',
      parentId,
      depth: state.depth ?? 0,
      ...state
    };
  }

  addChild(child) {
    if (child.state.parentId !== null && child.state.parentId !== this.id) {
      throw new Error(`图层 ${child.id} 已经有父图层 ${child.state.parentId}，无法添加到图层 ${this.id}`);
    }
    this.children.push(child);
    child.state.parentId = this.id;
    child.updateDepth(this.state.depth + 1);
  }

  removeChild(childId) {
    const child = this.children.find(child => child.id === childId);
    if (!child) {
      throw new Error(`图层 ${this.id} 中未找到子图层 ${childId}`);
    }
    if (child.state.parentId !== this.id) {
      throw new Error(`图层 ${childId} 的父图层ID ${child.state.parentId} 与当前图层ID ${this.id} 不匹配`);
    }
    this.children = this.children.filter(child => child.id !== childId);
  }

  updateProperties(properties) {
    const { state = {}, meta = {} } = properties;
    Object.assign(this.state, state);
    Object.assign(this.meta, meta);
  }

  updateDepth(newDepth) {
    this.state.depth = newDepth;
    this.children.forEach(child => child.updateDepth(newDepth + 1));
  }
}

class LayerTree {
  #layers = [];
  #activeLayerId = 1;

  constructor() {
    this.init();
  }

  async init() {
    // 如果已经有图层，不要重新初始化
    if (this.#layers.length > 0) {
      return;
    }

    const root = new Layer({
      id: 1,
      type: 'group',
      meta: { name: '根组' },
      state: { isGroup: true, expanded: true }
    });

    const defaultLayer = new Layer({
      id: 2,
      type: 'canvas',
      parentId: 1,
      meta: { name: '默认图层' },
      state: { depth: 1 }
    });

    root.addChild(defaultLayer);
    this.#layers = [root];
    this.#activeLayerId = 1;
    
    return {
      newLayers: this.#layers,
      newActiveId: this.#activeLayerId
    };
  }

  // 扁平化图层树
  flatten() {
    const result = [];
    
    const flattenHelper = (layers, parentId = null, path = []) => {
      layers.forEach((layer, index) => {
        const currentPath = [...path, index];
        
        // 先添加当前图层
        result.push({
          ...layer,
          state: {
            ...layer.state,
            sortPath: currentPath
          }
        });

        // 如果是组图层，立即处理其子图层
        if (layer.children?.length > 0) {
          flattenHelper(layer.children, layer.id, currentPath);
        }
      });
    };

    flattenHelper(this.#layers);
    
    // 根据路径排序
    result.sort((a, b) => {
      const pathA = a.state.sortPath;
      const pathB = b.state.sortPath;
      
      // 比较每一级的索引
      for (let i = 0; i < Math.min(pathA.length, pathB.length); i++) {
        if (pathA[i] !== pathB[i]) {
          return pathA[i] - pathB[i];
        }
      }
      
      // 如果前面的索引都相同，较短的路径应该排在前面
      return pathA.length - pathB.length;
    });

    // 清理临时排序路径
    result.forEach(layer => delete layer.state.sortPath);
    return result;
  }

  findLayer(id, layers = this.#layers) {
    for (const layer of layers) {
      if (layer.id === id) return layer;
      if (layer.state.isGroup) {
        const found = this.findLayer(id, layer.children);
        if (found) return found;
      }
    }
    return null;
  }

  async addLayer(parentId = null, type = 'canvas') {
    try {
      const newLayer = new Layer({ type, parentId })
      
      if (parentId) {
        // 查找父图层
        const updateLayerTree = (layers) => {
          return layers.map(layer => {
            if (layer.id === parentId) {
              // 如果找到父图层，添加新的子图层
              return {
                ...layer,
                children: [...(layer.children || []), newLayer],
                state: {
                  ...layer.state,
                  isGroup: true,
                  expanded: true
                }
              }
            }
            if (layer.children?.length) {
              return {
                ...layer,
                children: updateLayerTree(layer.children)
              }
            }
            return layer
          })
        }
        
        const newLayers = updateLayerTree(this.#layers)
        this.#layers = newLayers
      } else {
        // 如果没有父图层，添加到根级别
        this.#layers.push(newLayer)
      }
      
      return {
        newLayers: this.#layers,
        newActiveId: newLayer.id
      }
    } catch (error) {
      console.error('添加图层失败:', error)
      throw error
    }
  }

  async removeLayer(layerId) {
    try {
      // 不允删除根图层
      if (layerId === 1) {
        throw new Error('不能删除根图层');
      }

      const newLayers = [...this.#layers];
      let removed = false;

      const removeFromTree = (layers) => {
        for (let i = 0; i < layers.length; i++) {
          const layer = layers[i];
          
          // 如果是要删除的图层
          if (layer.id === layerId) {
            layers.splice(i, 1);
            removed = true;
            return true;
          }
          
          // 递归检查子图层
          if (layer.children?.length) {
            if (removeFromTree(layer.children)) {
              // 如果子图层为空，删除 children 数组
              if (layer.children.length === 0) {
                delete layer.children;
              }
              return true;
            }
          }
        }
        return false;
      };

      removeFromTree(newLayers);

      if (!removed) {
        throw new Error(`未找到ID为 ${layerId} 的图层`);
      }

      // 更新内部状态
      this.#layers = newLayers;

      // 如果删除的是当前活动图层，选择新的活动图层
      if (this.#activeLayerId === layerId) {
        // 默认选择一个图层
        this.#activeLayerId = this.#layers[0]?.id || 0;
      }

      return {
        newLayers: this.#layers,
        newActiveId: this.#activeLayerId
      };
    } catch (error) {
      console.error('删除图层失败:', error);
      throw error;
    }
  }

  async moveLayer(sourceId, targetId, position = 'inside') {
    try {
      // 防止自身移动到自身
      if (sourceId === targetId) {
        return {
          newLayers: [...this.#layers],
          newActiveId: this.#activeLayerId
        };
      }

      // 深度克隆整个图层树以避免引用问题
      const workingLayers = this.deepCloneLayerTree(this.#layers);
      
      // 在克隆后的树中查找相关图层
      const sourceLayer = this.findLayerInTree(sourceId, workingLayers);
      const targetLayer = this.findLayerInTree(targetId, workingLayers);
      
      if (!sourceLayer || !targetLayer) {
        throw new Error(`源图层或目标图层不存在: ${sourceId} -> ${targetId}`);
      }

      // 检查是否试图将图层移动到其子图层中
      if (this.isDescendant(targetId, sourceId, workingLayers)) {
        throw new Error('不能将图层移动到其子图层中');
      }

      // 从原位置移除图层
      const oldParent = sourceLayer.state.parentId 
        ? this.findLayerInTree(sourceLayer.state.parentId, workingLayers) 
        : null;

      if (oldParent) {
        oldParent.children = oldParent.children.filter(child => child.id !== sourceId);
        // 如果父图层没有其他子图层，更新其组状态
        if (oldParent.children.length === 0) {
          oldParent.state.isGroup = false;
        }
      } else {
        workingLayers = workingLayers.filter(l => l.id !== sourceId);
      }

      // 根据不同位置处理图层移动
      switch (position) {
        case 'inside': {
          targetLayer.state.isGroup = true;
          targetLayer.children = targetLayer.children || [];
          targetLayer.state.expanded = true;
          
          sourceLayer.state.parentId = targetLayer.id;
          targetLayer.children.push(sourceLayer);
          
          // 更新整个子树的深度
          this.updateSubtreeDepth(sourceLayer, targetLayer.state.depth + 1);
          break;
        }
        case 'before':
        case 'after': {
          const targetParent = targetLayer.state.parentId 
            ? this.findLayerInTree(targetLayer.state.parentId, workingLayers) 
            : null;
            
          if (targetParent) {
            const targetIndex = targetParent.children.findIndex(child => child.id === targetId);
            const newIndex = position === 'before' ? targetIndex : targetIndex + 1;
            
            sourceLayer.state.parentId = targetLayer.state.parentId;
            targetParent.children.splice(newIndex, 0, sourceLayer);
            this.updateSubtreeDepth(sourceLayer, targetLayer.state.depth);
          } else {
            const targetIndex = workingLayers.findIndex(layer => layer.id === targetId);
            const newIndex = position === 'before' ? targetIndex : targetIndex + 1;
            
            sourceLayer.state.parentId = null;
            workingLayers.splice(newIndex, 0, sourceLayer);
            this.updateSubtreeDepth(sourceLayer, 0);
          }
          break;
        }
      }

      // 验证新的图层树结构
      this.validateLayerTree(workingLayers);

      // 更新内部状态
      this.#layers = workingLayers;

      return {
        newLayers: [...this.#layers],
        newActiveId: this.#activeLayerId
      };
    } catch (error) {
      console.error('移动图层失败:', error);
      throw error;
    }
  }

  // 新增：深度克隆整个图层树
  deepCloneLayerTree(layers) {
    return layers.map(layer => {
      const newLayer = new Layer({
        id: layer.id,
        type: layer.meta.type,
        parentId: layer.state.parentId,
        meta: { ...layer.meta },
        state: { ...layer.state }
      });

      if (layer.children?.length > 0) {
        newLayer.children = this.deepCloneLayerTree(layer.children);
      }

      return newLayer;
    });
  }

  // 新增：在指定树中查找图层
  findLayerInTree(id, layers) {
    for (const layer of layers) {
      if (layer.id === id) return layer;
      if (layer.children?.length) {
        const found = this.findLayerInTree(id, layer.children);
        if (found) return found;
      }
    }
    return null;
  }

  // 新增：更新子树深度
  updateSubtreeDepth(layer, depth) {
    layer.state.depth = depth;
    if (layer.children?.length) {
      layer.children.forEach(child => {
        this.updateSubtreeDepth(child, depth + 1);
      });
    }
  }

  // 新增：检查是否是子孙图层
  isDescendant(childId, parentId, layers) {
    const parent = this.findLayerInTree(parentId, layers);
    if (!parent) return false;
    
    const checkChildren = (layer) => {
      if (layer.id === childId) return true;
      return layer.children?.some(child => checkChildren(child)) || false;
    };
    
    return checkChildren(parent);
  }

  // 新增：深度克隆图层（包括子图层）
  cloneLayer(layer) {
    const clone = new Layer({
      id: layer.id,
      type: layer.meta.type,
      parentId: layer.state.parentId,
      meta: { ...layer.meta },
      state: { ...layer.state }
    });

    if (layer.children?.length > 0) {
      clone.children = layer.children.map(child => this.cloneLayer(child));
    }

    return clone;
  }

  // 添加 getter 方法
  getLayers() {
    return this.#layers;
  }

  getActiveLayerId() {
    return this.#activeLayerId;
  }

  findChildren(layerId, includeDescendants = false) {
    const layer = this.findLayer(layerId);
    if (!layer) return [];
    
    if (!includeDescendants) {
      return layer.children;
    }
    
    // 如果需要包含所有后代
    const descendants = [];
    const collectDescendants = (currentLayer) => {
      descendants.push(currentLayer);
      currentLayer.children.forEach(child => {
        collectDescendants(child);
      });
    };
    
    layer.children.forEach(child => {
      collectDescendants(child);
    });
    
    return descendants;
  }

  validateLayerTree() {
    const validateLayer = (layer, expectedParentId = null, expectedDepth = 0) => {
      // 验证父子关系
      if (layer.state.parentId !== expectedParentId) {
        throw new Error(`图层 ${layer.id} 的父图层ID不正确，期望 ${expectedParentId}，实际 ${layer.state.parentId}`);
      }

      // 验深度
      if (layer.state.depth !== expectedDepth) {
        throw new Error(`图层 ${layer.id} 的深度不正确，期望 ${expectedDepth}，实际 ${layer.state.depth}`);
      }

      // 递归验证子图层
      layer.children.forEach(child => {
        validateLayer(child, layer.id, expectedDepth + 1);
      });
    };

    // 验证所有顶层图层
    this.#layers.forEach(layer => validateLayer(layer));
  }

  async updateLayers(newLayers) {
    try {
      // 验证新的图层结构
      await this.validateLayerTree(newLayers);

      // 更新内部状态
      this.#layers = newLayers;
      
      // 确保 activeLayerId 仍然有效
      const activeLayerExists = this.findLayerById(this.#activeLayerId, newLayers);
      if (!activeLayerExists) {
        // 如果当前活动图层不存在，选择第一个图层
        this.#activeLayerId = newLayers[0]?.id || 0;
      }

      // 返回更新后的状态
      return {
        newLayers: this.#layers,
        newActiveId: this.#activeLayerId
      };
    } catch (error) {
      console.error('更新图层失败:', error);
      throw error;
    }
  }

  // 辅助方法：通过 ID 查找图层
  findLayerById(id, layerList = this.#layers) {
    for (const layer of layerList) {
      if (layer.id === id) return layer;
      if (layer.children?.length) {
        const found = this.findLayerById(id, layer.children);
        if (found) return found;
      }
    }
    return null;
  }

  // 新增：辅助方法，递归更新图层深度
  updateLayerDepth(layer, depth) {
    layer.state.depth = depth;
    if (layer.children?.length) {
      layer.children.forEach(child => {
        this.updateLayerDepth(child, depth + 1);
      });
    }
  }

}

// 导出单例实例
export const layerTreeManager = new LayerTree(); 
