/**
 * 编辑器事件处理系统 (Editor Event Management System)
 * 
 * @module useEvent
 * @description 
 * 这是一个完整的富文本编辑环境事件处理系统，专为高交互性文本编辑器设计，
 * 具有清晰架构、高性能、良好兼容性和优秀可扩展性。
 * 
 * ◆ 设计目标 ◆
 * -------------
 * 1. 统一事件处理：接管DOM元素的所有输入事件，提供统一的事件处理流程
 * 2. 隔离DOM依赖：创建抽象层使业务逻辑与DOM事件解耦
 * 3. 多设备适配：同时支持键盘、鼠标、触摸屏和各种输入法（IME）
 * 4. 高性能：事件节流、批处理、合并优化，减少不必要的重绘
 * 5. 错误容忍：各子模块独立运行，单一模块故障不影响整体系统
 * 6. 易于扩展：模块化设计，支持添加自定义事件处理器
 * 
 * ◆ 核心架构 ◆
 * -------------
 * 采用多层次设计模式：
 * 
 * 1. 核心层：
 *    - eventDispatcher: 事件调度中心，负责路由和分发事件
 *    - eventNormalizer: 事件标准化器，统一不同来源的事件格式
 *    - eventQueueProcessor: 事件队列处理器，提供批处理和优先级管理
 * 
 * 2. 功能层：
 *    - keyboardEventHandler: 键盘事件处理
 *    - mouseEventHandler: 鼠标事件处理
 *    - touchEventHandler: 触摸事件处理
 *    - selectionHandler: 文本选择处理
 *    - imeCompositionHandler: 输入法组合文本处理
 * 
 * 3. 辅助层：
 *    - keyboardShortcutManager: 快捷键管理
 *    - clipboardHandler: 剪贴板操作
 *    - dragDropHandler: 拖放处理
 *    - focusManager: 焦点管理
 *    - accessibilityManager: 辅助功能支持
 * 
 * ◆ 事件流程 ◆
 * -------------
 * 1. 原生DOM事件 → 
 * 2. 事件标准化 → 
 * 3. 事件队列 → 
 * 4. 优先级排序 → 
 * 5. 批量处理 → 
 * 6. 分发到处理器 → 
 * 7. 触发自定义事件
 * 
 * ◆ 性能优化 ◆
 * -------------
 * - 事件批处理：减少重绘和重排
 * - 事件合并：合并同类型连续事件（如mousemove）
 * - 节流与防抖：高频事件优化
 * - 延迟初始化：按需创建组件
 * - 选择性事件绑定：只绑定必要的事件
 * 
 * ◆ 兼容性处理 ◆
 * -------------
 * - 标准化不同浏览器的事件差异
 * - 处理移动设备和桌面设备的输入差异
 * - 支持不同输入法和语言环境
 * 
 * ◆ 使用方式 ◆
 * -------------
 * ```js
 * // 创建事件管理器
 * const eventManager = useEvent({
 *   containerRef: myEditorRef,
 *   preventDefault: true,
 *   touchEnabled: true,
 *   compositionEnabled: true  // 支持中文等IME输入
 * });
 * 
 * // 初始化
 * onMounted(() => {
 *   eventManager.init();
 * });
 * 
 * // 注册选区变化事件处理
 * eventManager.onCustomEvent('customSelectionChange', (e) => {
 *   console.log('选区变化:', e.selection);
 * });
 * 
 * // 注册内容变化事件处理
 * eventManager.onCustomEvent('customContentChange', (e) => {
 *   console.log('内容变化:', e.source);
 *   saveContent();
 * });
 * 
 * // 注册键盘快捷键
 * eventManager.registerShortcut('ctrl+b', () => {
 *   toggleBold();
 * });
 * 
 * // 清理资源
 * onUnmounted(() => {
 *   eventManager.cleanup();
 * });
 * ```
 * 
 * ◆ 许可协议 ◆
 * -------------
 * 本模块采用GNU Affero通用公共许可证v3.0 (AGPL-3.0)发布
 * 
 * 版权所有 (C) 2023 思源系统团队
 * 
 * 本程序是自由软件：您可以根据GNU Affero通用公共许可证的条款，
 * 即自由软件基金会发布的第3版许可证或（您可选的）任何更新版本，
 * 重新分发和/或修改它。
 * 
 * 本程序的分发是希望它会有用，但没有任何保证；甚至没有适销性或
 * 特定用途的暗示保证。更多详情请参阅GNU Affero通用公共许可证。
 * 
 * 您应该已经收到了一份GNU Affero通用公共许可证的副本。如果没有，
 * 请访问<https://www.gnu.org/licenses/>
 * 
 * 重要附加条款：
 * - 如果您修改本程序，并通过网络提供与修改版本的交互，必须确保
 *   所有用户能够获取修改版本的完整源代码
 * - 对源代码的任何修改都必须明确标注，以区分于原始代码
 * - 使用本模块的衍生作品在用户界面中应注明使用了本事件处理系统
 * 
 * @author leolee9086
 * @version 1.0.0
 * @license AGPL-3.0
 */
import { ref, onMounted, onUnmounted, watch } from '../../../../static/vue.esm-browser.js';
import { createGestureRecognizer } from './gestureRecognizer.js';
import { createKeyboardShortcutManager } from './keyboardShortcutManager.js';
import { createImeCompositionHandler } from './imeCompositionHandler.js';
import { createEventNormalizer } from './eventNormalizer.js';
import { createEventQueueProcessor } from './eventQueueProcessor.js';
import { createClipboardHandler } from './clipboardHandler.js';
import { createFocusManager } from './focusManager.js';
import { createMutationObserver } from './mutationObserver.js';
import { createDragDropHandler } from './dragDropHandler.js';
import { createMouseEventHandler } from './mouseEventHandler.js';
import { createTouchEventHandler } from './touchEventHandler.js';
import { createSelectionHandler } from './selectionHandler.js';
import { createAccessibilityManager } from './accessibilityManager.js';
import { createEventDispatcher } from './eventDispatcher.js';
import { createKeyboardEventHandler } from './keyboardEventHandler.js';
import { 
  debounce, 
  throttle, 
  detectPassiveEventSupport,
  safeExecute,
  readonly
} from './utilityFunctions.js';

/**
 * 创建事件处理系统
 * 
 * @typedef {Object} EventOptions
 * @property {Ref<HTMLElement>} [containerRef=null] - Vue引用，指向容器元素
 * @property {string} [containerSelector=null] - CSS选择器，用于选择容器元素
 * @property {Object} [cursorManager=null] - 光标管理器引用
 * @property {boolean} [enabled=true] - 是否启用事件接管
 * @property {boolean} [preventDefault=true] - 是否阻止默认行为
 * @property {boolean} [suppressNativeSelection=false] - 是否阻止原生选区
 * @property {number} [debounceTime=10] - 事件防抖时间 (ms)
 * @property {number} [throttleTime=16] - 事件节流时间 (16ms ≈ 60fps)
 * @property {boolean} [touchEnabled=true] - 是否启用触摸支持
 * @property {boolean} [passiveEvents=true] - 对支持的事件使用passive选项提高滚动性能
 * @property {boolean} [dragDropEnabled=true] - 是否启用拖放支持
 * @property {boolean} [clipboardInterception=true] - 是否接管剪贴板事件
 * @property {boolean} [keyboardShortcuts=true] - 是否启用键盘快捷键
 * @property {boolean} [focusTracking=true] - 是否跟踪焦点状态
 * @property {boolean} [compositionEnabled=true] - 启用IME组合文本支持
 * @property {boolean} [autoFocus=false] - 是否自动聚焦
 * @property {boolean} [rightClickEnabled=true] - 是否启用右键菜单
 * @property {number} [doubleClickThreshold=300] - 双击检测阈值(ms)
 * @property {boolean} [autoExpandSelection=true] - 自动扩展选区到单词或段落
 * @property {boolean} [preserveSelectionOnBlur=true] - 失焦时保留选区状态
 * @property {boolean} [allowFileDrop=true] - 是否允许文件拖放
 * @property {boolean} [allowExternalDrop=true] - 是否允许外部内容拖放
 * @property {string[]} [customDropTypes=[]] - 自定义拖放类型
 * @property {number} [longPressThreshold=500] - 长按识别阈值(ms)
 * @property {number} [doubleTapThreshold=300] - 双击触摸识别阈值(ms)
 * @property {boolean} [announceChanges=true] - 是否向屏幕阅读器通告变化
 * @property {boolean} [screenReaderSupport=true] - 是否启用屏幕阅读器支持
 * @property {boolean} [keyboardNavigation=true] - 是否启用键盘导航
 * @property {boolean} [highContrastSupport=false] - 是否启用高对比度支持
 * @property {boolean} [reducedMotion=false] - 是否启用减弱动效模式
 * @property {string} [ariaLabelledBy=null] - aria-labelledby属性值
 * @property {string} [ariaDescribedBy=null] - aria-describedby属性值
 * @property {string} [ariaRole='textbox'] - ARIA角色
 * 
 * @typedef {Object} EventHandler
 * @property {Function} handler - 事件处理函数
 * @property {boolean} [capture=false] - 是否在捕获阶段处理
 * @property {boolean} [once=false] - 是否只处理一次
 * @property {boolean} [passive=false] - 是否为被动事件处理器
 * 
 * @typedef {Object} EventState
 * @property {boolean} isFocused - 是否有焦点
 * @property {boolean} isComposing - 是否正在输入法组合状态
 * @property {string|null} lastKeyPressed - 最后按下的键
 * @property {{x: number, y: number}} lastMousePosition - 最后鼠标位置
 * @property {boolean} mouseDown - 鼠标是否按下
 * @property {boolean} touchActive - 触摸是否激活
 * @property {boolean} selectionActive - 选择是否激活
 * @property {number} eventCount - 事件计数
 * @property {number} lastEventTime - 最后事件时间
 * @property {number} lastSelectionTime - 最后选择时间
 * @property {HTMLElement|null} container - 容器元素引用
 * @property {Map<string, EventHandler>} eventHandlers - 事件处理器映射
 * @property {Map<string, Function>} shortcutHandlers - 快捷键处理器
 * @property {Map<string, Function>} customHandlers - 自定义事件处理器
 * @property {MutationObserver|null} mutationObserver - DOM变异观察器
 * @property {string} pendingComposition - 待处理的输入法组合文本
 * @property {boolean} isAutoCorrect - 是否处于自动更正状态
 * 
 * @typedef {Object} EventManagerAPI
 * @property {Object} core - 核心功能
 * @property {Function} core.init - 初始化事件系统
 * @property {Function} core.cleanup - 清理事件系统
 * @property {Function} core.dispatch - 分发事件
 * @property {Function} core.getState - 获取事件状态
 * @property {Function} core.addEventListener - 添加事件监听器
 * @property {Function} core.removeEventListener - 移除事件监听器
 * @property {Function} core.onCustomEvent - 监听自定义事件
 * @property {Object} queue - 队列相关功能
 * @property {Function} queue.queueEvent - 将事件添加到队列
 * @property {Function} queue.flush - 刷新事件队列
 * @property {Function} queue.getQueueInfo - 获取队列信息
 * @property {Function} queue.setPriority - 设置事件优先级
 * @property {Function} queue.setMergeable - 设置事件是否可合并
 * @property {Object} keyboard - 键盘相关功能
 * @property {Function} keyboard.registerShortcut - 注册键盘快捷键
 * @property {Function} keyboard.simulateKeyEvent - 模拟键盘事件
 * @property {Function} keyboard.getState - 获取键盘状态
 * @property {Function} keyboard.getKeyCodes - 获取键码映射
 * @property {Object} clipboard - 剪贴板相关功能
 * @property {Function} clipboard.copy - 复制内容
 * @property {Function} clipboard.paste - 粘贴内容
 * @property {Function} clipboard.cut - 剪切内容
 * @property {Object} focus - 焦点相关功能
 * @property {Function} focus.focus - 聚焦容器
 * @property {Function} focus.blur - 使容器失焦
 * @property {Function} focus.hasFocus - 检查容器是否有焦点
 * @property {Object} mutation - DOM变化相关功能
 * @property {Function} mutation.triggerContentChange - 触发内容变化事件
 * @property {Function} mutation.pauseObserving - 暂停观察DOM变化
 * @property {Function} mutation.resumeObserving - 恢复观察DOM变化
 * @property {Function} mutation.getStatus - 获取观察器状态
 * @property {Object} dragDrop - 拖放相关功能
 * @property {Function} dragDrop.simulateDrop - 模拟拖放
 * @property {Function} dragDrop.getState - 获取拖放状态
 * @property {Object} mouse - 鼠标相关功能
 * @property {Function} mouse.simulateClick - 模拟点击
 * @property {Function} mouse.getState - 获取鼠标状态
 * @property {Function} mouse.getVelocity - 获取鼠标速度
 * @property {Object} touch - 触摸相关功能
 * @property {Function} touch.simulateTouch - 模拟触摸
 * @property {Function} touch.getState - 获取触摸状态
 * @property {Function} touch.isEnabled - 检查触摸是否启用
 * @property {Object} selection - 选择相关功能
 * @property {Function} selection.getContent - 获取选择内容
 * @property {Function} selection.getState - 获取选择状态
 * @property {Function} selection.setSelection - 设置选择区域
 * @property {Function} selection.clearSelection - 清除选择
 * @property {Function} selection.selectAll - 全选
 * @property {Function} selection.insertAtCursor - 在光标处插入内容
 * @property {Function} selection.replaceSelection - 替换选中内容
 * @property {Function} selection.setCursor - 设置光标位置
 * @property {Function} selection.expandToWord - 扩展选择到单词
 * @property {Function} selection.expandToParagraph - 扩展选择到段落
 * @property {Object} accessibility - 辅助功能
 * @property {Function} accessibility.announce - 向屏幕阅读器宣告信息
 * @property {Function} accessibility.setAriaAttributes - 设置ARIA属性
 * @property {Function} accessibility.enableKeyboardTrap - 启用键盘陷阱
 * @property {Function} accessibility.disableKeyboardTrap - 禁用键盘陷阱
 * @property {Function} accessibility.getState - 获取辅助功能状态
 * @property {Object} metrics - 统计和错误处理
 * @property {Function} metrics.getEventStats - 获取事件统计
 * @property {Function} metrics.getErrorMetrics - 获取错误统计
 * @property {Function} metrics.resetErrorMetrics - 重置错误统计
 * @property {Object} factory - 工厂方法
 * @property {Function} factory.createContextDispatcher - 创建上下文分发器
 * @property {Object} ime - 输入法相关功能
 * @property {Function} ime.getState - 获取输入法状态
 * @property {Function} ime.abortComposition - 中止输入法组合
 * @property {Function} ime.simulateComposition - 模拟输入法组合
 * 
 * @param {EventOptions} options - 事件系统配置选项
 * @returns {EventManagerAPI} 事件管理器API
 */
export const useEvent = (options = {}) => {
  // 实例级变量（而不是模块级）
  let eventDispatcher;
  let eventNormalizer;

  const {
    containerRef = null,              // 容器引用
    containerSelector = null,         // 容器选择器
    cursorManager = null,             // 光标管理器引用
    enabled = true,                   // 是否启用事件接管
    preventDefault = true,            // 是否阻止默认行为
    suppressNativeSelection = false,  // 是否阻止原生选区
    debounceTime = 10,                // 事件防抖时间 (ms)
    throttleTime = 16,                // 事件节流时间 (16ms ≈ 60fps)
    touchEnabled = true,              // 是否启用触摸支持
    passiveEvents = true,             // 对支持的事件使用passive选项提高滚动性能
    dragDropEnabled = true,           // 是否启用拖放支持
    clipboardInterception = true,     // 是否接管剪贴板事件
    keyboardShortcuts = true,         // 是否启用键盘快捷键
    focusTracking = true,             // 是否跟踪焦点状态
    compositionEnabled = true,        // 启用IME组合文本支持（中文、日文等输入法）
    autoFocus = false,                // 是否自动聚焦
    rightClickEnabled = true,         // 是否启用右键菜单
    doubleClickThreshold = 300,       // 双击检测阈值(ms)
    autoExpandSelection = true,        // 自动扩展选区到单词或段落
    preserveSelectionOnBlur = true,    // 失焦时保留选区状态
    allowFileDrop = true,            // 是否允许文件拖放
    allowExternalDrop = true,         // 是否允许外部内容拖放
    customDropTypes = [],            // 自定义拖放类型
    longPressThreshold = 500,         // 长按识别阈值(ms)
    doubleTapThreshold = 300,         // 双击触摸识别阈值(ms)
    announceChanges = true,           // 是否向屏幕阅读器通告变化
    screenReaderSupport = true,       // 是否启用屏幕阅读器支持
    keyboardNavigation = true,        // 是否启用键盘导航
    highContrastSupport = false,      // 是否启用高对比度支持
    reducedMotion = false,           // 是否启用减弱动效模式
    ariaLabelledBy = null,           // aria-labelledby属性值
    ariaDescribedBy = null,          // aria-describedby属性值
    ariaRole = 'textbox',           // ARIA角色
  } = options;

  // 状态管理
  const eventState = ref({
    isFocused: false,                 // 是否有焦点
    isComposing: false,               // 是否正在输入法组合状态
    lastKeyPressed: null,             // 最后按下的键
    lastMousePosition: { x: 0, y: 0 }, // 最后鼠标位置
    mouseDown: false,                 // 鼠标是否按下
    touchActive: false,               // 触摸是否激活
    selectionActive: false,           // 选择是否激活
    eventCount: 0,                    // 事件计数
    lastEventTime: 0,                 // 最后事件时间
    lastSelectionTime: 0,             // 最后选择时间
    container: null,                  // 容器元素引用
    eventHandlers: new Map(),         // 事件处理器映射
    shortcutHandlers: new Map(),      // 快捷键处理器
    customHandlers: new Map(),        // 自定义事件处理器
    mutationObserver: null,           // DOM变异观察器
    pendingComposition: '',           // 待处理的输入法组合文本
    isAutoCorrect: false,             // 是否处于自动更正状态
  });

  // 事件队列和计时器引用
  let eventQueue = [];
  let debounceTimer = null;
  let throttleTimer = null;
  let lastThrottleTime = 0;

  // 自定义事件类型
  const CustomEvents = {
    SELECTION_CHANGE: 'customSelectionChange',
    CONTENT_CHANGE: 'customContentChange',
    CURSOR_MOVE: 'customCursorMove',
    FOCUS_CHANGE: 'customFocusChange',
    TEXT_INPUT: 'customTextInput',
    KEY_COMMAND: 'customKeyCommand',
    COMPOSITION_UPDATE: 'customCompositionUpdate',
  };

  // 存储原始事件处理函数的引用，便于解绑
  const boundHandlers = new Map();

  /**
   * 创建模块上下文分发器
   * @param {string} moduleName - 模块名称
   * @returns {Function} 带有模块上下文的dispatch函数
   */
  const createModuleDispatcher = (moduleName) => {
    return (type, event, data = {}) => {
      return dispatch(type, event, {
        ...data,
        sourceModule: moduleName
      });
    };
  };

  /**
   * 执行系统自检，确保核心组件正确实现
   * @returns {boolean} 自检是否通过
   */
  const performSelfCheck = () => {
    const errors = [];
    const warnings = [];
    
    // 检查事件标准化器
    const normalizerRequiredMethods = ['normalizeEvent', 'createSyntheticEvent'];
    const missingNormalizerMethods = normalizerRequiredMethods.filter(
      method => typeof eventNormalizer[method] !== 'function'
    );
    
    if (missingNormalizerMethods.length > 0) {
      errors.push(`事件标准化器缺少必要方法: ${missingNormalizerMethods.join(', ')}`);
    }
    
    // 检查事件调度器
    const dispatcherRequiredMethods = [
      'addEventListener', 'removeEventListener', 'dispatch', 
      'emitEvent', 'cleanup', 'getStats'
    ];
    const missingDispatcherMethods = dispatcherRequiredMethods.filter(
      method => typeof eventDispatcher[method] !== 'function'
    );
    
    if (missingDispatcherMethods.length > 0) {
      errors.push(`事件调度器缺少必要方法: ${missingDispatcherMethods.join(', ')}`);
    }
    
    // 检查容器状态
    const container = getContainer();
    if (!container) {
      errors.push('无法获取有效的容器元素');
    } else {
      // 检查容器特性
      if (!(container instanceof HTMLElement)) {
        errors.push('容器不是有效的HTML元素');
      }
      
      // 检查容器可见性
      const { offsetWidth, offsetHeight } = container;
      if (offsetWidth === 0 || offsetHeight === 0) {
        warnings.push('容器元素尺寸为零，可能不可见');
      }
      
      // 检查容器可聚焦性
      if (!container.tabIndex && container.tabIndex !== 0) {
        warnings.push('容器元素可能不可聚焦，建议设置tabIndex属性');
      }
    }
    
    // 检查浏览器兼容性
    const compatibilityIssues = checkBrowserCompatibility();
    if (compatibilityIssues.length > 0) {
      warnings.push(...compatibilityIssues);
    }
    
    // 记录所有错误和警告
    if (errors.length > 0) {
      console.error('系统自检发现严重问题:', errors);
    }
    
    if (warnings.length > 0) {
      console.warn('系统自检发现潜在问题:', warnings);
    }
    
    // 如果有严重错误，返回false
    return errors.length === 0;
  };

  /**
   * 检测浏览器对事件特性的支持
   * @returns {string[]} 发现的兼容性问题列表
   */
  const checkBrowserCompatibility = () => {
    const issues = [];
    
    // 1. 检测 passive event 支持
    const passiveSupported = detectPassiveEventSupport();
    if (!passiveSupported && options.passiveEvents) {
      issues.push('当前浏览器不支持passive事件选项，但配置启用了该特性');
    }
    
    // 2. 检测 Pointer Events 支持
    const hasPointerEvents = 'PointerEvent' in window;
    if (!hasPointerEvents && touchEnabled) {
      issues.push('当前浏览器不支持PointerEvent API，将使用兼容模式');
    }
    
    // 3. 检测触摸屏和多点触控支持
    const isTouchScreen = 'ontouchstart' in window || 
      (navigator.maxTouchPoints > 0) || 
      (navigator.msMaxTouchPoints > 0);
    if (!isTouchScreen && touchEnabled) {
      issues.push('当前设备可能不支持触摸，但触摸事件处理已启用');
    }
    
    // 4. 检测剪贴板API支持
    const hasClipboardAPI = 'clipboard' in navigator;
    if (!hasClipboardAPI && clipboardInterception) {
      issues.push('当前浏览器不支持Clipboard API，将使用传统方式处理');
    }
    
    // 5. 检测Web Animation API支持
    const hasWebAnimations = 'animate' in document.createElement('div');
    if (!hasWebAnimations) {
      issues.push('当前浏览器不支持Web Animations API，动画效果可能受限');
    }
    
    // 6. 检测IME支持
    const isIMESupported = 'CompositionEvent' in window;
    if (!isIMESupported && compositionEnabled) {
      issues.push('当前浏览器可能不支持输入法编辑器(IME)事件');
    }
    
    // 7. 检测Safari特定问题
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
      issues.push('检测到Safari浏览器，IME事件和触摸事件将使用特殊处理方式');
    }
    
    return issues;
  };

  /**
   * 获取容器元素
   * @returns {HTMLElement|null} 容器元素
   * @throws {Error} 如果找不到容器且已进行多次尝试
   */
  const getContainer = () => {
    try {
      // 已缓存的容器，直接返回
      if (eventState.value.container && eventState.value.container.isConnected) {
        return eventState.value.container;
      }
      
      // 通过ref获取
    if (containerRef?.value) {
        const element = containerRef.value;
        if (element && element.nodeType === 1) {
          eventState.value.container = element;
          return element;
        }
      }
      
      // 通过选择器获取
    if (containerSelector) {
        try {
      const container = document.querySelector(containerSelector);
      if (container) {
        eventState.value.container = container;
        return container;
          }
        } catch (selectorError) {
          console.warn(`选择器查询错误: ${selectorError.message}`);
      }
    }
    
      // 如果仍然找不到容器
    return null;
    } catch (error) {
      console.error(`获取容器时发生错误: ${error.message}`);
      return null;
    }
  };

  // 先创建事件标准化器
  eventNormalizer = createEventNormalizer({
    getContainer,
    updateState: (newState) => {
      // 更新事件状态中的值
      if (newState.lastMousePosition) {
        eventState.value.lastMousePosition = newState.lastMousePosition;
      }
      if (newState.lastKeyPressed) {
        eventState.value.lastKeyPressed = newState.lastKeyPressed;
      }
    }
  });

  // 然后创建事件调度器
  eventDispatcher = createEventDispatcher({
    eventNormalizer,
    cursorManager,
    getState: () => eventState.value,
    updateState: (newState) => {
      if ('eventCount' in newState) {
        eventState.value.eventCount = newState.eventCount;
      }
      if ('lastEventTime' in newState) {
        eventState.value.lastEventTime = newState.lastEventTime;
      }
    },
    shouldPreventDefault: preventDefault,
    errorHandler: (message, error) => console.error(message, error),
    customEventMap: CustomEvents
  });

  // 从调度器获取方法
  const { 
    addEventListener, 
    removeEventListener, 
    onCustomEvent, 
    dispatch, 
    emitEvent,
    getErrorMetrics,
    resetErrorMetrics
  } = eventDispatcher;

  // 改用模块上下文分发器
  const mouseDispatcher = createModuleDispatcher('mouse');
  const keyboardDispatcher = createModuleDispatcher('keyboard');
  const focusDispatcher = createModuleDispatcher('focus');
  const selectionDispatcher = createModuleDispatcher('selection');
  const clipboardDispatcher = createModuleDispatcher('clipboard');
  const dragDropDispatcher = createModuleDispatcher('dragdrop');
  const gestureDispatcher = createModuleDispatcher('gesture');
  const mutationDispatcher = createModuleDispatcher('mutation');
  const imeDispatcher = createModuleDispatcher('ime');
  const a11yDispatcher = createModuleDispatcher('accessibility');
  const touchDispatcher = createModuleDispatcher('touch');

  // 创建快捷键管理器，使用专用分发器
  const shortcutManager = createKeyboardShortcutManager({
    enabled: keyboardShortcuts,
    preventDefault,
    dispatch: keyboardDispatcher
  });

  // 创建输入法处理器
  const imeHandler = createImeCompositionHandler({
    enabled: compositionEnabled,
    dispatch: imeDispatcher,
    getState: () => ({
      isComposing: eventState.value.isComposing,
      pendingComposition: eventState.value.pendingComposition
    }),
    setState: (newState) => {
      if ('isComposing' in newState) {
        eventState.value.isComposing = newState.isComposing;
      }
      if ('pendingComposition' in newState) {
        eventState.value.pendingComposition = newState.pendingComposition;
      }
    }
  });

  // 创建事件队列处理器，增强配置
  const eventQueueProcessor = createEventQueueProcessor({
    dispatch,
    throttleTime,
    // 更细致地分类高优先级事件
    highPriorityEvents: [
      // 关键输入事件
      'keydown', 'keyup', 'compositionstart', 'compositionend', 
      // 焦点事件
      'focus', 'blur', 
      // 关键用户操作
      'mousedown', 'mouseup', 'touchstart', 'touchend', 'click', 
      // 自定义事件
      CustomEvents.TEXT_INPUT, CustomEvents.FOCUS_CHANGE, CustomEvents.SELECTION_CHANGE
    ],
    // 高频可合并事件
    mergeableEvents: [
      // 移动类事件
      'mousemove', 'touchmove', 'pointermove', 'wheel',
      // 视图更新类事件
      'scroll', 'resize',
      // 定期更新类事件
      'mouseover', 'mouseout', 'animationframe'
    ],
    // 每批处理的最大事件数
    batchSize: 15,
    // 强制刷新队列间隔
    flushInterval: 100,
    // 自适应批处理
    adaptiveBatching: true,
    // 预处理函数
    preProcess: (events, config) => {
      // 合并相同类型的连续事件
      return events.reduce((acc, event) => {
        const lastEvent = acc[acc.length - 1];
        
        // 如果是可合并事件且与前一个相同类型，则合并
        if (
          lastEvent && 
          event.type === lastEvent.type && 
          config.mergeableEvents.includes(event.type)
        ) {
          // 更新最后一个事件的时间戳和位置数据
          if (event.data && event.data.position) {
            lastEvent.data.position = event.data.position;
          }
          lastEvent.timestamp = event.timestamp;
          return acc;
        }
        
        // 否则添加新事件
        return [...acc, event];
      }, []);
    },
    // 优先级评估函数
    priorityEvaluator: (event, config) => {
      // 更智能地评估事件优先级
      if (config.highPriorityEvents.includes(event.type)) {
        return 'high';
      }
      
      // 如果是用户输入相关事件，提高优先级
      if (event.type.startsWith('input') || 
          event.type.startsWith('composition') ||
          event.type === CustomEvents.TEXT_INPUT) {
        return 'high';
      }
      
      // 如果是移动事件但用户正在拖拽选择，提高优先级
      if (event.type === 'mousemove' && eventState.value.selectionActive) {
        return 'medium';
      }
      
      // 默认优先级
      return 'normal';
    },
    // 错误处理
    errorHandler: (error, eventType) => {
      console.error(`处理${eventType}事件时出错:`, error);
      // 记录错误但继续处理队列
      return true;
    }
  });

  // 更新其他处理器，使用对应的上下文分发器
  const clipboardHandler = createClipboardHandler({
    enabled: clipboardInterception,
    dispatch: clipboardDispatcher,
    preventDefault,
    getSelectionData: () => {
      // 获取选区相关数据的函数
      const selection = window.getSelection();
      if (!selection.rangeCount) return {};
      
      // 如果有DOM选区，可以获取一些额外信息
      const range = selection.getRangeAt(0);
    const container = getContainer();
      
      // 返回选区相关信息
      return {
        range,
        isCollapsed: selection.isCollapsed,
        isInContainer: container.contains(range.commonAncestorContainer),
        selectionContent: range.cloneContents()
      };
    }
  });

  // 创建焦点管理器
  const focusManager = createFocusManager({
    dispatch: focusDispatcher,
    getContainer,
    updateState: (newState) => {
      if ('isFocused' in newState) {
        eventState.value.isFocused = newState.isFocused;
      }
    },
    enabled: focusTracking,
    autoFocus,
    blurOnEscape: true
  });

  // 创建DOM变异监听器
  const mutationObserver = createMutationObserver({
    dispatch: mutationDispatcher,
    getContainer,
    enabled: true,
    debounceTime,
    subtree: true,
    ignoreAttributeChanges: true,
    // 可选：自定义过滤函数
    filterMutations: (mutations) => {
      // 只关注内容相关的变化
      return mutations.filter(mutation => 
        mutation.type === 'characterData' ||
        mutation.type === 'childList'
      );
    },
    // 可选：内容变化回调
    onContentChanged: (mutations, summary) => {
      // 可以在这里添加额外逻辑，如发送变更到同步服务
    }
  });

  // 创建拖放处理器
  const dragDropHandler = createDragDropHandler({
    dispatch: dragDropDispatcher,
    getContainer,
    preventDefault,
    enabled: dragDropEnabled,
    allowFileDrop: allowFileDrop,
    allowExternalDrop: allowExternalDrop,
    customDropTypes: customDropTypes
  });

  // 创建鼠标事件处理器
  const mouseEventHandler = createMouseEventHandler({
    dispatch: mouseDispatcher,
    getContainer,
    preventDefault,
    throttle,
    updateState: (newState) => {
      // 更新事件状态
      if (newState.lastMousePosition) {
        eventState.value.lastMousePosition = newState.lastMousePosition;
      }
      if ('mouseDown' in newState) {
        eventState.value.mouseDown = newState.mouseDown;
      }
      if ('selectionActive' in newState) {
        eventState.value.selectionActive = newState.selectionActive;
      }
    },
    rightClickEnabled: rightClickEnabled,
    doubleClickThreshold: doubleClickThreshold
  });

  // 创建触摸事件处理器
  const touchEventHandler = createTouchEventHandler({
    dispatch: touchDispatcher,
    getContainer,
    preventDefault,
    throttle,
    updateState: (newState) => {
      // 更新事件状态
      if ('touchActive' in newState) {
        eventState.value.touchActive = newState.touchActive;
      }
      if (newState.lastMousePosition) {
        eventState.value.lastMousePosition = newState.lastMousePosition;
      }
    },
    enabled: touchEnabled,
    passiveEvents,
    longPressThreshold: longPressThreshold,
    doubleTapThreshold: doubleTapThreshold
  });

  // 创建选择处理器
  const selectionHandler = createSelectionHandler({
    dispatch: selectionDispatcher,
    getContainer,
    debounce,
    suppressNativeSelection,
    updateState: (newState) => {
      // 更新事件状态
      if ('selectionActive' in newState) {
        eventState.value.selectionActive = newState.selectionActive;
      }
      if ('lastSelectionTime' in newState) {
        eventState.value.lastSelectionTime = newState.lastSelectionTime;
      }
    },
    autoExpandSelection: autoExpandSelection !== false,
    preserveSelectionOnBlur: preserveSelectionOnBlur !== false
  });

  // 创建辅助功能管理器
  const accessibilityManager = createAccessibilityManager({
    dispatch: a11yDispatcher,
    getContainer,
    announceChanges: announceChanges,
    screenReaderSupport: screenReaderSupport,
    keyboardNavigation: keyboardNavigation,
    highContrastSupport: highContrastSupport,
    reducedMotion: reducedMotion,
    labelledBy: ariaLabelledBy,
    describedBy: ariaDescribedBy,
    ariaRole: ariaRole
  });

  // 创建键盘事件处理器
  const keyboardEventHandler = createKeyboardEventHandler({
    dispatch: keyboardDispatcher,
    getContainer,
    preventDefault,
    enabled: true,
    shortcutManager,
    imeHandler,
    updateState: (newState) => {
      if ('lastKeyPressed' in newState) {
        eventState.value.lastKeyPressed = newState.lastKeyPressed;
      }
    },
    errorHandler: (message, error) => console.error(message, error)
  });

  /**
   * 将事件添加到队列
   * @param {string} type - 事件类型
   * @param {Event} event - 原始事件对象
   * @param {Object} data - 附加数据
   */
  const queueEvent = (type, event, data = {}) => {
    return eventQueueProcessor.queueEvent(type, event, data);
  };

  /**
   * 为辅助功能增加ARIA支持
   * @param {HTMLElement} container - 容器元素
   */
  const setupAccessibility = (container) => {
    if (!container) return;
    
    // 使用辅助功能管理器设置无障碍支持
    accessibilityManager.setupAccessibility(container);
    accessibilityManager.bindA11yEvents();
  };

  /**
   * 初始化焦点跟踪
   */
  const initFocusTracking = () => {
    if (!focusTracking) return;
    
    const container = getContainer();
    if (!container) return;
    
    // 使用焦点管理器绑定事件
    focusManager.bindEvents(container);
    
    // 将焦点管理器的事件处理器添加到主事件记录中
    focusManager.boundHandlers.forEach((handlerInfo, key) => {
      boundHandlers.set(`focus.${key}`, handlerInfo);
    });
  };

  /**
   * 初始化DOM变化监听
   */
  const initMutationObserver = () => {
    if (mutationObserver) {
      mutationObserver.observe();
    }
  };

  /**
   * 绑定鼠标事件
   */
  const bindMouseEvents = (container) => {
    if (!container) return;
    
    // 使用鼠标事件处理器绑定事件
    mouseEventHandler.bindEvents(container);
    
    // 将鼠标事件处理器的事件处理器添加到主事件记录中
    mouseEventHandler.boundHandlers.forEach((handlerInfo, key) => {
      boundHandlers.set(`mouse.${key}`, handlerInfo);
    });
  };

  /**
   * 绑定触摸事件
   */
  const bindTouchEvents = (container) => {
    if (!touchEnabled || !container) return;
    
    // 使用触摸事件处理器绑定事件
    touchDispatcher.bindEvents(container);
    
    // 将触摸事件处理器的事件处理器添加到主事件记录中
    touchDispatcher.boundHandlers.forEach((handlerInfo, key) => {
      boundHandlers.set(`touch.${key}`, handlerInfo);
    });
  };

  /**
   * 绑定键盘事件
   * @param {HTMLElement} container - 容器元素
   */
  const bindKeyboardEvents = (container) => {
    if (!container) return;
    
    // 使用键盘事件处理器绑定事件
    keyboardEventHandler.bindEvents(container);
    
    // 将键盘事件处理器的事件处理器添加到主事件记录中
    keyboardEventHandler.boundHandlers.forEach((handlerInfo, key) => {
      boundHandlers.set(`keyboard.${key}`, handlerInfo);
    });
  };

  /**
   * 绑定选择事件
   * @param {HTMLElement} container - 容器元素
   */
  const bindSelectionEvents = (container) => {
    if (!container) return;
    
    // 使用选择处理器绑定事件
    selectionHandler.bindEvents(container);
    
    // 将选择处理器的事件处理器添加到主事件记录中
    selectionHandler.boundHandlers.forEach((handlerInfo, key) => {
      boundHandlers.set(`selection.${key}`, handlerInfo);
    });
  };

  /**
   * 绑定剪贴板事件
   * @param {HTMLElement} container - 容器元素
   */
  const bindClipboardEvents = (container) => {
    if (!container || !clipboardInterception) return;
    
    // 使用剪贴板处理器绑定事件
    clipboardHandler.bindEvents(container);
    
    // 将剪贴板处理器的事件处理器添加到主事件记录中
    clipboardHandler.boundHandlers.forEach((handlerInfo, key) => {
      boundHandlers.set(`clipboard.${key}`, handlerInfo);
    });
  };

  /**
   * 绑定拖放事件
   * @param {HTMLElement} container - 容器元素
   */
  const bindDragDropEvents = (container) => {
    if (!container || !dragDropEnabled) return;
    
    // 使用拖放处理器绑定事件
    dragDropHandler.bindEvents(container);
    
    // 将拖放处理器的事件处理器添加到主事件记录中
    dragDropHandler.boundHandlers.forEach((handlerInfo, key) => {
      boundHandlers.set(`dragdrop.${key}`, handlerInfo);
    });
  };

  /**
   * 初始化手势识别器
   * @param {HTMLElement} container - 容器元素
   */
  const initGestureRecognizers = (container) => {
    if (!container) return;
    
    // 使用手势识别器初始化
    const gestureRecognizer = createGestureRecognizer({
      dispatch,
      getContainer,
      // 其他需要的配置
    });
    
    gestureRecognizer.bindEvents(container);
    
    // 将手势识别器的事件处理器添加到主事件记录中
    if (gestureRecognizer.boundHandlers) {
      gestureRecognizer.boundHandlers.forEach((handlerInfo, key) => {
        boundHandlers.set(`gesture.${key}`, handlerInfo);
      });
    }
  };

  /**
   * 初始化事件管理器
   */
  const init = () => {
    try {
      // 验证配置参数
      validateConfig();
      
    const container = getContainer();
    if (!container) {
        const error = new Error('事件管理器初始化失败：找不到容器元素');
        console.error(error);
        throw error;
    }
    
    // 执行系统自检
    if (!performSelfCheck()) {
      console.warn('事件系统自检发现问题，可能影响正常功能');
    }
    
      // 使用阶段性初始化，捕获每个阶段的错误
      const initPhases = [
        { name: '无障碍设置', fn: () => setupAccessibility(container) },
        { name: '焦点追踪初始化', fn: () => initFocusTracking() },
        { name: 'DOM变更观察器初始化', fn: () => initMutationObserver() },
        { name: '鼠标事件绑定', fn: () => bindMouseEvents(container) },
        { name: '触摸事件绑定', fn: () => touchEnabled && bindTouchEvents(container) },
        { name: '键盘事件绑定', fn: () => bindKeyboardEvents(container) },
        { name: '选择事件绑定', fn: () => bindSelectionEvents(container) },
        { name: '剪贴板事件绑定', fn: () => clipboardInterception && bindClipboardEvents(container) },
        { name: '拖放事件绑定', fn: () => dragDropEnabled && bindDragDropEvents(container) },
        { name: '手势识别器初始化', fn: () => initGestureRecognizers(container) },
        { name: '自动聚焦', fn: () => autoFocus && !eventState.value.isFocused && safeExecute('autofocus', () => container.focus()) }
      ];
      
      let succeeded = 0;
      let failed = 0;
      
      // 依次执行初始化阶段，记录成功和失败
      for (const phase of initPhases) {
        try {
          phase.fn();
          succeeded++;
        } catch (error) {
          failed++;
          console.error(`初始化阶段 "${phase.name}" 失败:`, error);
          // 继续执行其他阶段，尝试优雅失败
        }
      }
      
      if (failed > 0) {
        console.warn(`事件系统部分初始化完成: ${succeeded}/${initPhases.length} 个阶段成功`);
      } else {
        console.log('事件系统初始化完成');
      }
      
      return succeeded > 0; // 至少有一个阶段成功就返回true
    } catch (error) {
      console.error('事件系统初始化失败:', error);
      // 尝试清理已初始化的资源
      cleanup();
      return false;
    }
  };

  /**
   * 验证配置参数
   * @throws {Error} 如果配置参数无效
   */
  const validateConfig = () => {
    // 验证必要的配置
    if (containerRef === null && containerSelector === null) {
      throw new Error('初始化失败: 必须提供containerRef或containerSelector');
    }
    
    // 验证数值配置是否合理
    if (debounceTime !== undefined && (typeof debounceTime !== 'number' || debounceTime < 0)) {
      throw new Error(`初始化失败: debounceTime必须是非负数，当前值: ${debounceTime}`);
    }
    
    if (throttleTime !== undefined && (typeof throttleTime !== 'number' || throttleTime < 0)) {
      throw new Error(`初始化失败: throttleTime必须是非负数，当前值: ${throttleTime}`);
    }
    
    // 其他验证逻辑...
  };

  // 清理事件管理器
  const cleanup = () => {
    try {
      // 1. 先解绑所有事件处理程序
    boundHandlers.forEach(({ element, type, handler, options }) => {
      if (element && typeof element.removeEventListener === 'function') {
          try {
        element.removeEventListener(type, handler, options);
          } catch (e) {
            console.warn(`解绑事件处理器失败: ${type}`, e);
          }
      }
    });
    
      // 清空处理程序映射
      boundHandlers.clear();
      
      // 2. 断开DOM观察者
    if (eventState.value.mutationObserver) {
        try {
      eventState.value.mutationObserver.disconnect();
        } catch (e) {
          console.warn('断开MutationObserver失败', e);
        }
      eventState.value.mutationObserver = null;
    }
    
      // 3. 清理计时器，防止内存泄漏
      if (throttleTimer) {
    clearTimeout(throttleTimer);
    throttleTimer = null;
      }
      
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      
      // 4. 清空事件队列
      eventQueue = [];
      
      // 5. 清理各个状态映射
      if (eventState.value.eventHandlers) {
        eventState.value.eventHandlers.clear();
      }
      
      if (eventState.value.customHandlers) {
        eventState.value.customHandlers.clear();
      }
      
      // 6. 清理各模块
      // 使用安全执行封装每个清理调用
      const modulesToCleanup = [
        { name: '快捷键管理器', fn: () => shortcutManager.clearShortcuts() },
        { name: 'IME处理器', fn: () => compositionEnabled && imeHandler.cleanup() },
        { name: '事件队列处理器', fn: () => eventQueueProcessor.cleanup() },
        { name: '剪贴板处理器', fn: () => clipboardInterception && clipboardHandler.cleanup() },
        { name: '焦点管理器', fn: () => focusTracking && focusManager.cleanup() },
        { name: 'DOM变异监听器', fn: () => mutationObserver && mutationObserver.cleanup() },
        { name: '拖放处理器', fn: () => dragDropEnabled && dragDropHandler.cleanup() },
        { name: '鼠标事件处理器', fn: () => mouseEventHandler.cleanup() },
        { name: '触摸事件处理器', fn: () => touchEnabled && touchEventHandler.cleanup() },
        { name: '选择处理器', fn: () => selectionHandler.cleanup() },
        { name: '辅助功能管理器', fn: () => accessibilityManager.cleanup() },
        { name: '事件调度器', fn: () => eventDispatcher.cleanup() },
        { name: '键盘事件处理器', fn: () => keyboardEventHandler.cleanup() }
      ];
      
      // 逐个执行清理，捕获并记录错误但不中断
      modulesToCleanup.forEach(module => {
        try {
          module.fn();
        } catch (error) {
          console.warn(`清理"${module.name}"失败:`, error);
        }
      });
      
      // 7. 重置关键状态值
      eventState.value = {
        ...eventState.value,
        isFocused: false,
        isComposing: false,
        lastKeyPressed: null,
        lastMousePosition: { x: 0, y: 0 },
        mouseDown: false,
        touchActive: false,
        selectionActive: false,
        eventCount: 0,
        lastEventTime: 0,
        lastSelectionTime: 0,
        container: null,
        pendingComposition: '',
        isAutoCorrect: false
      };
      
      console.log('事件系统清理完成');
      return true;
    } catch (error) {
      console.error('事件系统清理出错:', error);
      return false;
    }
  };

  // 返回事件管理器，按功能分组的API设计
  return {
    // 核心功能：初始化和清理
    core: {
    init,
    cleanup,
      dispatch,
      getState: () => readonly(eventState),
    addEventListener,
    removeEventListener,
      onCustomEvent
    },
    
    // 事件队列相关功能
    queue: {
    queueEvent,
      flush: eventQueueProcessor.flush,
    getQueueInfo: eventQueueProcessor.getQueueInfo,
      setPriority: (eventType, isHighPriority) => 
        eventQueueProcessor.setPriority(eventType, isHighPriority),
      setMergeable: (eventType, isMergeable) => 
        eventQueueProcessor.setMergeable(eventType, isMergeable)
    },
    
    // 键盘和快捷键相关功能
    keyboard: {
      registerShortcut: (keys, handler, shouldPreventDefault = true) => {
        return shortcutManager.registerShortcut(keys, handler, shouldPreventDefault);
      },
      simulateKeyEvent: keyboardEventHandler.simulateKeyEvent,
      getState: () => ({
        lastKeyPressed: eventState.value.lastKeyPressed
      }),
      getKeyCodes: () => keyboardEventHandler.KEY_CODES
    },
    
    // 剪贴板相关功能
    clipboard: {
    copy: clipboardHandler.performCopy,
    paste: clipboardHandler.performPaste,
      cut: clipboardHandler.performCut
    },
    
    // 焦点相关功能
    focus: {
    focus: focusManager.focus,
    blur: focusManager.blur,
      hasFocus: focusManager.hasFocus
    },
    
    // DOM变化观察相关功能
    mutation: {
    triggerContentChange: mutationObserver.triggerContentChange,
    pauseObserving: mutationObserver.disconnect,
    resumeObserving: mutationObserver.reconnect,
      getStatus: mutationObserver.getStatus
    },
    
    // 拖放相关功能
    dragDrop: {
    simulateDrop: dragDropHandler.simulateDrop,
      getState: dragDropHandler.getDragState
    },
    
    // 鼠标相关功能
    mouse: {
    simulateClick: mouseEventHandler.simulateClick,
      getState: mouseEventHandler.getMouseState,
      getVelocity: mouseEventHandler.getVelocity
    },
    
    // 触摸相关功能
    touch: {
    simulateTouch: touchEventHandler.simulateTouch,
      getState: touchEventHandler.getTouchState,
      isEnabled: () => touchEnabled
    },
    
    // 选择相关功能
    selection: {
      getContent: selectionHandler.getSelectionContent,
      getState: selectionHandler.getSelectionState,
    setSelection: selectionHandler.setSelection,
    clearSelection: selectionHandler.clearSelection,
    selectAll: selectionHandler.selectAll,
    insertAtCursor: selectionHandler.insertAtCursor,
    replaceSelection: selectionHandler.replaceSelection,
    setCursor: selectionHandler.setCursor,
      expandToWord: selectionHandler.expandSelectionToWord,
      expandToParagraph: selectionHandler.expandSelectionToParagraph
    },
    
    // 辅助功能相关
    accessibility: {
    announce: accessibilityManager.announce,
    setAriaAttributes: accessibilityManager.setAriaAttributes,
    enableKeyboardTrap: accessibilityManager.enableKeyboardTrap,
    disableKeyboardTrap: accessibilityManager.disableKeyboardTrap,
      getState: accessibilityManager.getA11yState
    },
    
    // 错误处理和统计相关
    metrics: {
    getEventStats: eventDispatcher.getStats,
      getErrorMetrics,
      resetErrorMetrics
    },
    
    // 工厂方法
    factory: {
      createContextDispatcher: createModuleDispatcher
    },
    
    // 输入法相关功能
    ime: {
      getState: () => ({
        isComposing: eventState.value.isComposing,
        pendingComposition: eventState.value.pendingComposition
      }),
      abortComposition: () => imeHandler.abortComposition && imeHandler.abortComposition(),
      simulateComposition: () => imeHandler.simulateComposition && imeHandler.simulateComposition()
    },

    // 向后兼容的平面API，便于直接使用，但不推荐
    ...(() => {
      const deprecationWarned = new Set();
      
      // 创建一个代理对象，当访问平面API时发出废弃警告
      const createDeprecatedProxy = (target, name) => {
        return new Proxy(target, {
          get(obj, prop) {
            // 只在开发环境发出警告，且每个属性只警告一次
            if (process.env.NODE_ENV !== 'production' && !deprecationWarned.has(prop)) {
              console.warn(`警告: 直接使用 ${prop} 已废弃，请改用分组API，如 event.${name}.${prop}`);
              deprecationWarned.add(prop);
            }
            return obj[prop];
          }
        });
      };
      
      // 创建用于向后兼容的扁平API
      const flatApi = {
        init,
        cleanup,
        dispatch,
        addEventListener,
        removeEventListener,
        onCustomEvent,
        emitEvent,
        
        eventState: readonly(eventState),
        
        // 队列相关
        queueEvent,
        flushEvents: eventQueueProcessor.flush,
        getQueueInfo: eventQueueProcessor.getQueueInfo,
        
        // 键盘相关
        registerShortcut: (keys, handler, shouldPreventDefault = true) => {
          return shortcutManager.registerShortcut(keys, handler, shouldPreventDefault);
        },
        
        // 复制各个模块的API到平面结构
        ...Object.entries({
          clipboard: { copy: 'performCopy', paste: 'performPaste', cut: 'performCut' },
          focus: { focus: 'focus', blur: 'blur', hasFocus: 'hasFocus' },
          mutation: { 
            triggerContentChange: 'triggerContentChange', 
            pauseObserving: 'disconnect',
            resumeObserving: 'reconnect',
            getMutationStatus: 'getStatus'
          },
          dragDrop: { simulateDrop: 'simulateDrop', getDragState: 'getDragState' },
          mouse: { 
            simulateClick: 'simulateClick', 
            getMouseState: 'getMouseState',
            getMouseVelocity: 'getVelocity'
          },
          touch: { 
            simulateTouch: 'simulateTouch', 
            getTouchState: 'getTouchState'
          },
          selection: { 
            getSelectionContent: 'getSelectionContent',
            getSelectionState: 'getSelectionState',
            setSelection: 'setSelection',
            clearSelection: 'clearSelection',
            selectAll: 'selectAll',
            insertAtCursor: 'insertAtCursor',
            replaceSelection: 'replaceSelection',
            setCursor: 'setCursor',
            expandSelectionToWord: 'expandSelectionToWord',
            expandSelectionToParagraph: 'expandSelectionToParagraph'
          },
          accessibility: {
            announce: 'announce',
            setAriaAttributes: 'setAriaAttributes',
            enableKeyboardTrap: 'enableKeyboardTrap',
            disableKeyboardTrap: 'disableKeyboardTrap',
            getA11yState: 'getA11yState'
          },
          metrics: {
            getEventStats: 'getStats',
            getErrorMetrics,
            resetErrorMetrics
          },
          factory: {
            createContextDispatcher: 'createModuleDispatcher'
          },
          keyboard: {
            simulateKeyEvent: 'simulateKeyEvent',
    getKeyboardState: () => ({
      lastKeyPressed: eventState.value.lastKeyPressed
    }),
            getKeyCodes: () => keyboardEventHandler.KEY_CODES
          }
        }).reduce((acc, [moduleName, methodMap]) => {
          const moduleHandler = {
            clipboard: clipboardHandler,
            focus: focusManager,
            mutation: mutationObserver,
            dragDrop: dragDropHandler,
            mouse: mouseEventHandler,
            touch: touchEventHandler,
            selection: selectionHandler,
            accessibility: accessibilityManager,
            metrics: { 
              getStats: eventDispatcher.getStats,
    getErrorMetrics,
              resetErrorMetrics
            },
            factory: { createModuleDispatcher },
            keyboard: keyboardEventHandler
          }[moduleName];
          
          // 将方法映射到扁平结构
          Object.entries(methodMap).forEach(([newName, origName]) => {
            if (typeof origName === 'function') {
              acc[newName] = origName;
            } else if (moduleHandler && typeof moduleHandler[origName] === 'function') {
              acc[newName] = moduleHandler[origName].bind(moduleHandler);
            }
          });
          
          return acc;
        }, {})
      };
      
      // 返回代理后的平面API以便发出废弃警告
      return process.env.NODE_ENV === 'production' 
        ? flatApi 
        : createDeprecatedProxy(flatApi, 'core');
    })()
  };
}; 