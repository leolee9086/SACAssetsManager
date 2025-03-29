/**
 * 高级文本选择处理模块
 * 提供精确的文本选择能力，支持多选、块选择等高级功能
 */

/**
 * 选择类型枚举
 * @enum {string}
 */
export const SelectionType = {
  CARET: 'caret',            // 光标位置
  RANGE: 'range',            // 普通范围选择
  MULTI: 'multi',            // 多选区域
  BLOCK: 'block',            // 块选择（矩形区域）
  SEMANTIC: 'semantic'       // 语义选择（词、句、段落等）
};

/**
 * 语义单位枚举
 * @enum {string}
 */
export const SemanticUnit = {
  CHAR: 'char',              // 字符
  WORD: 'word',              // 单词
  SENTENCE: 'sentence',      // 句子
  PARAGRAPH: 'paragraph',    // 段落
  LINE: 'line',              // 行
  BLOCK: 'block',            // 块
  ELEMENT: 'element',        // 元素（如HTML标签）
  SECTION: 'section'         // 章节
};

/**
 * 创建高级选择管理器
 * 
 * @param {Object} options - 配置选项
 * @param {Object} options.eventManager - 事件管理器实例
 * @param {Object} options.documentModel - 文档模型实例
 * @returns {Object} 选择管理器API
 */
export const createSelectionManager = (options = {}) => {
  const {
    eventManager = null,
    documentModel = null
  } = options;
  
  if (!eventManager || !documentModel) {
    throw new Error('选择管理器需要事件管理器和文档模型实例');
  }
  
  // 选择状态
  const selectionState = {
    // 当前活动选择
    activeSelection: {
      type: SelectionType.CARET,
      ranges: []
    },
    // 选择历史
    history: [],
    // 历史索引
    historyIndex: -1,
    // 历史容量
    historyCapacity: 10,
    // 标记记忆点
    markers: new Map(),
    // 选择模式
    mode: 'normal',
    // 是否正在进行块选择
    isBlockSelecting: false,
    // 块选择起始点
    blockStartPoint: null
  };
  
  /**
   * 选择范围对象
   * @typedef {Object} SelectionRange
   * @property {number} startOffset - 开始偏移量
   * @property {number} endOffset - 结束偏移量
   * @property {string} startPath - 开始路径（可选）
   * @property {string} endPath - 结束路径（可选）
   * @property {boolean} isReversed - 是否是反向选择
   * @property {boolean} isCollapsed - 是否是折叠选择（开始=结束）
   */
  
  /**
   * 创建新的选择范围
   * @param {number} startOffset - 开始偏移量
   * @param {number} endOffset - 结束偏移量
   * @param {string} [startPath] - 开始路径
   * @param {string} [endPath] - 结束路径
   * @returns {SelectionRange} 新的选择范围
   */
  const createRange = (startOffset, endOffset, startPath = null, endPath = null) => {
    const isReversed = (startPath === endPath && startOffset > endOffset) ||
                     (startPath !== null && endPath !== null && startPath > endPath);
    
    // 如果是反向选择，交换起点和终点
    if (isReversed) {
      [startOffset, endOffset] = [endOffset, startOffset];
      [startPath, endPath] = [endPath, startPath];
    }
    
    return {
      startOffset,
      endOffset,
      startPath: startPath || documentModel.getActivePath(),
      endPath: endPath || documentModel.getActivePath(),
      isReversed: isReversed,
      isCollapsed: startOffset === endOffset && 
                   (startPath === endPath || startPath === null || endPath === null)
    };
  };
  
  /**
   * 设置当前的选择类型和范围
   * @param {string} type - 选择类型
   * @param {SelectionRange[]} ranges - 选择范围数组
   * @returns {boolean} 是否成功设置
   */
  const setSelection = (type, ranges) => {
    if (!Object.values(SelectionType).includes(type)) {
      return false;
    }
    
    // 保存当前选择到历史
    saveSelectionToHistory();
    
    // 更新当前选择
    selectionState.activeSelection = {
      type,
      ranges: [...ranges]
    };
    
    // 应用选择到DOM
    applySelectionToDOM();
    
    // 触发选择变更事件
    if (eventManager) {
      eventManager.core.dispatch('selectionChange', null, {
        type,
        ranges: [...ranges],
        timestamp: Date.now()
      });
    }
    
    return true;
  };
  
  /**
   * 设置光标位置
   * @param {number} offset - 偏移量
   * @param {string} [path] - 节点路径
   * @returns {boolean} 是否成功设置
   */
  const setCaret = (offset, path = null) => {
    const range = createRange(offset, offset, path, path);
    return setSelection(SelectionType.CARET, [range]);
  };
  
  /**
   * 设置范围选择
   * @param {number} startOffset - 开始偏移量
   * @param {number} endOffset - 结束偏移量
   * @param {string} [startPath] - 开始节点路径
   * @param {string} [endPath] - 结束节点路径
   * @returns {boolean} 是否成功设置
   */
  const setRange = (startOffset, endOffset, startPath = null, endPath = null) => {
    const range = createRange(startOffset, endOffset, startPath, endPath);
    return setSelection(SelectionType.RANGE, [range]);
  };
  
  /**
   * 添加选择范围（多选）
   * @param {number} startOffset - 开始偏移量
   * @param {number} endOffset - 结束偏移量
   * @param {string} [startPath] - 开始节点路径
   * @param {string} [endPath] - 结束节点路径
   * @returns {boolean} 是否成功添加
   */
  const addRange = (startOffset, endOffset, startPath = null, endPath = null) => {
    // 如果当前不是多选，转换为多选
    if (selectionState.activeSelection.type !== SelectionType.MULTI) {
      // 保存当前选择
      const currentRanges = [...selectionState.activeSelection.ranges];
      
      // 转换为多选
      selectionState.activeSelection = {
        type: SelectionType.MULTI,
        ranges: currentRanges
      };
    }
    
    // 创建新范围
    const newRange = createRange(startOffset, endOffset, startPath, endPath);
    
    // 添加到多选数组
    selectionState.activeSelection.ranges.push(newRange);
    
    // 应用选择到DOM
    applySelectionToDOM();
    
    // 触发选择变更事件
    if (eventManager) {
      eventManager.core.dispatch('selectionChange', null, {
        type: SelectionType.MULTI,
        ranges: [...selectionState.activeSelection.ranges],
        timestamp: Date.now()
      });
    }
    
    return true;
  };
  
  /**
   * 清除所有选择
   * @returns {boolean} 是否成功清除
   */
  const clearSelection = () => {
    return setCaret(0);
  };
  
  /**
   * 在当前文档选择上下文中应用选择
   */
  const applySelectionToDOM = () => {
    try {
      const selection = window.getSelection();
      
      // 清除现有选择
      selection.removeAllRanges();
      
      // 应用每个范围
      selectionState.activeSelection.ranges.forEach(range => {
        try {
          // 获取DOM节点和偏移量
          const { startNode, startOffset, endNode, endOffset } = getDOMPositionFromRange(range);
          
          // 如果没有找到有效节点，跳过
          if (!startNode || !endNode) return;
          
          // 创建DOM范围
          const domRange = document.createRange();
          domRange.setStart(startNode, startOffset);
          domRange.setEnd(endNode, endOffset);
          
          // 添加到选择
          selection.addRange(domRange);
        } catch (error) {
          console.warn('应用选择范围失败:', error);
        }
      });
      
      // 如果是块选择，额外处理
      if (selectionState.activeSelection.type === SelectionType.BLOCK) {
        applyBlockSelectionStyle();
      }
    } catch (error) {
      console.error('应用选择到DOM失败:', error);
    }
  };
  
  /**
   * 根据选择范围获取DOM位置
   * @param {SelectionRange} range - 选择范围
   * @returns {Object} DOM位置
   */
  const getDOMPositionFromRange = (range) => {
    // 这里需要根据文档模型实现确定如何将模型路径和偏移量转换为DOM节点和偏移量
    // 以下是一个简化示例，实际实现取决于具体的文档模型
    
    try {
      // 通过文档模型获取DOM位置
      const startPosition = documentModel.getDOMPosition(range.startPath, range.startOffset);
      const endPosition = documentModel.getDOMPosition(range.endPath, range.endOffset);
      
      return {
        startNode: startPosition.node,
        startOffset: startPosition.offset,
        endNode: endPosition.node,
        endOffset: endPosition.offset
      };
    } catch (error) {
      console.warn('获取DOM位置失败:', error);
      
      // 如果无法获取位置，返回空对象
      return {
        startNode: null,
        startOffset: 0,
        endNode: null,
        endOffset: 0
      };
    }
  };
  
  /**
   * 应用块选择样式
   */
  const applyBlockSelectionStyle = () => {
    // 块选择通常需要额外的样式，因为DOM选择API不直接支持矩形选择
    // 这里需要实现矩形选择的视觉效果
    
    try {
      // 移除现有的块选择样式
      removeBlockSelectionStyle();
      
      // 获取块选择的范围
      const blockRange = selectionState.activeSelection.ranges[0];
      
      // 获取起始和结束位置的DOM坐标
      const startRect = getRectsForPosition(blockRange.startPath, blockRange.startOffset)[0];
      const endRect = getRectsForPosition(blockRange.endPath, blockRange.endOffset)[0];
      
      if (!startRect || !endRect) return;
      
      // 计算块的边界
      const blockBounds = {
        left: Math.min(startRect.left, endRect.left),
        top: Math.min(startRect.top, endRect.top),
        right: Math.max(startRect.right, endRect.right),
        bottom: Math.max(startRect.bottom, endRect.bottom)
      };
      
      // 获取块内的所有文本行
      const lines = getLinesInBlock(blockBounds);
      
      // 创建高亮元素
      lines.forEach(line => {
        const highlight = document.createElement('div');
        highlight.className = 'block-selection-highlight';
        highlight.style.position = 'absolute';
        highlight.style.backgroundColor = 'rgba(77, 144, 254, 0.3)';
        highlight.style.left = `${line.left}px`;
        highlight.style.top = `${line.top}px`;
        highlight.style.width = `${line.width}px`;
        highlight.style.height = `${line.height}px`;
        highlight.dataset.selectionHighlight = 'block';
        
        document.body.appendChild(highlight);
      });
    } catch (error) {
      console.error('应用块选择样式失败:', error);
    }
  };
  
  /**
   * 移除块选择样式
   */
  const removeBlockSelectionStyle = () => {
    // 移除所有块选择高亮元素
    const highlights = document.querySelectorAll('[data-selection-highlight="block"]');
    highlights.forEach(el => el.parentNode.removeChild(el));
  };
  
  /**
   * 获取位置的客户端矩形
   * @param {string} path - 节点路径
   * @param {number} offset - 偏移量
   * @returns {DOMRect[]} 矩形数组
   */
  const getRectsForPosition = (path, offset) => {
    try {
      // 通过文档模型获取DOM位置
      const position = documentModel.getDOMPosition(path, offset);
      
      if (!position.node) return [];
      
      // 创建范围获取客户端矩形
      const range = document.createRange();
      range.setStart(position.node, position.offset);
      range.setEnd(position.node, position.offset);
      
      // 扩展范围以获取更好的位置
      range.expand('character');
      
      // 获取客户端矩形
      return Array.from(range.getClientRects());
    } catch (error) {
      console.warn('获取位置矩形失败:', error);
      return [];
    }
  };
  
  /**
   * 获取块中的所有文本行
   * @param {Object} blockBounds - 块边界
   * @returns {Object[]} 行信息数组
   */
  const getLinesInBlock = (blockBounds) => {
    try {
      // 获取编辑器内容区域
      const contentArea = documentModel.getContentElement();
      
      if (!contentArea) return [];
      
      // 获取块区域中的所有文本节点
      const textNodes = getTextNodesInElement(contentArea);
      const lines = [];
      
      // 处理每个文本节点
      textNodes.forEach(node => {
        // 创建范围
        const range = document.createRange();
        range.selectNodeContents(node);
        
        // 获取范围的客户端矩形
        const rects = Array.from(range.getClientRects());
        
        // 筛选在块边界内的矩形
        rects.forEach(rect => {
          // 检查矩形是否与块相交
          if (rect.right >= blockBounds.left && 
              rect.left <= blockBounds.right &&
              rect.bottom >= blockBounds.top &&
              rect.top <= blockBounds.bottom) {
            
            // 计算相交区域
            const line = {
              left: Math.max(rect.left, blockBounds.left),
              top: rect.top,
              width: Math.min(rect.right, blockBounds.right) - Math.max(rect.left, blockBounds.left),
              height: rect.height,
              node: node
            };
            
            lines.push(line);
          }
        });
      });
      
      return lines;
    } catch (error) {
      console.error('获取块中的行失败:', error);
      return [];
    }
  };
  
  /**
   * 获取元素中的所有文本节点
   * @param {HTMLElement} element - 元素
   * @returns {Node[]} 文本节点数组
   */
  const getTextNodesInElement = (element) => {
    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    return textNodes;
  };
  
  /**
   * 从DOM选择更新当前选择状态
   * @returns {boolean} 是否成功更新
   */
  const updateFromDOM = () => {
    try {
      const domSelection = window.getSelection();
      
      // 如果没有选择，设置为默认光标位置
      if (domSelection.rangeCount === 0) {
        return setCaret(0);
      }
      
      // 处理单范围选择
      if (domSelection.rangeCount === 1) {
        const domRange = domSelection.getRangeAt(0);
        
        // 获取模型位置
        const startPosition = documentModel.getModelPosition(domRange.startContainer, domRange.startOffset);
        const endPosition = documentModel.getModelPosition(domRange.endContainer, domRange.endOffset);
        
        // 如果获取不到有效位置，返回
        if (!startPosition || !endPosition) {
          return false;
        }
        
        // 判断是否是折叠选择（光标）
        if (domRange.collapsed) {
          return setCaret(startPosition.offset, startPosition.path);
        } else {
          return setRange(
            startPosition.offset,
            endPosition.offset,
            startPosition.path,
            endPosition.path
          );
        }
      }
      
      // 处理多范围选择
      const ranges = [];
      for (let i = 0; i < domSelection.rangeCount; i++) {
        const domRange = domSelection.getRangeAt(i);
        
        // 获取模型位置
        const startPosition = documentModel.getModelPosition(domRange.startContainer, domRange.startOffset);
        const endPosition = documentModel.getModelPosition(domRange.endContainer, domRange.endOffset);
        
        // 如果获取不到有效位置，跳过
        if (!startPosition || !endPosition) {
          continue;
        }
        
        // 创建范围
        const range = createRange(
          startPosition.offset,
          endPosition.offset,
          startPosition.path,
          endPosition.path
        );
        
        ranges.push(range);
      }
      
      // 如果没有有效范围，返回
      if (ranges.length === 0) {
        return false;
      }
      
      // 设置多选
      return setSelection(SelectionType.MULTI, ranges);
    } catch (error) {
      console.error('从DOM更新选择失败:', error);
      return false;
    }
  };
  
  /**
   * 保存当前选择到历史
   */
  const saveSelectionToHistory = () => {
    // 删除当前位置之后的历史
    if (selectionState.historyIndex < selectionState.history.length - 1) {
      selectionState.history = selectionState.history.slice(0, selectionState.historyIndex + 1);
    }
    
    // 添加当前选择到历史
    selectionState.history.push({
      ...selectionState.activeSelection,
      timestamp: Date.now()
    });
    
    // 限制历史大小
    if (selectionState.history.length > selectionState.historyCapacity) {
      selectionState.history.shift();
    }
    
    // 更新历史索引
    selectionState.historyIndex = selectionState.history.length - 1;
  };
  
  /**
   * 返回到上一个选择
   * @returns {boolean} 是否成功返回
   */
  const goToPreviousSelection = () => {
    if (selectionState.historyIndex <= 0) {
      return false;
    }
    
    // 更新历史索引
    selectionState.historyIndex--;
    
    // 获取历史选择
    const historySelection = selectionState.history[selectionState.historyIndex];
    
    // 设置选择（不保存到历史）
    selectionState.activeSelection = {
      type: historySelection.type,
      ranges: [...historySelection.ranges]
    };
    
    // 应用选择到DOM
    applySelectionToDOM();
    
    // 触发选择变更事件
    if (eventManager) {
      eventManager.core.dispatch('selectionChange', null, {
        type: historySelection.type,
        ranges: [...historySelection.ranges],
        timestamp: Date.now()
      });
    }
    
    return true;
  };
  
  /**
   * 前进到下一个选择
   * @returns {boolean} 是否成功前进
   */
  const goToNextSelection = () => {
    if (selectionState.historyIndex >= selectionState.history.length - 1) {
      return false;
    }
    
    // 更新历史索引
    selectionState.historyIndex++;
    
    // 获取历史选择
    const historySelection = selectionState.history[selectionState.historyIndex];
    
    // 设置选择（不保存到历史）
    selectionState.activeSelection = {
      type: historySelection.type,
      ranges: [...historySelection.ranges]
    };
    
    // 应用选择到DOM
    applySelectionToDOM();
    
    // 触发选择变更事件
    if (eventManager) {
      eventManager.core.dispatch('selectionChange', null, {
        type: historySelection.type,
        ranges: [...historySelection.ranges],
        timestamp: Date.now()
      });
    }
    
    return true;
  };
  
  /**
   * 设置选择模式
   * @param {string} mode - 选择模式
   * @returns {boolean} 是否成功设置
   */
  const setSelectionMode = (mode) => {
    if (!['normal', 'extend', 'multi', 'block'].includes(mode)) {
      return false;
    }
    
    selectionState.mode = mode;
    
    // 如果模式不是块选择，取消块选择状态
    if (mode !== 'block') {
      selectionState.isBlockSelecting = false;
      selectionState.blockStartPoint = null;
      removeBlockSelectionStyle();
    }
    
    // 触发模式变更事件
    if (eventManager) {
      eventManager.core.dispatch('selectionModeChange', null, {
        mode,
        timestamp: Date.now()
      });
    }
    
    return true;
  };
  
  /**
   * 开始块选择
   * @param {number} x - 起始x坐标
   * @param {number} y - 起始y坐标
   * @returns {boolean} 是否成功开始
   */
  const startBlockSelection = (x, y) => {
    try {
      // 设置块选择模式
      setSelectionMode('block');
      
      // 获取坐标处的位置
      const position = documentModel.getPositionFromPoint(x, y);
      
      if (!position) {
        return false;
      }
      
      // 设置块选择状态
      selectionState.isBlockSelecting = true;
      selectionState.blockStartPoint = {
        x, y,
        path: position.path,
        offset: position.offset
      };
      
      // 设置初始选择
      return setCaret(position.offset, position.path);
    } catch (error) {
      console.error('开始块选择失败:', error);
      return false;
    }
  };
  
  /**
   * 更新块选择
   * @param {number} x - 当前x坐标
   * @param {number} y - 当前y坐标
   * @returns {boolean} 是否成功更新
   */
  const updateBlockSelection = (x, y) => {
    if (!selectionState.isBlockSelecting || !selectionState.blockStartPoint) {
      return false;
    }
    
    try {
      // 获取当前坐标处的位置
      const position = documentModel.getPositionFromPoint(x, y);
      
      if (!position) {
        return false;
      }
      
      // 创建块选择范围
      const range = createRange(
        selectionState.blockStartPoint.offset,
        position.offset,
        selectionState.blockStartPoint.path,
        position.path
      );
      
      // 设置块选择
      return setSelection(SelectionType.BLOCK, [range]);
    } catch (error) {
      console.error('更新块选择失败:', error);
      return false;
    }
  };
  
  /**
   * 结束块选择
   * @returns {boolean} 是否成功结束
   */
  const endBlockSelection = () => {
    if (!selectionState.isBlockSelecting) {
      return false;
    }
    
    // 重置块选择状态
    selectionState.isBlockSelecting = false;
    selectionState.blockStartPoint = null;
    
    // 保留当前的块选择
    return true;
  };
  
  /**
   * 扩展选择到语义单位
   * @param {string} unit - 语义单位
   * @param {boolean} [expand=true] - 是否扩展选择，false则移动到单位边界
   * @returns {boolean} 是否成功扩展
   */
  const expandToSemanticUnit = (unit, expand = true) => {
    if (!Object.values(SemanticUnit).includes(unit)) {
      return false;
    }
    
    try {
      // 获取当前选择
      const currentSelection = selectionState.activeSelection;
      
      // 确保至少有一个范围
      if (currentSelection.ranges.length === 0) {
        return false;
      }
      
      // 对每个范围执行语义扩展
      const newRanges = currentSelection.ranges.map(range => {
        // 获取语义范围
        const semanticRange = documentModel.getSemanticRange(
          expand ? range : null,
          unit
        );
        
        if (!semanticRange) {
          return range;
        }
        
        return createRange(
          semanticRange.startOffset,
          semanticRange.endOffset,
          semanticRange.startPath,
          semanticRange.endPath
        );
      });
      
      // 设置新选择
      return setSelection(SelectionType.SEMANTIC, newRanges);
    } catch (error) {
      console.error('扩展到语义单位失败:', error);
      return false;
    }
  };
  
  /**
   * 获取选择内容的文本
   * @returns {string} 选择的文本内容
   */
  const getSelectedText = () => {
    try {
      // 获取当前选择
      const currentSelection = selectionState.activeSelection;
      
      // 如果是折叠选择或无选择，返回空字符串
      if (currentSelection.ranges.length === 0 || 
          (currentSelection.ranges.length === 1 && currentSelection.ranges[0].isCollapsed)) {
        return '';
      }
      
      // 从每个范围获取文本
      const textParts = currentSelection.ranges.map(range => {
        return documentModel.getTextInRange(
          range.startPath,
          range.startOffset,
          range.endPath,
          range.endOffset
        );
      });
      
      // 合并所有文本
      return textParts.join('\n');
    } catch (error) {
      console.error('获取选择文本失败:', error);
      return '';
    }
  };
  
  /**
   * 设置选择内容的标记
   * @param {string} marker - 标记名称
   * @returns {boolean} 是否成功设置
   */
  const setSelectionMarker = (marker) => {
    try {
      // 获取当前选择
      const currentSelection = selectionState.activeSelection;
      
      // 存储标记
      selectionState.markers.set(marker, {
        ...currentSelection,
        timestamp: Date.now()
      });
      
      return true;
    } catch (error) {
      console.error('设置选择标记失败:', error);
      return false;
    }
  };
  
  /**
   * 跳转到标记位置
   * @param {string} marker - 标记名称
   * @returns {boolean} 是否成功跳转
   */
  const goToMarker = (marker) => {
    try {
      // 获取标记
      const markedSelection = selectionState.markers.get(marker);
      
      if (!markedSelection) {
        return false;
      }
      
      // 设置选择
      return setSelection(markedSelection.type, markedSelection.ranges);
    } catch (error) {
      console.error('跳转到标记位置失败:', error);
      return false;
    }
  };
  
  /**
   * 绑定事件处理器
   */
  const bindEventHandlers = () => {
    if (!eventManager) return null;
    
    const handlers = {
      // 处理选择变更
      selectionchange: (event) => {
        // 只有在非编程变更时才从DOM更新
        if (!selectionState.programmaticChange) {
          updateFromDOM();
        }
      },
      
      // 处理键盘事件
      keydown: (event) => {
        // 处理选择相关的键盘快捷键
        
        // Alt+左右箭头 - 选择历史导航
        if (event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
          if (event.key === 'ArrowLeft') {
            goToPreviousSelection();
            event.preventDefault();
          } else if (event.key === 'ArrowRight') {
            goToNextSelection();
            event.preventDefault();
          }
        }
        
        // 处理扩展选择的快捷键
        if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey) {
          let unit = null;
          
          switch (event.key) {
            case 'KeyW':
              unit = SemanticUnit.WORD;
              break;
            case 'KeyS':
              unit = SemanticUnit.SENTENCE;
              break;
            case 'KeyP':
              unit = SemanticUnit.PARAGRAPH;
              break;
            case 'KeyL':
              unit = SemanticUnit.LINE;
              break;
            case 'KeyB':
              unit = SemanticUnit.BLOCK;
              break;
          }
          
          if (unit) {
            expandToSemanticUnit(unit);
            event.preventDefault();
          }
        }
      },
      
      // 处理Alt键抬起 - 退出特殊选择模式
      keyup: (event) => {
        if (event.key === 'Alt' && selectionState.mode !== 'normal') {
          setSelectionMode('normal');
        }
      }
    };
    
    // 绑定事件处理器
    document.addEventListener('selectionchange', handlers.selectionchange);
    document.addEventListener('keydown', handlers.keydown);
    document.addEventListener('keyup', handlers.keyup);
    
    // 返回清理函数
    return {
      cleanup: () => {
        document.removeEventListener('selectionchange', handlers.selectionchange);
        document.removeEventListener('keydown', handlers.keydown);
        document.removeEventListener('keyup', handlers.keyup);
      }
    };
  };
  
  // 初始化
  let initialized = false;
  let eventBindings = null;
  
  /**
   * 初始化选择管理器
   */
  const init = () => {
    if (initialized) return false;
    
    // 绑定事件处理器
    eventBindings = bindEventHandlers();
    
    initialized = true;
    return true;
  };
  
  /**
   * 清理选择管理器
   */
  const cleanup = () => {
    if (!initialized) return false;
    
    // 清理事件绑定
    if (eventBindings && typeof eventBindings.cleanup === 'function') {
      eventBindings.cleanup();
    }
    
    // 移除块选择样式
    removeBlockSelectionStyle();
    
    initialized = false;
    return true;
  };
  
  // 初始化
  init();
  
  // 返回公共API
  return {
    // 选择操作
    setCaret,
    setRange,
    addRange,
    clearSelection,
    setSelection,
    
    // 语义选择
    expandToSemanticUnit,
    
    // 块选择
    startBlockSelection,
    updateBlockSelection,
    endBlockSelection,
    
    // 状态获取
    getCurrentSelection: () => ({ ...selectionState.activeSelection }),
    getSelectedText,
    getSelectionMode: () => selectionState.mode,
    
    // 历史和标记
    goToPreviousSelection,
    goToNextSelection,
    setSelectionMarker,
    goToMarker,
    
    // 模式控制
    setSelectionMode,
    
    // 清理
    cleanup
  };
}; 