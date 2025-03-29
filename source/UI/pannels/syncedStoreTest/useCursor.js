/**
 * 光标计算与恢复管理模块
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
    debounceTime = 50,        // 防抖时间
    // 新增缓存配置选项
    enableCache = true,
    cacheTimeout = 2000,
    // 添加虚拟光标配置
    useVirtualCursor = true,      // 是否使用虚拟光标
    cursorColor = '#1a73e8',      // 本地光标颜色
    cursorWidth = 2,              // 光标宽度
    blinkInterval = 530,          // 闪烁间隔，与系统默认值接近
  } = options;
  
  // 内部状态
  const cursorState = reactive({
    selections: new Map(),      // 存储所有用户的选区信息
    localSelection: {           // 本地选区
      start: 0,
      end: 0,
      text: '',                 // 选区文本
      timestamp: Date.now(),    // 时间戳
    },
    isProcessing: false,        // 是否正在处理选区变化
    container: null,            // 编辑器容器DOM引用
  });
  
  // 外部可用状态
  const selections = computed(() => cursorState.selections);
  const localSelection = computed(() => cursorState.localSelection);
  
  // 添加缓存系统
  const cache = {
    nodeTextLengths: new WeakMap(), // 节点文本长度缓存
    textPositions: new Map(),        // 文本位置索引缓存
    contentVersion: 0,              // 内容版本号，用于检测变化
    lastCacheCleanup: Date.now(),   // 上次缓存清理时间
  };
  
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
   * 创建一个文本位置描述符
   * @param {HTMLElement} container - 编辑器容器
   * @param {Node} node - 当前节点
   * @param {number} offset - 节点内偏移量
   * @returns {Object} 位置描述符
   */
  const createPositionDescriptor = (container, node, offset) => {
    // 处理边界情况
    if (!container || !node) {
      return { index: 0, node: null, offset: 0 };
    }
    
    try {
      // 计算文本偏移量
      const index = getTextPosition(container, node, offset);
      
      // 创建路径描述 (用于恢复位置)
      const path = [];
      let current = node;
      while (current && current !== container) {
        const parent = current.parentNode;
        if (!parent) break;
        
        // 找出当前节点在父节点中的索引
        const childNodes = Array.from(parent.childNodes);
        const childIndex = childNodes.indexOf(current);
        
        path.unshift(childIndex);
        current = parent;
      }
      
      return {
        index,            // 文本位置索引
        path,             // DOM路径
        nodeType: node.nodeType,
        offset,           // 节点内偏移量
        textContent: node.textContent,
      };
    } catch (err) {
      console.error('创建位置描述符失败:', err);
      return { index: 0, node: null, offset: 0 };
    }
  };
  
  /**
   * 从位置描述符恢复节点引用和偏移量
   * @param {HTMLElement} container - 编辑器容器
   * @param {Object} descriptor - 位置描述符
   * @returns {Object} 包含节点和偏移量
   */
  const resolvePositionDescriptor = (container, descriptor) => {
    if (!container || !descriptor) {
      return { node: container, offset: 0 };
    }
    
    try {
      // 先尝试使用路径恢复
      if (descriptor.path && descriptor.path.length) {
        let current = container;
        for (const index of descriptor.path) {
          if (!current.childNodes || index >= current.childNodes.length) {
            break;
          }
          current = current.childNodes[index];
        }
        
        // 如果恢复到了文本节点且偏移量有效
        if (current && current.nodeType === Node.TEXT_NODE && 
            descriptor.offset <= current.textContent.length) {
          return { node: current, offset: descriptor.offset };
        }
      }
      
      // 备用：使用文本位置
      return getNodeAndOffset(container, descriptor.index);
    } catch (err) {
      console.error('解析位置描述符失败:', err);
      return { node: container, offset: 0 };
    }
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
    
    // 生成缓存键
    const cacheKey = `${cache.contentVersion}-${node.nodeType}-${getNodeIdentifier(node)}-${offset}`;
    
    // 检查缓存
    if (enableCache && cache.textPositions.has(cacheKey)) {
      return cache.textPositions.get(cacheKey);
    }
    
    let position = 0;
    
    // 优化文本节点处理流程
    if (node.nodeType === Node.TEXT_NODE) {
      position = offset;
      
      // 使用迭代替代递归，提高深层DOM树性能
      let current = node;
      let parent = null;
      
      while (current !== container) {
        let sibling = current.previousSibling;
        while (sibling) {
          // 利用缓存加速计算
          position += getNodeTextLength(sibling);
          sibling = sibling.previousSibling;
        }
        
        parent = current.parentNode;
        if (!parent || parent === container) break;
        current = parent;
      }
    } else {
      // 元素节点处理优化 - 避免创建TreeWalker
      // 使用累积算法计算位置
      let currentNode = container.firstChild;
      let currentPos = 0;
      let targetFound = false;
      
      const collectTextUpTo = (n, targetNode, targetOffset) => {
        if (!n) return { pos: 0, found: false };
        
        // 目标找到了
        if (n === targetNode) {
          return { pos: targetOffset, found: true };
        }
        
        // 文本节点直接计数
        if (n.nodeType === Node.TEXT_NODE) {
          return { pos: n.textContent.length, found: false };
        }
        
        // 元素节点递归遍历
        let totalPos = 0;
        let found = false;
        
        for (const child of Array.from(n.childNodes)) {
          const result = collectTextUpTo(child, targetNode, targetOffset);
          totalPos += result.pos;
          if (result.found) {
            found = true;
            break;
          }
        }
        
        return { pos: totalPos, found };
      };
      
      const result = collectTextUpTo(container, node, offset);
      position = result.found ? result.pos : 0;
    }
    
    // 缓存结果
    if (enableCache) {
      cache.textPositions.set(cacheKey, position);
    }
    
    return position;
  };
  
  /**
   * 获取节点的唯一标识 - 用于缓存键生成
   * @param {Node} node - DOM节点
   * @returns {string} 节点标识
   */
  const getNodeIdentifier = (node) => {
    if (!node) return 'null';
    
    // 对于文本节点使用其内容的哈希作为标识
    if (node.nodeType === Node.TEXT_NODE) {
      return hashString(node.textContent).toString();
    }
    
    // 对于元素节点使用标签名和属性组合
    if (node.nodeType === Node.ELEMENT_NODE) {
      const attrs = Array.from(node.attributes || [])
        .map(attr => `${attr.name}="${attr.value}"`)
        .join(' ');
      return `${node.tagName}:${attrs}`;
    }
    
    return node.nodeName;
  };
  
  /**
   * 简单的字符串哈希函数
   * @param {string} str - 输入字符串
   * @returns {number} 哈希值
   */
  const hashString = (str) => {
    let hash = 0;
    if (!str) return hash;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return Math.abs(hash);
  };
  
  /**
   * 获取节点的文本长度
   * @param {Node} node - DOM节点
   * @returns {number} 文本长度
   */
  const getNodeTextLength = (node) => {
    if (!node) return 0;
    
    // 检查缓存
    if (enableCache && cache.nodeTextLengths.has(node)) {
      return cache.nodeTextLengths.get(node);
    }
    
    let length = 0;
    
    // 文本节点直接返回长度
    if (node.nodeType === Node.TEXT_NODE) {
      length = node.textContent.length;
    }
    // 元素节点使用优化的遍历方法
    else if (node.nodeType === Node.ELEMENT_NODE) {
      // 使用更高效的递归遍历而非TreeWalker
      const processNode = (n) => {
        if (!n) return 0;
        if (n.nodeType === Node.TEXT_NODE) {
          return n.textContent.length;
        }
        
        let childLength = 0;
        // 使用childNodes直接循环比TreeWalker高效
        Array.from(n.childNodes).forEach(child => {
          childLength += processNode(child);
        });
        
        // 缓存子节点结果
        if (enableCache && n !== node) {
          cache.nodeTextLengths.set(n, childLength);
        }
        
        return childLength;
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
   * 根据文本索引找到对应的节点和偏移量
   * @param {HTMLElement} container - 编辑器容器
   * @param {number} position - 文本位置索引
   * @returns {Object} 节点和偏移量
   */
  const getNodeAndOffset = (container, position) => {
    if (!container) return { node: null, offset: 0 };
    
    // 处理边界情况
    if (position < 0) position = 0;
    
    // 如果容器没有子节点，创建一个空文本节点
    if (!container.hasChildNodes()) {
      const textNode = document.createTextNode('');
      container.appendChild(textNode);
      return { node: textNode, offset: 0 };
    }
    
    // 处理容器内容长度超出的情况
    const totalLength = getNodeTextLength(container);
    if (position > totalLength) {
      position = totalLength;
    }
    
    // 遍历文本节点查找位置
    let currentPos = 0;
    let targetNode = null;
    let targetOffset = 0;
    
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
      // 回到最后一个文本节点
      const lastWalker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let lastNode = null;
      let tempNode;
      while (tempNode = lastWalker.nextNode()) {
        lastNode = tempNode;
      }
      
      if (lastNode) {
        targetNode = lastNode;
        targetOffset = lastNode.textContent.length;
      }
    }
    
    // 如果还是没找到，使用容器本身
    if (!targetNode) {
      const textNode = document.createTextNode('');
      container.appendChild(textNode);
      return { node: textNode, offset: 0 };
    }
    
    return { node: targetNode, offset: targetOffset };
  };
  
  /**
   * 获取光标在UI中的坐标位置
   * @param {number} position - 文本位置索引
   * @returns {Object} 包含left和top坐标的对象
   */
  const getCursorCoordinates = (position) => {
    const container = getContainer();
    if (!container) return { left: 0, top: 0 };
    
    try {
      // 获取位置对应的节点和偏移量
      const { node, offset } = getNodeAndOffset(container, position);
      if (!node) return { left: 0, top: 0 };
      
      // 创建一个范围来测量位置
      const range = document.createRange();
      range.setStart(node, offset);
      range.setEnd(node, offset);
      
      // 获取范围的边界矩形
      const rects = range.getClientRects();
      const containerRect = container.getBoundingClientRect();
      
      // 优先使用范围的第一个矩形
      if (rects.length > 0) {
        const rect = rects[0];
        return {
          left: rect.left - containerRect.left + container.scrollLeft,
          top: rect.top - containerRect.top + container.scrollTop
        };
      }
      
      // 后备：使用边界矩形
      const rect = range.getBoundingClientRect();
      return {
        left: rect.left - containerRect.left + container.scrollLeft,
        top: rect.top - containerRect.top + container.scrollTop
      };
    } catch (err) {
      console.error('计算光标坐标失败:', err);
      return { left: 0, top: 0 };
    }
  };
  
  // 创建光标闪烁状态
  const isVisible = ref(true);
  let blinkTimer = null;
  
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
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    
    // 检查选区是否在容器内
    if (!container.contains(range.startContainer) || 
        !container.contains(range.endContainer)) {
      return null;
    }
    
    // 创建起点和终点的描述符
    const startDesc = createPositionDescriptor(
      container, 
      range.startContainer, 
      range.startOffset
    );
    
    const endDesc = createPositionDescriptor(
      container, 
      range.endContainer, 
      range.endOffset
    );
    
    // 更新本地选区
    cursorState.localSelection = {
      start: startDesc.index,
      end: endDesc.index,
      startDesc,
      endDesc,
      text: range.toString(),
      timestamp: Date.now()
    };
    
    // 重置闪烁状态
    resetCursorBlink();
    
    return cursorState.localSelection;
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
      const selection = window.getSelection();
      if (!selection) return false;
      
      selection.removeAllRanges();
      const range = document.createRange();
      
      // 解析起点和终点
      let startResult = resolvePositionDescriptor(
        container, 
        savedSelection.startDesc || { index: savedSelection.start }
      );
      
      let endResult = resolvePositionDescriptor(
        container, 
        savedSelection.endDesc || { index: savedSelection.end }
      );
      
      // 位置解析失败时使用备用策略
      if (!startResult.node || !endResult.node) {
        // 后备策略：直接使用文本索引
        startResult = getNodeAndOffset(container, savedSelection.start);
        endResult = getNodeAndOffset(container, savedSelection.end);
        
        // 仍然失败时，回退到容器的起始位置
        if (!startResult.node || !endResult.node) {
          if (container.firstChild && container.firstChild.nodeType === Node.TEXT_NODE) {
            range.setStart(container.firstChild, 0);
            range.setEnd(container.firstChild, 0);
          } else {
            range.setStart(container, 0);
            range.setEnd(container, 0);
          }
          selection.addRange(range);
          return false;
        }
      }
      
      // 设置范围
      range.setStart(startResult.node, startResult.offset);
      range.setEnd(endResult.node, endResult.offset);
      
      selection.addRange(range);
      return true;
    } catch (err) {
      console.error('恢复选区失败:', err);
      
      // 最终后备：恢复到容器开始
      try {
        const range = document.createRange();
        range.setStart(container, 0);
        range.setEnd(container, 0);
        selection.addRange(range);
      } catch (e) {
        // 忽略最终回退的错误
      }
      
      return false;
    }
  };
  
  /**
   * 更新远程用户的选区
   * @param {string} userId - 用户ID
   * @param {Object} selection - 选区信息
   */
  const updateRemoteSelection = (userId, selection) => {
    if (!userId || !selection) return;
    
    cursorState.selections.set(userId, {
      ...selection,
      timestamp: Date.now(),
      userId
    });
  };
  
  /**
   * 删除远程用户的选区
   * @param {string} userId - 用户ID
   */
  const removeRemoteSelection = (userId) => {
    if (cursorState.selections.has(userId)) {
      cursorState.selections.delete(userId);
    }
  };
  
  /**
   * 处理选区变化事件
   */
  const handleSelectionChange = () => {
    if (cursorState.isProcessing) return;
    
    cursorState.isProcessing = true;
    saveSelection();
    cursorState.isProcessing = false;
  };
  
  // 防抖处理选区变化
  let selectionTimeout = null;
  const debouncedSelectionChange = () => {
    clearTimeout(selectionTimeout);
    selectionTimeout = setTimeout(handleSelectionChange, debounceTime);
  };
  
  // 处理编辑操作的函数 - 用于检测内容变化
  const handleContentChange = () => {
    incrementContentVersion();
  };
  
  /**
   * 创建选区高亮样式
   */
  const createSelectionStyle = () => {
    if (!useVirtualCursor) return '';
    
    // 创建一个样式元素以隐藏浏览器默认光标并修改选区样式
    const styleId = 'virtual-cursor-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .virtual-cursor-enabled {
          caret-color: transparent !important; /* 隐藏真实光标 */
        }
        .virtual-cursor-enabled::selection {
          background-color: rgba(26, 115, 232, 0.3) !important; /* 选区背景颜色 */
        }
      `;
      document.head.appendChild(style);
    }
  };
  
  // 添加获取本地光标坐标的方法
  const getLocalCursorCoordinates = () => {
    if (!cursorState.localSelection) return { left: 0, top: 0 };
    
    // 使用当前光标位置获取坐标
    // 对于文本选区，使用结束位置作为光标位置
    const position = cursorState.localSelection.end;
    return getCursorCoordinates(position);
  };
  
  /**
   * 根据点击位置找到最接近的文本位置
   * @param {HTMLElement} container - 编辑器容器
   * @param {number} x - 点击的X坐标（相对于容器）
   * @param {number} y - 点击的Y坐标（相对于容器）
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
  
  // 生命周期钩子增强
  onMounted(() => {
    document.addEventListener('selectionchange', debouncedSelectionChange);
    
    const container = getContainer();
    if (container) {
      // 监听可能导致内容变化的事件
      container.addEventListener('input', handleContentChange);
      container.addEventListener('paste', handleContentChange);
      container.addEventListener('drop', handleContentChange);
      
      // 为容器添加虚拟光标样式
      if (useVirtualCursor) {
        createSelectionStyle();
        container.classList.add('virtual-cursor-enabled');
        startCursorBlink();
        
        // 监听容器焦点事件
        container.addEventListener('focus', () => {
          startCursorBlink();
        });
        
        container.addEventListener('blur', () => {
          stopCursorBlink(false);
        });
      }
    }
  });
  
  onUnmounted(() => {
    document.removeEventListener('selectionchange', debouncedSelectionChange);
    clearTimeout(selectionTimeout);
    
    const container = getContainer();
    if (container) {
      container.removeEventListener('input', handleContentChange);
      container.removeEventListener('paste', handleContentChange);
      container.removeEventListener('drop', handleContentChange);
      
      if (useVirtualCursor) {
        container.removeEventListener('focus', startCursorBlink);
        container.removeEventListener('blur', () => stopCursorBlink(false));
        
        // 移除样式类
        container.classList.remove('virtual-cursor-enabled');
      }
    }
    
    // 停止闪烁
    stopCursorBlink(false);
  });
  
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
    getLocalCursorCoordinates,  // 新增：获取本地光标坐标
    getTextPosition,
    getNodeAndOffset,
    clearCache: () => {
      cache.nodeTextLengths = new WeakMap();
      cache.textPositions.clear();
      cache.lastCacheCleanup = Date.now();
    },
    incrementContentVersion,
    resetCursorBlink,           // 新增：重置光标闪烁
    getPositionFromPoint,  // 新增点击位置计算
  };
}; 