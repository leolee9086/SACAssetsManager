/**
 * 选择事件处理模块
 * 用于管理富文本编辑器中的文本选择和光标操作
 */

/**
 * 创建选择处理器
 * @param {Object} options - 配置项
 * @returns {Object} 选择处理器API
 */
export const createSelectionHandler = (options = {}) => {
  const {
    dispatch = () => {},              // 事件派发函数
    getContainer = () => null,        // 获取容器元素的函数
    debounce = (fn) => fn,            // 防抖函数
    suppressNativeSelection = false,  // 是否抑制原生选区
    updateState = () => {},           // 更新状态函数
    autoExpandSelection = true,        // 自动扩展选区到单词或段落
    selectionChangeThrottle = 50,      // 选择变化事件节流时间(ms)
    preserveSelectionOnBlur = true,    // 失焦时保留选区状态
  } = options;
  
  // 存储绑定的事件处理函数
  const boundHandlers = new Map();
  
  // 选择状态
  let selectionState = {
    isActive: false,                   // 是否有活动选区
    range: null,                       // 当前选区范围
    isCollapsed: true,                 // 选区是否折叠(即光标)
    startContainer: null,              // 选区开始容器
    endContainer: null,                // 选区结束容器
    anchorOffset: 0,                   // 锚点偏移
    focusOffset: 0,                    // 焦点偏移
    text: '',                          // 选区中的文本
    html: '',                          // 选区中的HTML
    lastUpdateTime: 0,                 // 最后更新时间
    lastPosition: { x: 0, y: 0 },      // 最后光标位置
    direction: 'forward',              // 选择方向
    isUserInitiated: false,            // 是否用户发起的选择
    pendingSelectionChange: false,     // 是否有待处理的选择变化
    selectionChangeTimer: null,        // 选择变化定时器
    preservedRange: null,              // 保存的选区范围(用于失焦恢复)
  };
  
  /**
   * 重置选择状态
   */
  const resetSelectionState = () => {
    // 清除定时器
    if (selectionState.selectionChangeTimer) {
      clearTimeout(selectionState.selectionChangeTimer);
    }
    
    // 保存上次选区位置
    const lastPosition = { ...selectionState.lastPosition };
    const preservedRange = selectionState.preservedRange;
    
    selectionState = {
      isActive: false,
      range: null,
      isCollapsed: true,
      startContainer: null,
      endContainer: null,
      anchorOffset: 0,
      focusOffset: 0,
      text: '',
      html: '',
      lastUpdateTime: Date.now(),
      lastPosition,
      direction: 'forward',
      isUserInitiated: false,
      pendingSelectionChange: false,
      selectionChangeTimer: null,
      preservedRange
    };
    
    // 更新全局状态
    updateGlobalState();
  };
  
  /**
   * 更新全局状态
   */
  const updateGlobalState = () => {
    updateState({
      selectionActive: selectionState.isActive,
      lastSelectionTime: selectionState.lastUpdateTime
    });
  };
  
  /**
   * 处理选择事件
   * @param {Event} e - 选择事件
   */
  const handleSelection = (e) => {
    try {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      
      const container = getContainer();
      if (!container) return;
      
      const range = selection.getRangeAt(0);
      if (!range) return;
      
      // 检查选区是否在编辑器容器内
      const isInContainer = isRangeInContainer(range, container);
      if (!isInContainer) return;
      
      // 更新选择状态
      selectionState.isActive = true;
      selectionState.range = range.cloneRange();
      selectionState.isCollapsed = selection.isCollapsed;
      selectionState.startContainer = range.startContainer;
      selectionState.endContainer = range.endContainer;
      selectionState.anchorOffset = selection.anchorOffset;
      selectionState.focusOffset = selection.focusOffset;
      selectionState.isUserInitiated = e && (e.type === 'mouseup' || e.type === 'select');
      selectionState.lastUpdateTime = Date.now();
      
      // 确定选择方向
      selectionState.direction = determineSelectionDirection(selection);
      
      // 获取选择内容
      if (!selection.isCollapsed) {
        try {
          const fragment = range.cloneContents();
          const tempDiv = document.createElement('div');
          tempDiv.appendChild(fragment);
          selectionState.text = tempDiv.textContent || '';
          selectionState.html = tempDiv.innerHTML;
        } catch (err) {
          console.error('获取选区内容错误:', err);
          selectionState.text = '';
          selectionState.html = '';
        }
      } else {
        selectionState.text = '';
        selectionState.html = '';
        
        // 更新光标位置
        const rect = getCursorRect(range);
        if (rect) {
          selectionState.lastPosition = {
            x: rect.left,
            y: rect.top + (rect.height / 2)
          };
        }
      }
      
      // 如果启用了自动扩展选区，并且是用户发起的选择
      if (autoExpandSelection && selectionState.isUserInitiated && !selectionState.isCollapsed) {
        // 检测是否是双击或三击(由mouseEventHandler提供)
        if (e && e.clickCount) {
          if (e.clickCount === 2) {
            // 双击扩展到单词
            expandSelectionToWord();
          } else if (e.clickCount === 3) {
            // 三击扩展到段落
            expandSelectionToParagraph();
          }
        }
      }
      
      // 更新全局状态
      updateGlobalState();
      
      // 延迟派发选择变化事件以减少频繁触发
      if (selectionState.selectionChangeTimer) {
        clearTimeout(selectionState.selectionChangeTimer);
      }
      
      // 标记有待处理的选择变化
      selectionState.pendingSelectionChange = true;
      
      // 设置延迟触发
      selectionState.selectionChangeTimer = setTimeout(() => {
        if (selectionState.pendingSelectionChange) {
          // 派发选择变化事件
          dispatch('selectionchange', e || {}, {
            selection: { ...selectionState },
            range: selectionState.range,
            isCollapsed: selectionState.isCollapsed,
            text: selectionState.text,
            html: selectionState.html,
            cursorPosition: selectionState.lastPosition
          });
          
          selectionState.pendingSelectionChange = false;
        }
      }, selectionChangeThrottle);
    } catch (err) {
      console.error('处理选择事件错误:', err);
    }
  };
  
  /**
   * 检查选区是否在容器内
   * @param {Range} range - 范围对象
   * @param {HTMLElement} container - 容器元素
   * @returns {boolean} 是否在容器内
   */
  const isRangeInContainer = (range, container) => {
    if (!range || !container) return false;
    
    try {
      // 检查选区起始和结束节点是否在容器内
      const startInContainer = container.contains(range.startContainer);
      const endInContainer = container.contains(range.endContainer);
      
      return startInContainer && endInContainer;
    } catch (err) {
      console.error('检查范围是否在容器内错误:', err);
      return false;
    }
  };
  
  /**
   * 确定选择方向
   * @param {Selection} selection - 选择对象
   * @returns {string} 方向('forward'或'backward')
   */
  const determineSelectionDirection = (selection) => {
    if (!selection || selection.isCollapsed) return 'forward';
    
    try {
      // 检查锚点和焦点的位置
      const position = comparePositions(
        selection.anchorNode, 
        selection.anchorOffset,
        selection.focusNode,
        selection.focusOffset
      );
      
      return position > 0 ? 'backward' : 'forward';
    } catch (err) {
      console.error('确定选择方向错误:', err);
      return 'forward'; // 默认前向
    }
  };
  
  /**
   * 比较两个节点位置
   * @returns {number} 负数表示第一个在前，正数表示第二个在前，0表示相同
   */
  const comparePositions = (node1, offset1, node2, offset2) => {
    if (!node1 || !node2) return 0;
    
    // 创建范围并设置位置
    const range1 = document.createRange();
    const range2 = document.createRange();
    
    try {
      range1.setStart(node1, offset1);
      range2.setStart(node2, offset2);
      
      return range1.compareBoundaryPoints(Range.START_TO_START, range2);
    } catch (e) {
      console.error('比较位置错误:', e);
      return 0;
    }
  };
  
  /**
   * 获取光标矩形
   * @param {Range} range - 范围对象
   * @returns {DOMRect|null} 光标矩形
   */
  const getCursorRect = (range) => {
    if (!range) return null;
    
    try {
      // 确保范围已折叠（是光标）
      if (!range.collapsed) {
        range = range.cloneRange();
        range.collapse(true);
      }
      
      // 插入临时元素以获取更准确的位置
      const span = document.createElement('span');
      // 使用零宽空格，以免影响内容
      span.textContent = '\u200B';
      
      // 插入临时元素
      range.insertNode(span);
      
      // 获取临时元素位置
      const rect = span.getBoundingClientRect();
      
      // 移除临时元素，保持DOM纯净
      if (span.parentNode) {
        span.parentNode.removeChild(span);
      }
      
      // 如果获取到有效矩形，返回它
      if (rect && rect.width !== 0 && rect.height !== 0) {
        return rect;
      }
      
      // 回退方案：使用原始范围的客户端矩形
      const rects = range.getClientRects();
      if (rects.length > 0) {
        return rects[0];
      }
      
      return range.getBoundingClientRect();
    } catch (e) {
      console.error('获取光标矩形错误:', e);
      return null;
    }
  };
  
  /**
   * 扩展选区到单词边界
   */
  const expandSelectionToWord = () => {
    try {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      if (range.collapsed) return;
      
      // 拓展到单词边界
      const startNode = range.startContainer;
      let startOffset = range.startOffset;
      const endNode = range.endContainer;
      let endOffset = range.endOffset;
      
      // 只对文本节点进行处理
      if (startNode.nodeType === Node.TEXT_NODE) {
        const startText = startNode.textContent || '';
        // 向前查找单词边界
        while (startOffset > 0 && !/[\s\u00A0\u3000,.;:!?，。；：！？]/.test(startText[startOffset - 1])) {
          startOffset--;
        }
      }
      
      if (endNode.nodeType === Node.TEXT_NODE) {
        const endText = endNode.textContent || '';
        // 向后查找单词边界
        while (endOffset < endText.length && !/[\s\u00A0\u3000,.;:!?，。；：！？]/.test(endText[endOffset])) {
          endOffset++;
        }
      }
      
      // 创建新范围
      const newRange = document.createRange();
      newRange.setStart(startNode, startOffset);
      newRange.setEnd(endNode, endOffset);
      
      // 设置新选区
      selection.removeAllRanges();
      selection.addRange(newRange);
      
      // 更新选区状态
      selectionState.range = newRange.cloneRange();
      selectionState.startContainer = newRange.startContainer;
      selectionState.endContainer = newRange.endContainer;
      selectionState.anchorOffset = startOffset;
      selectionState.focusOffset = endOffset;
      
      // 更新选区内容
      const fragment = newRange.cloneContents();
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(fragment);
      selectionState.text = tempDiv.textContent || '';
      selectionState.html = tempDiv.innerHTML;
    } catch (err) {
      console.error('扩展到单词边界错误:', err);
    }
  };
  
  /**
   * 扩展选区到段落边界
   */
  const expandSelectionToParagraph = () => {
    try {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      if (range.collapsed) return;
      
      // 查找包含段落的元素
      let startNode = range.startContainer;
      let endNode = range.endContainer;
      let startElement = startNode;
      let endElement = endNode;
      
      // 找到起始段落节点
      if (startNode.nodeType === Node.TEXT_NODE) {
        startElement = startNode.parentNode;
      }
      
      while (startElement && 
             !['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE'].includes(startElement.nodeName)) {
        startElement = startElement.parentNode;
      }
      
      // 找到结束段落节点
      if (endNode.nodeType === Node.TEXT_NODE) {
        endElement = endNode.parentNode;
      }
      
      while (endElement && 
             !['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE'].includes(endElement.nodeName)) {
        endElement = endElement.parentNode;
      }
      
      // 创建新范围
      const newRange = document.createRange();
      
      // 如果找到了段落节点，设置范围为整个段落
      if (startElement) {
        newRange.setStartBefore(startElement);
      } else {
        newRange.setStart(range.startContainer, 0);
      }
      
      if (endElement) {
        newRange.setEndAfter(endElement);
      } else {
        const container = endNode;
        newRange.setEnd(container, container.childNodes.length || container.length || 0);
      }
      
      // 设置新选区
      selection.removeAllRanges();
      selection.addRange(newRange);
      
      // 更新选区状态
      selectionState.range = newRange.cloneRange();
      selectionState.startContainer = newRange.startContainer;
      selectionState.endContainer = newRange.endContainer;
      
      // 更新选区内容
      const fragment = newRange.cloneContents();
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(fragment);
      selectionState.text = tempDiv.textContent || '';
      selectionState.html = tempDiv.innerHTML;
    } catch (err) {
      console.error('扩展到段落边界错误:', err);
    }
  };
  
  /**
   * 绑定选择事件
   * @param {HTMLElement} container - 容器元素
   */
  const bindEvents = (container) => {
    if (!container) return;
    
    try {
      // 本地select事件
      const selectHandler = (e) => handleSelection(e);
      container.addEventListener('select', selectHandler);
      boundHandlers.set('select', {
        element: container,
        type: 'select',
        handler: selectHandler 
      });
      
      // 全局selectionchange事件
      const selectionChangeHandler = (e) => {
        // 只处理影响当前容器的选择变化
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const isContainerSelection = isRangeInContainer(range, container);
        
        if (isContainerSelection) {
          handleSelection(e);
        }
      };
      
      document.addEventListener('selectionchange', debounce(selectionChangeHandler));
      boundHandlers.set('document.selectionchange', {
        element: document,
        type: 'selectionchange',
        handler: selectionChangeHandler 
      });
      
      // 鼠标操作可能引起选择变化
      const mouseUpHandler = (e) => {
        // 鼠标释放后可能有新的选区
        setTimeout(() => handleSelection(e), 0);
      };
      
      container.addEventListener('mouseup', mouseUpHandler);
      boundHandlers.set('mouseup.selection', { 
        element: container, 
        type: 'mouseup', 
        handler: mouseUpHandler 
      });
      
      // 键盘操作也可能引起选择变化
      const keyUpHandler = (e) => {
        // 方向键、Home、End等可能改变选区
        if ([
          'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
          'Home', 'End', 'PageUp', 'PageDown'
        ].includes(e.key)) {
          setTimeout(() => handleSelection(e), 0);
        }
      };
      
      container.addEventListener('keyup', keyUpHandler);
      boundHandlers.set('keyup.selection', { 
        element: container, 
        type: 'keyup', 
        handler: keyUpHandler 
      });
      
      // 如果需要在失焦时保存选区
      if (preserveSelectionOnBlur) {
        const blurHandler = () => {
          if (selectionState.isActive && selectionState.range) {
            selectionState.preservedRange = selectionState.range.cloneRange();
          }
        };
        
        container.addEventListener('blur', blurHandler);
        boundHandlers.set('blur.selection', { 
          element: container,
          type: 'blur', 
          handler: blurHandler 
        });
        
        // 聚焦时恢复选区
        const focusHandler = () => {
          if (selectionState.preservedRange) {
            try {
              const selection = window.getSelection();
              selection.removeAllRanges();
              selection.addRange(selectionState.preservedRange);
              handleSelection();
            } catch (err) {
              console.error('恢复选区错误:', err);
              // 尝试重新创建一个新范围作为恢复措施
              try {
                const container = getContainer();
                if (container) {
                  const range = document.createRange();
                  range.selectNodeContents(container);
                  range.collapse(true); // 折叠到开始
                  selection.removeAllRanges();
                  selection.addRange(range);
                  handleSelection();
                }
              } catch (e) {
                console.error('选区恢复失败，无法创建新范围:', e);
              }
            }
          }
        };
        
        container.addEventListener('focus', focusHandler);
        boundHandlers.set('focus.selection', { 
          element: container, 
          type: 'focus', 
          handler: focusHandler 
        });
      }
      
      // 如果需要抑制原生选区
      if (suppressNativeSelection) {
        const suppressSelectionHandler = (e) => {
          // 这里可以实现自定义的选区效果
          e.preventDefault();
        };
        
        container.addEventListener('selectstart', suppressSelectionHandler);
        boundHandlers.set('selectstart', { 
          element: container,
          type: 'selectstart', 
          handler: suppressSelectionHandler 
        });
      }
      
      // 监听IME输入结束，重新评估选区
      const compositionEndHandler = () => {
        setTimeout(() => handleSelection(), 0);
      };
      
      container.addEventListener('compositionend', compositionEndHandler);
      boundHandlers.set('compositionend.selection', {
        element: container,
        type: 'compositionend',
        handler: compositionEndHandler
      });
    } catch (err) {
      console.error('绑定选择事件错误:', err);
    }
  };
  
  /**
   * 解绑选择事件
   */
  const unbindEvents = () => {
    boundHandlers.forEach(({ element, type, handler }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(type, handler);
      }
    });
    
    boundHandlers.clear();
  };
  
  /**
   * 设置选区
   * @param {Object} options - 选区选项
   */
  const setSelection = (options = {}) => {
    const container = getContainer();
    if (!container) return false;
    
    try {
      const selection = window.getSelection();
      let range;
      
      if (options.range) {
        // 使用提供的范围
        range = options.range;
      } else if (options.node) {
        // 使用提供的节点
        range = document.createRange();
        
        if (options.start !== undefined && options.end !== undefined) {
          // 设置起始和结束偏移
          range.setStart(options.node, options.start);
          range.setEnd(options.node, options.end);
        } else {
          // 选择整个节点
          range.selectNodeContents(options.node);
          
          if (options.collapse) {
            range.collapse(options.collapseToStart !== false);
          }
        }
      } else if (options.startNode && options.endNode) {
        // 使用起始和结束节点
        range = document.createRange();
        range.setStart(options.startNode, options.startOffset || 0);
        range.setEnd(options.endNode, options.endOffset || 0);
      } else {
        // 没有足够信息设置选区
        return false;
      }
      
      // 设置选区
      selection.removeAllRanges();
      selection.addRange(range);
      
      // 更新选区状态
      handleSelection();
      
      return true;
    } catch (err) {
      console.error('设置选区错误:', err);
      return false;
    }
  };
  
  /**
   * 获取当前选区内容
   * @returns {Object} 选区内容
   */
  const getSelectionContent = () => {
    return {
      text: selectionState.text,
      html: selectionState.html,
      range: selectionState.range,
      isCollapsed: selectionState.isCollapsed
    };
  };
  
  /**
   * 获取选区状态
   * @returns {Object} 选区状态
   */
  const getSelectionState = () => {
    return { ...selectionState };
  };
  
  /**
   * 清空选区
   */
  const clearSelection = () => {
    const selection = window.getSelection();
    selection.removeAllRanges();
    resetSelectionState();
  };
  
  /**
   * 选择全部内容
   */
  const selectAll = () => {
    const container = getContainer();
    if (!container) return false;
    
    try {
      const range = document.createRange();
      range.selectNodeContents(container);
      
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      
      // 更新选区状态
      handleSelection();
      
      return true;
    } catch (err) {
      console.error('全选错误:', err);
      return false;
    }
  };
  
  /**
   * 检查选区是否在指定元素内
   * @param {HTMLElement} element - 要检查的元素
   * @returns {boolean} 是否在元素内
   */
  const isSelectionInElement = (element) => {
    if (!selectionState.isActive || !selectionState.range) return false;
    
    return isRangeInContainer(selectionState.range, element);
  };
  
  /**
   * 在当前位置插入内容
   * @param {Node|string} content - 要插入的内容
   * @returns {boolean} 是否成功插入
   */
  const insertAtCursor = (content) => {
    if (!selectionState.isActive) return false;
    
    try {
      const selection = window.getSelection();
      if (!selection.rangeCount) return false;
      
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      if (typeof content === 'string') {
        // 插入文本内容
        const textNode = document.createTextNode(content);
        range.insertNode(textNode);
        
        // 移动光标到插入内容之后
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
      } else if (content instanceof Node) {
        // 插入DOM节点
        range.insertNode(content);
        
        // 移动光标到插入内容之后
        range.setStartAfter(content);
        range.setEndAfter(content);
      } else {
        return false;
      }
      
      // 更新选区
      selection.removeAllRanges();
      selection.addRange(range);
      
      // 触发选区变化
      handleSelection();
      
      // 派发内容变化事件
      dispatch('contentchange', {}, {
        source: 'selection.insert',
        selection: { ...selectionState }
      });
      
      return true;
    } catch (err) {
      console.error('插入内容错误:', err);
      return false;
    }
  };
  
  /**
   * 替换选区内容
   * @param {Node|string} content - 要替换的内容
   * @returns {boolean} 是否成功替换
   */
  const replaceSelection = (content) => {
    if (!selectionState.isActive) return false;
    
    try {
      // 如果选区已折叠，无需替换
      if (selectionState.isCollapsed) {
        return insertAtCursor(content);
      }
      
      const selection = window.getSelection();
      if (!selection.rangeCount) return false;
      
      const range = selection.getRangeAt(0);
      
      // 保存选区信息，用于恢复
      const container = range.commonAncestorContainer;
      
      // 删除选中内容
      range.deleteContents();
      
      if (typeof content === 'string') {
        // 插入文本内容
        const textNode = document.createTextNode(content);
        range.insertNode(textNode);
        
        // 移动光标到插入内容之后
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
      } else if (content instanceof Node) {
        // 插入DOM节点
        range.insertNode(content);
        
        // 移动光标到插入内容之后
        range.setStartAfter(content);
        range.setEndAfter(content);
      } else {
        return false;
      }
      
      // 更新选区
      selection.removeAllRanges();
      selection.addRange(range);
      
      // 触发选区变化
      handleSelection();
      
      // 派发内容变化事件
      dispatch('contentchange', {}, {
        source: 'selection.replace',
        selection: { ...selectionState }
      });
      
      return true;
    } catch (err) {
      console.error('替换选区内容错误:', err);
      return false;
    }
  };
  
  /**
   * 设置光标位置
   * @param {Node} node - 要设置光标的节点
   * @param {number} offset - 偏移量
   */
  const setCursor = (node, offset = 0) => {
    try {
      const range = document.createRange();
      range.setStart(node, offset);
      range.collapse(true);
      
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      
      // 触发选区变化
      handleSelection();
      
      return true;
    } catch (err) {
      console.error('设置光标错误:', err);
      return false;
    }
  };
  
  /**
   * 清理资源
   */
  const cleanup = () => {
    try {
      // 清除定时器
      if (selectionState.selectionChangeTimer) {
        clearTimeout(selectionState.selectionChangeTimer);
      }
      
      unbindEvents();
      resetSelectionState();
    } catch (err) {
      console.error('清理选区处理器资源错误:', err);
    }
  };
  
  // 返回公共API
  return {
    bindEvents,
    unbindEvents,
    cleanup,
    handleSelection,
    setSelection,
    clearSelection,
    selectAll,
    getSelectionContent,
    getSelectionState,
    isSelectionInElement,
    insertAtCursor,
    replaceSelection,
    setCursor,
    expandSelectionToWord,
    expandSelectionToParagraph,
    boundHandlers
  };
}; 