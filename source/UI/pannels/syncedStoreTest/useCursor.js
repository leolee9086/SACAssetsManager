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
    
    // 处理空容器
    if (!container.hasChildNodes()) return 0;
    
    let position = 0;
    
    // 如果是文本节点，计算路径上之前的文本长度
    if (node.nodeType === Node.TEXT_NODE) {
      // 添加当前节点内的偏移
      position = offset;
      
      // 向上遍历DOM树计算之前的文本
      let current = node;
      while (current !== container) {
        // 计算前面兄弟节点的文本长度
        let sibling = current.previousSibling;
        while (sibling) {
          position += getNodeTextLength(sibling);
          sibling = sibling.previousSibling;
        }
        
        // 向上移动到父节点
        current = current.parentNode;
        if (!current) break;
      }
      
      return position;
    }
    
    // 如果是元素节点
    // 遍历所有文本节点直到目标位置
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let currentNode = walker.nextNode();
    let nodeCount = 0;
    
    while (currentNode) {
      // 如果已经遍历到了目标位置
      if (currentNode === node) {
        return position + offset;
      }
      
      // 如果当前节点在目标节点之前
      if (nodeCount < offset && currentNode.parentNode === node.parentNode) {
        position += currentNode.textContent.length;
        nodeCount++;
      } else {
        position += currentNode.textContent.length;
      }
      
      currentNode = walker.nextNode();
    }
    
    return position;
  };
  
  /**
   * 获取节点的文本长度
   * @param {Node} node - DOM节点
   * @returns {number} 文本长度
   */
  const getNodeTextLength = (node) => {
    if (!node) return 0;
    
    // 文本节点直接返回长度
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent.length;
    }
    
    // 元素节点递归计算所有文本子节点的长度
    if (node.nodeType === Node.ELEMENT_NODE) {
      let length = 0;
      const walker = document.createTreeWalker(
        node,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let textNode = walker.nextNode();
      while (textNode) {
        length += textNode.textContent.length;
        textNode = walker.nextNode();
      }
      
      return length;
    }
    
    return 0;
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
      
      // 清除现有选区
      selection.removeAllRanges();
      
      // 使用保存的描述符创建新的范围
      const range = document.createRange();
      
      // 解析起点和终点
      const { node: startNode, offset: startOffset } = resolvePositionDescriptor(
        container, 
        savedSelection.startDesc || { index: savedSelection.start }
      );
      
      const { node: endNode, offset: endOffset } = resolvePositionDescriptor(
        container, 
        savedSelection.endDesc || { index: savedSelection.end }
      );
      
      if (!startNode || !endNode) return false;
      
      // 设置范围
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      
      // 应用选区
      selection.addRange(range);
      return true;
    } catch (err) {
      console.error('恢复选区失败:', err);
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
  
  // 设置事件监听
  onMounted(() => {
    document.addEventListener('selectionchange', debouncedSelectionChange);
  });
  
  // 清理事件监听
  onUnmounted(() => {
    document.removeEventListener('selectionchange', debouncedSelectionChange);
    clearTimeout(selectionTimeout);
  });
  
  return {
    // 状态
    selections,
    localSelection,
    
    // 方法
    saveSelection,
    restoreSelection,
    updateRemoteSelection,
    removeRemoteSelection,
    getCursorCoordinates,
    getTextPosition,
    getNodeAndOffset,
  };
}; 