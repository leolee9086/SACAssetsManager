/**
 * 集成编辑器示例
 * 展示如何使用我们开发的各个模块构建一个完整的富文本编辑器
 */

// 导入所需模块
import { createEditorManager } from './editorManager.js';
import { createThemeManager } from './themeSystem.js';
import { DrawingToolType } from './advancedDrawingSupport.js';
import { DeviceType } from './specialDeviceSupport.js';

/**
 * 初始化集成编辑器
 * @param {Object} options - 配置选项
 * @returns {Object} 编辑器API
 */
export const initIntegratedEditor = (options = {}) => {
  const {
    container,
    eventManager,
    initialContent = '',
    theme = 'light',
    collaborative = false,
    userId = null,
    syncEndpoint = null,
    plugins = []
  } = options;
  
  if (!container || !eventManager) {
    throw new Error('初始化编辑器需要容器元素和事件管理器');
  }
  
  console.log('正在初始化集成编辑器...');
  
  // 创建主题管理器
  const themeManager = createThemeManager({
    eventManager,
    container,
    defaultTheme: theme
  });
  
  // 创建同步函数（如果启用协作）
  const syncFunction = collaborative && syncEndpoint ? 
    async (operations) => {
      try {
        const response = await fetch(syncEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId,
            operations
          })
        });
        
        if (!response.ok) {
          throw new Error(`同步失败: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('同步操作失败:', error);
        throw error;
      }
    } : null;
  
  // 创建编辑器管理器
  const editorManager = createEditorManager({
    container,
    eventManager,
    options: {
      enableSpecialDevices: true,
      enableDrawing: true,
      enableCollaboration: collaborative,
      syncFunction,
      userId,
      debugMode: options.debug || false
    }
  });
  
  // 初始化编辑器内容
  if (initialContent) {
    editorManager.setContent(initialContent);
  }
  
  // 注册插件
  if (Array.isArray(plugins)) {
    plugins.forEach(plugin => {
      editorManager.registerPlugin(plugin);
    });
  }
  
  // 设置工具栏处理
  setupToolbar(container, editorManager, themeManager);
  
  // 设置事件处理
  setupEventHandlers(eventManager, editorManager, themeManager);
  
  // 返回集成编辑器API
  return {
    // 基础编辑API
    getContent: (format) => editorManager.getContent(format),
    setContent: (content, format) => editorManager.setContent(content, format),
    execCommand: (command, params) => editorManager.execCommand(command, params),
    
    // 协作相关
    connect: (sessionId) => editorManager.connectCollaboration(sessionId),
    disconnect: () => editorManager.disconnectCollaboration(),
    
    // 绘图相关
    enableDrawing: () => editorManager.enableDrawingMode(),
    disableDrawing: () => editorManager.disableDrawingMode(),
    setDrawingTool: (tool) => {
      const drawingManager = editorManager.getComponent('drawingManager');
      if (drawingManager) {
        return drawingManager.setTool(tool);
      }
      return false;
    },
    
    // 主题相关
    setTheme: (themeId) => themeManager.applyTheme(themeId),
    getCurrentTheme: () => themeManager.getCurrentTheme(),
    createCustomTheme: (config) => themeManager.createCustomTheme(config),
    
    // 状态相关
    getState: () => editorManager.getState(),
    
    // 插件相关
    registerPlugin: (plugin) => editorManager.registerPlugin(plugin),
    
    // 资源清理
    destroy: () => {
      editorManager.cleanup();
      themeManager.cleanup();
      clearEventHandlers(eventManager);
    }
  };
};

/**
 * 设置工具栏处理
 * @param {HTMLElement} container - 容器元素
 * @param {Object} editorManager - 编辑器管理器
 * @param {Object} themeManager - 主题管理器
 */
const setupToolbar = (container, editorManager, themeManager) => {
  // 查找工具栏元素
  const toolbar = container.querySelector('.editor-toolbar');
  
  // 如果没有工具栏，自动创建一个
  if (!toolbar) {
    const newToolbar = document.createElement('div');
    newToolbar.className = 'editor-toolbar';
    
    // 创建基本工具栏按钮
    newToolbar.innerHTML = `
      <div class="editor-toolbar-group">
        <button data-command="formatBold" title="加粗">B</button>
        <button data-command="formatItalic" title="斜体">I</button>
        <button data-command="formatUnderline" title="下划线">U</button>
        <button data-command="formatStrikethrough" title="删除线">S</button>
      </div>
      <div class="editor-toolbar-group">
        <button data-command="insertHeading" data-param="1" title="标题1">H1</button>
        <button data-command="insertHeading" data-param="2" title="标题2">H2</button>
        <button data-command="insertHeading" data-param="3" title="标题3">H3</button>
      </div>
      <div class="editor-toolbar-group">
        <button data-command="insertOrderedList" title="有序列表">OL</button>
        <button data-command="insertUnorderedList" title="无序列表">UL</button>
        <button data-command="insertBlockquote" title="引用">Quote</button>
        <button data-command="insertCodeBlock" title="代码块">Code</button>
      </div>
      <div class="editor-toolbar-group">
        <button data-command="insertLink" title="链接">Link</button>
        <button data-command="insertImage" title="图片">Image</button>
        <button data-command="insertTable" title="表格">Table</button>
      </div>
      <div class="editor-toolbar-group">
        <button data-command="undo" title="撤销">↩</button>
        <button data-command="redo" title="重做">↪</button>
      </div>
      <div class="editor-toolbar-group">
        <select data-action="theme">
          <option value="light">亮色主题</option>
          <option value="dark">暗色主题</option>
          <option value="print">印刷主题</option>
        </select>
      </div>
      <div class="editor-toolbar-group">
        <button data-action="toggleDrawing" title="绘图模式">Draw</button>
        <select data-action="drawingTool" style="display:none;">
          <option value="pen">钢笔</option>
          <option value="brush">画笔</option>
          <option value="highlighter">荧光笔</option>
          <option value="eraser">橡皮擦</option>
        </select>
      </div>
    `;
    
    // 添加到容器开头
    container.insertBefore(newToolbar, container.firstChild);
    
    // 设置工具栏事件监听
    setupToolbarEvents(newToolbar, editorManager, themeManager);
  } else {
    // 设置现有工具栏的事件监听
    setupToolbarEvents(toolbar, editorManager, themeManager);
  }
  
  // 添加主题特定的工具栏样式
  const allThemes = themeManager.getAllThemes();
  allThemes.forEach(theme => {
    const toolbarCSS = `
      [data-theme="${theme.id}"] .editor-toolbar {
        background-color: var(--surface-color);
        border-bottom: var(--border-width) solid var(--border-color);
        padding: var(--small);
        display: flex;
        flex-wrap: wrap;
        gap: var(--small);
      }
      
      [data-theme="${theme.id}"] .editor-toolbar-group {
        display: flex;
        gap: var(--xxsmall);
        border-right: var(--border-width) solid var(--border-color);
        padding-right: var(--small);
      }
      
      [data-theme="${theme.id}"] .editor-toolbar button {
        background-color: var(--surface-color);
        color: var(--text-color);
        border: var(--border-width) solid var(--border-color);
        border-radius: var(--border-radius);
        padding: var(--xsmall) var(--small);
        cursor: pointer;
        transition: var(--transition);
      }
      
      [data-theme="${theme.id}"] .editor-toolbar button:hover {
        background-color: var(--primary-color);
        color: var(--background-color);
      }
      
      [data-theme="${theme.id}"] .editor-toolbar select {
        background-color: var(--surface-color);
        color: var(--text-color);
        border: var(--border-width) solid var(--border-color);
        border-radius: var(--border-radius);
        padding: var(--xsmall);
        cursor: pointer;
      }
    `;
    
    // 添加到主题样式中
    const style = document.createElement('style');
    style.textContent = toolbarCSS;
    document.head.appendChild(style);
  });
};

/**
 * 设置工具栏事件处理
 * @param {HTMLElement} toolbar - 工具栏元素
 * @param {Object} editorManager - 编辑器管理器
 * @param {Object} themeManager - 主题管理器
 */
const setupToolbarEvents = (toolbar, editorManager, themeManager) => {
  // 命令按钮处理
  toolbar.querySelectorAll('button[data-command]').forEach(button => {
    button.addEventListener('click', () => {
      const command = button.getAttribute('data-command');
      const param = button.getAttribute('data-param');
      
      editorManager.execCommand(command, param ? { value: param } : {});
    });
  });
  
  // 主题选择处理
  const themeSelect = toolbar.querySelector('select[data-action="theme"]');
  if (themeSelect) {
    // 设置初始选中值
    const currentTheme = themeManager.getCurrentTheme();
    if (currentTheme) {
      themeSelect.value = currentTheme.id;
    }
    
    themeSelect.addEventListener('change', () => {
      themeManager.applyTheme(themeSelect.value);
    });
  }
  
  // 绘图模式切换
  const drawButton = toolbar.querySelector('button[data-action="toggleDrawing"]');
  const drawingToolSelect = toolbar.querySelector('select[data-action="drawingTool"]');
  
  if (drawButton && drawingToolSelect) {
    // 绘图开关
    drawButton.addEventListener('click', () => {
      const drawingManager = editorManager.getComponent('drawingManager');
      if (!drawingManager) return;
      
      if (drawingManager.isEnabled()) {
        // 禁用绘图模式
        editorManager.disableDrawingMode();
        drawButton.textContent = '绘图模式';
        drawingToolSelect.style.display = 'none';
      } else {
        // 启用绘图模式
        editorManager.enableDrawingMode();
        drawButton.textContent = '退出绘图';
        drawingToolSelect.style.display = 'inline-block';
      }
    });
    
    // 绘图工具选择
    drawingToolSelect.addEventListener('change', () => {
      const drawingManager = editorManager.getComponent('drawingManager');
      if (!drawingManager) return;
      
      drawingManager.setTool(drawingToolSelect.value);
    });
  }
};

/**
 * 设置事件处理器
 * @param {Object} eventManager - 事件管理器
 * @param {Object} editorManager - 编辑器管理器
 * @param {Object} themeManager - 主题管理器
 */
const setupEventHandlers = (eventManager, editorManager, themeManager) => {
  // 主题变更处理
  eventManager.core.on('themeChanged', (event) => {
    console.log(`主题已切换为: ${event.detail.themeId}`);
    
    // 更新UI反映主题变化
    const container = document.querySelector('[data-theme]');
    if (container) {
      const themeSelect = container.querySelector('select[data-action="theme"]');
      if (themeSelect) {
        themeSelect.value = event.detail.themeId;
      }
    }
  });
  
  // 协作连接状态处理
  eventManager.core.on('collaborationConnectionChanged', (event) => {
    const { connected, sessionId, userCount } = event.detail;
    console.log(`协作状态变更: ${connected ? '已连接' : '已断开'}, 会话ID: ${sessionId}, 用户数: ${userCount}`);
    
    // 可以在这里更新UI反映协作状态
  });
  
  // 远程用户加入/离开处理
  eventManager.core.on('remoteUserJoined', (event) => {
    const { userId, userInfo } = event.detail;
    console.log(`远程用户加入: ${userId}`, userInfo);
    
    // 可以在这里更新UI显示远程用户
  });
  
  eventManager.core.on('remoteUserLeft', (event) => {
    const { userId } = event.detail;
    console.log(`远程用户离开: ${userId}`);
    
    // 可以在这里更新UI移除远程用户
  });
  
  // 特殊设备检测处理
  eventManager.core.on('customDeviceDetected', (event) => {
    const { deviceId, type } = event.detail;
    console.log(`检测到特殊设备: ${deviceId}, 类型: ${type}`);
    
    // 可以在这里更新UI显示特殊设备
  });
  
  // 绘图模式变更处理
  eventManager.core.on('drawingEnabled', () => {
    console.log('绘图模式已启用');
    
    // 更新UI反映绘图模式
    const container = document.querySelector('[data-theme]');
    if (container) {
      const drawButton = container.querySelector('button[data-action="toggleDrawing"]');
      const drawingToolSelect = container.querySelector('select[data-action="drawingTool"]');
      
      if (drawButton) {
        drawButton.textContent = '退出绘图';
      }
      
      if (drawingToolSelect) {
        drawingToolSelect.style.display = 'inline-block';
      }
    }
  });
  
  eventManager.core.on('drawingDisabled', () => {
    console.log('绘图模式已禁用');
    
    // 更新UI反映绘图模式关闭
    const container = document.querySelector('[data-theme]');
    if (container) {
      const drawButton = container.querySelector('button[data-action="toggleDrawing"]');
      const drawingToolSelect = container.querySelector('select[data-action="drawingTool"]');
      
      if (drawButton) {
        drawButton.textContent = '绘图模式';
      }
      
      if (drawingToolSelect) {
        drawingToolSelect.style.display = 'none';
      }
    }
  });
  
  // 编辑器就绪处理
  eventManager.core.on('editorReady', (event) => {
    const { activeModules } = event.detail;
    console.log('编辑器已就绪，活动模块:', activeModules);
    
    // 可以在这里执行编辑器就绪后的操作
  });
};

/**
 * 清理事件处理器
 * @param {Object} eventManager - 事件管理器
 */
const clearEventHandlers = (eventManager) => {
  eventManager.core.off('themeChanged');
  eventManager.core.off('collaborationConnectionChanged');
  eventManager.core.off('remoteUserJoined');
  eventManager.core.off('remoteUserLeft');
  eventManager.core.off('customDeviceDetected');
  eventManager.core.off('drawingEnabled');
  eventManager.core.off('drawingDisabled');
  eventManager.core.off('editorReady');
};

/**
 * 创建一个示例插件
 * @param {Object} config - 插件配置
 * @returns {Object} 插件对象
 */
export const createExamplePlugin = (config = {}) => {
  return {
    name: config.name || 'examplePlugin',
    description: config.description || '示例插件',
    version: config.version || '1.0.0',
    requires: ['documentModel'],
    
    init: (api) => {
      console.log(`插件 ${config.name || 'examplePlugin'} 初始化`);
      
      // 注册自定义命令
      api.execCommand('registerCommand', {
        name: 'exampleCommand',
        handler: (params) => {
          console.log('执行示例命令:', params);
          return true;
        }
      });
      
      // 监听事件
      api.eventManager.core.on('contentChanged', (event) => {
        console.log('内容已变更:', event.detail);
      });
      
      // 返回插件API
      return {
        execute: (params) => {
          return api.execCommand('exampleCommand', params);
        },
        getPluginInfo: () => ({
          name: config.name || 'examplePlugin',
          description: config.description || '示例插件',
          version: config.version || '1.0.0'
        })
      };
    },
    
    cleanup: () => {
      console.log(`插件 ${config.name || 'examplePlugin'} 清理`);
    }
  };
};

// 示例用法
/*
// 创建容器元素
const container = document.getElementById('editor-container');

// 创建事件管理器
import { createEventManager } from './useEvent.js';
const eventManager = createEventManager();

// 初始化编辑器
const editor = initIntegratedEditor({
  container,
  eventManager,
  initialContent: '<h1>欢迎使用高级编辑器</h1><p>这是一个功能强大的富文本编辑器示例。</p>',
  theme: 'light',
  collaborative: false,
  plugins: [
    createExamplePlugin({ name: 'markdownShortcuts' })
  ]
});

// 使用编辑器API
editor.execCommand('formatBold');
editor.setTheme('dark');
editor.enableDrawing();
editor.setDrawingTool(DrawingToolType.BRUSH);

// 获取内容
const content = editor.getContent('html');
console.log(content);

// 销毁编辑器
editor.destroy();
*/ 