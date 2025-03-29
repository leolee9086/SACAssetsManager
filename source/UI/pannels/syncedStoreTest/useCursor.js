/**
 * 高效率光标计算与恢复管理模块
 * 处理富文本环境下的光标位置计算、序列化、反序列化和恢复
 */
import { ref, reactive, computed, onMounted, onUnmounted } from '../../../../static/vue.esm-browser.js';

/**
 * 创建光标管理器
 * @param {Object} options - 配置项
 * @returns {Object} 光标管理API
 */
export const useCursor = (options = {}) => {
  const {
    containerSelector = null, // 容器选择器
    containerRef = null,      // 容器引用
    lineHeight = 20,          // 行高
    // 缓存配置选项
    enableCache = true,
    cacheTimeout = 2000,
    // 虚拟光标配置
    useVirtualCursor = true,  // 是否使用虚拟光标
    cursorColor = '#1a73e8',  // 本地光标颜色
    cursorWidth = 2,          // 光标宽度
    blinkInterval = 530,      // 闪烁间隔
  } = options;
  
  // 内部状态
  const cursorState = reactive({
    selections: new Map(),     // 存储所有用户的选区信息
    localSelection: {          // 本地选区
      start: 0,
      end: 0,
      text: '',
      timestamp: Date.now(),
    },
    container: null,           // 编辑器容器DOM引用
  });
  
  // 光标闪烁状态
  const isVisible = ref(true);
  let blinkTimer = null;
  
  // 添加缓存系统
  const cache = {
    nodeTextLengths: new WeakMap(), // 节点文本长度缓存
    textPositions: new Map(),        // 文本位置索引缓存
    contentVersion: 0,              // 内容版本号，用于检测变化
    lastCacheCleanup: Date.now(),   // 上次缓存清理时间
  };
  
  // 外部可用状态
  const selections = computed(() => cursorState.selections);
  const localSelection = computed(() => cursorState.localSelection);
  
  // 在组件卸载时清理资源
  onUnmounted(() => {
    stopCursorBlink();
  });
  
  /**
   * 增加内容版本号，表示内容已变化
   */
  const incrementContentVersion = () => {
    cache.contentVersion++;
    
    // 清理过期缓存
    if (Date.now() - cache.lastCacheCleanup > cacheTimeout) {
      cache.nodeTextLengths = new WeakMap();
      cache.textPositions.clear();
      cache.lastCacheCleanup = Date.now();
    }
  };
  
  /**
   * 获取编辑器容器元素
   * @returns {HTMLElement|null} 编辑器容器元素
   */
  const getContainer = () => {
    if (cursorState.container) return cursorState.container;
    
    if (containerRef?.value) {
      cursorState.container = containerRef.value;
      return cursorState.container;
    }
    
    if (containerSelector) {
      const container = document.querySelector(containerSelector);
      if (container) {
        cursorState.container = container;
        return container;
      }
    }
    
    return null;
  };
  
  /**
   * 获取节点的唯一标识符（用于缓存）
   */
  const getNodeIdentifier = (node) => {
    if (!node) return '';
    
    // 使用节点属性和内容创建简单的标识符
    if (node.nodeType === Node.TEXT_NODE) {
      return `t:${node.textContent.length}`;
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      const classNames = node.className ? `-${node.className}` : '';
      const childCount = node.childNodes.length;
      return `e:${tagName}${classNames}:${childCount}`;
    }
    
    return `n:${node.nodeType}`;
  };
  
  /**
   * 计算节点及其子节点的文本长度
   * @param {Node} node - 节点
   * @returns {number} 文本长度
   */
  const getNodeTextLength = (node) => {
    if (!node) return 0;
    
    // 使用缓存加速计算
    if (enableCache && cache.nodeTextLengths.has(node)) {
      return cache.nodeTextLengths.get(node);
    }
    
    let length = 0;
    
    // 文本节点直接返回文本长度
    if (node.nodeType === Node.TEXT_NODE) {
      length = node.textContent.length;
    } 
    // 元素节点递归计算子节点
    else if (node.nodeType === Node.ELEMENT_NODE) {
      // 优化：使用递归处理而不是TreeWalker
      const processNode = (n) => {
        if (!n) return 0;
        
        if (n.nodeType === Node.TEXT_NODE) {
          return n.textContent.length;
        }
        
        let sum = 0;
        for (const child of Array.from(n.childNodes)) {
          sum += processNode(child);
        }
        
        // 缓存子节点结果
        if (enableCache && n !== node) {
          cache.nodeTextLengths.set(n, sum);
        }
        
        return sum;
      };
      
      length = processNode(node);
    }
    
    // 缓存结果
    if (enableCache) {
      cache.nodeTextLengths.set(node, length);
    }
    
    return length;
  };
  
  /**
   * 获取准确的文本位置索引
   * @param {HTMLElement} container - 编辑器容器
   * @param {Node} node - 当前节点
   * @param {number} offset - 节点内偏移量
   * @returns {number} 文本位置索引
   */
  const getTextPosition = (container, node, offset) => {
    if (!container) return 0;
    if (!container.hasChildNodes()) return 0;
    
    try {
      // 生成缓存键
      const cacheKey = `${cache.contentVersion}-${node.nodeType}-${getNodeIdentifier(node)}-${offset}`;
      
      // 检查缓存
      if (enableCache && cache.textPositions.has(cacheKey)) {
        return cache.textPositions.get(cacheKey);
      }
      
      let position = 0;
      
      // 文本节点处理优化
      if (node.nodeType === Node.TEXT_NODE) {
        position = offset;
        
        // 向上遍历计算前面节点的文本长度
        let current = node;
        
        while (current !== container && current.parentNode) {
          // 计算同级前面节点的文本长度
          let sibling = current.previousSibling;
          while (sibling) {
            position += getNodeTextLength(sibling);
            sibling = sibling.previousSibling;
          }
          
          current = current.parentNode;
        }
      }
      // 元素节点处理
      else if (node.nodeType === Node.ELEMENT_NODE) {
        // 计算此元素前面所有节点的文本长度
        let current = node;
        let childOffset = offset; // 保存子节点偏移量
        
        // 计算前面兄弟节点的长度
        let sibling = current.previousSibling;
        while (sibling) {
          position += getNodeTextLength(sibling);
          sibling = sibling.previousSibling;
        }
        
        // 加上当前节点中，指定偏移量之前的子节点长度
        for (let i = 0; i < childOffset && i < current.childNodes.length; i++) {
          position += getNodeTextLength(current.childNodes[i]);
        }
      }
      
      // 缓存结果
      if (enableCache) {
        cache.textPositions.set(cacheKey, position);
      }
      
      return position;
    } catch (error) {
      console.error('计算文本位置出错:', error);
      return 0;
    }
  };
  
  /**
   * 根据文本索引找到对应的节点和偏移量
   * @param {HTMLElement} container - 编辑器容器
   * @param {number} position - 文本位置索引
   * @returns {Object} 节点和偏移量
   */
  const getNodeAndOffset = (container, position) => {
    if (!container) return { node: null, offset: 0 };
    
    // 处理边界情况
    if (position <= 0) {
      // 返回容器的第一个文本节点或容器本身
      const firstTextNode = findFirstTextNode(container);
      return firstTextNode 
        ? { node: firstTextNode, offset: 0 }
        : { node: container, offset: 0 };
    }
    
    // 处理容器内容长度超出的情况
    const totalLength = getNodeTextLength(container);
    if (position >= totalLength) {
      // 返回容器的最后一个文本节点或容器本身
      const lastTextNode = findLastTextNode(container);
      return lastTextNode
        ? { node: lastTextNode, offset: lastTextNode.textContent.length }
        : { node: container, offset: container.childNodes.length };
    }
    
    try {
      // 遍历文本节点查找位置
      let currentPos = 0;
      let targetNode = null;
      let targetOffset = 0;
      
      // 使用TreeWalker遍历文本节点（性能优于递归）
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let node = walker.nextNode();
      while (node) {
        const nodeLength = node.textContent.length;
        
        // 找到包含目标位置的节点
        if (currentPos + nodeLength >= position) {
          targetNode = node;
          targetOffset = position - currentPos;
          break;
        }
        
        currentPos += nodeLength;
        node = walker.nextNode();
      }
      
      // 如果没找到但位置有效，使用最后一个文本节点
      if (!targetNode && currentPos > 0) {
        const lastTextNode = findLastTextNode(container);
        if (lastTextNode) {
          return { 
            node: lastTextNode, 
            offset: lastTextNode.textContent.length 
          };
        }
      }
      
      return targetNode
        ? { node: targetNode, offset: targetOffset }
        : { node: container, offset: 0 };
    } catch (error) {
      console.error('获取节点和偏移量出错:', error);
      return { node: container, offset: 0 };
    }
  };
  
  /**
   * 找到容器中的第一个文本节点
   */
  const findFirstTextNode = (container) => {
    if (!container) return null;
    
    // 如果自身就是文本节点
    if (container.nodeType === Node.TEXT_NODE) {
      return container;
    }
    
    // 使用TreeWalker查找第一个文本节点
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    return walker.nextNode();
  };
  
  /**
   * 找到容器中的最后一个文本节点
   */
  const findLastTextNode = (container) => {
    if (!container) return null;
    
    // 如果自身就是文本节点
    if (container.nodeType === Node.TEXT_NODE) {
      return container;
    }
    
    // 使用TreeWalker查找所有文本节点，并返回最后一个
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let lastNode = null;
    let node = null;
    
    while (node = walker.nextNode()) {
      lastNode = node;
    }
    
    return lastNode;
  };
  
  /**
   * 获取光标坐标
   * @param {number} position - 文本位置索引
   * @returns {Object} 光标坐标 { left, top }
   */
  const getCursorCoordinates = (position) => {
    const container = getContainer();
    if (!container) return { left: 0, top: 0 };
    
    try {
      // 获取包含此位置的节点和偏移量
      const { node, offset } = getNodeAndOffset(container, position);
      if (!node) return { left: 0, top: 0 };
      
      // 创建一个临时范围来获取位置
      const range = document.createRange();
      
      try {
        // 设置范围开始位置
        range.setStart(node, offset);
        range.setEnd(node, offset);
        
        // 获取范围的客户端矩形
        const rects = range.getClientRects();
        if (rects.length > 0) {
          const rect = rects[0];
          const containerRect = container.getBoundingClientRect();
          
          // 计算相对于容器的坐标
          return {
            left: rect.left - containerRect.left + container.scrollLeft,
            top: rect.top - containerRect.top + container.scrollTop
          };
        }
        
        // 备用: 如果没有rect，使用节点的位置（适用于空节点）
        if (node.parentNode) {
          const parentRect = node.parentNode.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          
          return {
            left: parentRect.left - containerRect.left + container.scrollLeft,
            top: parentRect.top - containerRect.top + container.scrollTop
          };
        }
      } catch (error) {
        console.warn('计算光标坐标出错，使用备用方法:', error);
      }
      
      // 如果上述方法都失败，使用更简单的估计
      // 基于文本位置，估算大致行数和位置
      const content = container.textContent || '';
      const charPerLine = Math.max(40, Math.floor(container.clientWidth / 8)); // 假设平均字符宽度为8px
      const lines = Math.floor(position / charPerLine);
      const column = position % charPerLine;
      
      return {
        left: column * 8 + 8, // 假设每个字符8px宽
        top: lines * lineHeight + 8 // 行高 + 上边距
      };
    } catch (error) {
      console.error('获取光标坐标失败:', error);
      return { left: 0, top: 0 };
    }
  };
  
  /**
   * 开始光标闪烁
   */
  const startCursorBlink = () => {
    if (blinkTimer) clearInterval(blinkTimer);
    
    isVisible.value = true;
    blinkTimer = setInterval(() => {
      isVisible.value = !isVisible.value;
    }, blinkInterval);
  };
  
  /**
   * 停止光标闪烁
   * @param {boolean} finalState - 停止时光标的最终状态
   */
  const stopCursorBlink = (finalState = true) => {
    if (blinkTimer) {
      clearInterval(blinkTimer);
      blinkTimer = null;
    }
    isVisible.value = finalState;
  };
  
  /**
   * 重置光标闪烁（在用户输入时）
   */
  const resetCursorBlink = () => {
    if (useVirtualCursor) {
      stopCursorBlink(true);
      startCursorBlink();
    }
  };
  
  /**
   * 保存当前选区状态
   * @returns {Object} 保存的选区状态
   */
  const saveSelection = () => {
    const container = getContainer();
    if (!container) return null;
    
    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return null;
      
      const range = selection.getRangeAt(0);
      
      // 检查选区是否在容器内
      if (!container.contains(range.startContainer) || 
          !container.contains(range.endContainer)) {
        return null;
      }
      
      // 计算起点和终点的文本位置
      const startIndex = getTextPosition(
        container, 
        range.startContainer, 
        range.startOffset
      );
      
      const endIndex = getTextPosition(
        container, 
        range.endContainer, 
        range.endOffset
      );
      
      // 更新本地选区
      const savedSelection = {
        start: startIndex,
        end: endIndex,
        text: range.toString(),
        timestamp: Date.now()
      };
      
      cursorState.localSelection = savedSelection;
      
      // 重置闪烁状态
      resetCursorBlink();
      
      return savedSelection;
    } catch (error) {
      console.error('保存选区失败:', error);
      return null;
    }
  };
  
  /**
   * 恢复选区
   * @param {Object} savedSelection - 要恢复的选区
   * @returns {boolean} 是否成功恢复
   */
  const restoreSelection = (savedSelection) => {
    const container = getContainer();
    if (!container || !savedSelection) return false;
    
    try {
      // 确保有合法的位置
      const start = Math.max(0, savedSelection.start || 0);
      const end = Math.max(start, savedSelection.end || start);
      
      // 获取起点和终点的节点和偏移量
      const startResult = getNodeAndOffset(container, start);
      const endResult = getNodeAndOffset(container, end);
      
      // 确保找到了有效的节点
      if (!startResult.node || !endResult.node) {
        console.warn('恢复选区失败: 未找到有效节点', startResult, endResult);
        return false;
      }
      
      // 设置选区
      const selection = window.getSelection();
      selection.removeAllRanges();
      
      const range = document.createRange();
      range.setStart(startResult.node, startResult.offset);
      range.setEnd(endResult.node, endResult.offset);
      
      selection.addRange(range);
      
      // 更新本地选区
      cursorState.localSelection = {
        start,
        end,
        text: range.toString(),
        timestamp: Date.now()
      };
      
      return true;
    } catch (error) {
      console.error('恢复选区失败:', error);
      return false;
    }
  };
  
  /**
   * 更新远程用户选区
   * @param {string} userId - 用户ID
   * @param {Object} selection - 选区信息
   */
  const updateRemoteSelection = (userId, selection) => {
    cursorState.selections.set(userId, {
      ...selection,
      timestamp: Date.now()
    });
  };
  
  /**
   * 移除远程用户选区
   * @param {string} userId - 用户ID
   */
  const removeRemoteSelection = (userId) => {
    cursorState.selections.delete(userId);
  };
  
  /**
   * 根据点击位置找到最接近的文本位置
   * @param {HTMLElement} container - 编辑器容器
   * @param {number} x - 点击的X坐标
   * @param {number} y - 点击的Y坐标
   * @returns {Object} 包含节点和偏移量
   */
  const getPositionFromPoint = (container, x, y) => {
    if (!container) return { node: null, offset: 0 };
    
    try {
      // 使用document.caretPositionFromPoint或caretRangeFromPoint API
      let node, offset;
      
      // 标准方法 - Firefox支持
      if (document.caretPositionFromPoint) {
        const position = document.caretPositionFromPoint(x, y);
        if (position) {
          node = position.offsetNode;
          offset = position.offset;
        }
      } 
      // 替代方法 - Chrome/Safari支持
      else if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(x, y);
        if (range) {
          node = range.startContainer;
          offset = range.startOffset;
        }
      }
      
      // 检查节点是否在容器内
      if (node && container.contains(node)) {
        return { node, offset };
      }
      
      return { node: container, offset: 0 };
    } catch (err) {
      console.error('从点击位置获取文本位置失败:', err);
      return { node: container, offset: 0 };
    }
  };
  
  // 初始化闪烁状态
  if (useVirtualCursor) {
    startCursorBlink();
  }
  
  return {
    // 状态
    selections,
    localSelection,
    isVisible,   // 光标是否可见（用于闪烁）
    
    // 方法
    saveSelection,
    restoreSelection,
    updateRemoteSelection,
    removeRemoteSelection,
    getCursorCoordinates,
    getTextPosition,
    getNodeAndOffset,
    clearCache: () => {
      cache.nodeTextLengths = new WeakMap();
      cache.textPositions.clear();
      cache.lastCacheCleanup = Date.now();
    },
    incrementContentVersion,
    resetCursorBlink,
    getPositionFromPoint,
  };
}; 