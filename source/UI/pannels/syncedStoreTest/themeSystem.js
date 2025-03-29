/**
 * 主题系统模块
 * 提供编辑器主题管理、切换和自定义功能
 */

/**
 * 主题配置类型
 * @typedef {Object} ThemeConfig
 * @property {Object} colors - 颜色配置
 * @property {Object} typography - 排版配置
 * @property {Object} spacing - 间距配置
 * @property {Object} borders - 边框配置
 * @property {Object} effects - 效果配置
 */

/**
 * 创建主题管理器
 * 
 * @param {Object} options - 配置选项
 * @param {Object} options.eventManager - 事件管理器实例
 * @param {HTMLElement} options.container - 编辑器容器元素
 * @param {string} options.defaultTheme - 默认主题名称
 * @returns {Object} 主题管理器API
 */
export const createThemeManager = (options = {}) => {
  const {
    eventManager = null,
    container = null,
    defaultTheme = 'light'
  } = options;
  
  if (!container) {
    throw new Error('主题管理器需要一个容器元素');
  }
  
  // 主题状态
  const themeState = {
    currentTheme: defaultTheme,
    themes: new Map(),
    variables: new Map(),
    styleElement: null,
    customThemes: new Map(),
    systemTheme: 'light'
  };
  
  // 预定义的主题
  const predefinedThemes = {
    // 亮色主题
    light: {
      id: 'light',
      name: '亮色',
      description: '默认亮色主题',
      colors: {
        primary: '#1a73e8',
        secondary: '#8ab4f8',
        background: '#ffffff',
        surface: '#f8f9fa',
        text: '#202124',
        textSecondary: '#5f6368',
        border: '#dadce0',
        error: '#d93025',
        warning: '#f29900',
        success: '#188038',
        selection: 'rgba(26, 115, 232, 0.2)',
        codeBackground: '#f1f3f4',
        codeText: '#202124',
        codeBorder: '#dadce0',
        codeComment: '#5f6368',
        codeKeyword: '#1967d2',
        codeString: '#188038',
        codeNumber: '#c5221f',
        codeFunction: '#d93025',
        markdownHeading: '#1a73e8',
        markdownLink: '#1967d2',
        markdownList: '#188038',
        markdownQuote: '#5f6368',
        markdownCode: '#c5221f',
        markdownHr: '#dadce0',
        insertionMarker: '#188038',
        deletionMarker: '#c5221f',
        changeMarker: '#f29900',
        focusRing: '#1a73e8',
        focusRingText: '#ffffff',
        tooltip: '#202124',
        tooltipBackground: '#ffffff',
        tooltipBorder: '#dadce0',
        dialogBackground: '#ffffff',
        dialogText: '#202124',
        dialogBorder: '#dadce0',
        menuBackground: '#ffffff',
        menuText: '#202124',
        menuHover: '#f1f3f4',
        menuBorder: '#dadce0'
      },
      typography: {
        fontFamily: "'Segoe UI', 'SF Pro Text', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        codeFontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', monospace",
        fontSize: '16px',
        lineHeight: '1.5',
        fontWeight: '400',
        headingFontWeight: '600',
        codeFontSize: '14px',
        codeLineHeight: '1.45',
        monospaceFontFeatures: "'calt' 1, 'zero' 1, 'ss01' 1, 'ss02' 1, 'ss03' 1, 'ss04' 1, 'ss05' 1, 'cv01' 1, 'cv02' 1, 'cv03' 1, 'cv04' 1",
        letterSpacing: '0',
        paragraphSpacing: '1.5em'
      },
      spacing: {
        xxsmall: '2px',
        xsmall: '4px',
        small: '8px',
        medium: '16px',
        large: '24px',
        xlarge: '32px',
        xxlarge: '48px',
        gutter: '16px',
        blockSpacing: '1em'
      },
      borders: {
        radius: '4px',
        width: '1px',
        focusRingWidth: '2px'
      },
      effects: {
        shadow1: '0 1px 3px rgba(60, 64, 67, 0.15)',
        shadow2: '0 2px 6px rgba(60, 64, 67, 0.15)',
        shadow3: '0 4px 12px rgba(60, 64, 67, 0.15)',
        shadow4: '0 8px 24px rgba(60, 64, 67, 0.15)',
        transition: '0.2s ease-in-out'
      }
    },
    
    // 暗色主题
    dark: {
      id: 'dark',
      name: '暗色',
      description: '默认暗色主题',
      colors: {
        primary: '#8ab4f8',
        secondary: '#1a73e8',
        background: '#202124',
        surface: '#292a2d',
        text: '#e8eaed',
        textSecondary: '#9aa0a6',
        border: '#5f6368',
        error: '#f28b82',
        warning: '#fdd663',
        success: '#81c995',
        selection: 'rgba(138, 180, 248, 0.3)',
        codeBackground: '#292a2d',
        codeText: '#e8eaed',
        codeBorder: '#5f6368',
        codeComment: '#9aa0a6',
        codeKeyword: '#a4c2ff',
        codeString: '#96d6b0',
        codeNumber: '#f6aea9',
        codeFunction: '#f6aea9',
        markdownHeading: '#8ab4f8',
        markdownLink: '#a4c2ff',
        markdownList: '#81c995',
        markdownQuote: '#9aa0a6',
        markdownCode: '#f6aea9',
        markdownHr: '#5f6368',
        insertionMarker: '#81c995',
        deletionMarker: '#f28b82',
        changeMarker: '#fdd663',
        focusRing: '#8ab4f8',
        focusRingText: '#202124',
        tooltip: '#e8eaed',
        tooltipBackground: '#292a2d',
        tooltipBorder: '#5f6368',
        dialogBackground: '#292a2d',
        dialogText: '#e8eaed',
        dialogBorder: '#5f6368',
        menuBackground: '#292a2d',
        menuText: '#e8eaed',
        menuHover: '#202124',
        menuBorder: '#5f6368'
      },
      typography: {
        fontFamily: "'Segoe UI', 'SF Pro Text', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        codeFontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', monospace",
        fontSize: '16px',
        lineHeight: '1.5',
        fontWeight: '400',
        headingFontWeight: '600',
        codeFontSize: '14px',
        codeLineHeight: '1.45',
        monospaceFontFeatures: "'calt' 1, 'zero' 1, 'ss01' 1, 'ss02' 1, 'ss03' 1, 'ss04' 1, 'ss05' 1, 'cv01' 1, 'cv02' 1, 'cv03' 1, 'cv04' 1",
        letterSpacing: '0',
        paragraphSpacing: '1.5em'
      },
      spacing: {
        xxsmall: '2px',
        xsmall: '4px',
        small: '8px',
        medium: '16px',
        large: '24px',
        xlarge: '32px',
        xxlarge: '48px',
        gutter: '16px',
        blockSpacing: '1em'
      },
      borders: {
        radius: '4px',
        width: '1px',
        focusRingWidth: '2px'
      },
      effects: {
        shadow1: '0 1px 3px rgba(0, 0, 0, 0.5)',
        shadow2: '0 2px 6px rgba(0, 0, 0, 0.5)',
        shadow3: '0 4px 12px rgba(0, 0, 0, 0.5)',
        shadow4: '0 8px 24px rgba(0, 0, 0, 0.5)',
        transition: '0.2s ease-in-out'
      }
    },
    
    // 印刷主题（适合排版）
    print: {
      id: 'print',
      name: '印刷',
      description: '优化阅读和打印的主题',
      colors: {
        primary: '#000000',
        secondary: '#505050',
        background: '#ffffff',
        surface: '#f8f8f8',
        text: '#202020',
        textSecondary: '#505050',
        border: '#d0d0d0',
        error: '#b00000',
        warning: '#c06000',
        success: '#008000',
        selection: 'rgba(0, 0, 0, 0.1)',
        codeBackground: '#f8f8f8',
        codeText: '#202020',
        codeBorder: '#d0d0d0',
        codeComment: '#707070',
        codeKeyword: '#000000',
        codeString: '#008000',
        codeNumber: '#900000',
        codeFunction: '#800000',
        markdownHeading: '#000000',
        markdownLink: '#000080',
        markdownList: '#000000',
        markdownQuote: '#606060',
        markdownCode: '#800000',
        markdownHr: '#d0d0d0',
        insertionMarker: '#008000',
        deletionMarker: '#b00000',
        changeMarker: '#c06000',
        focusRing: '#000000',
        focusRingText: '#ffffff',
        tooltip: '#202020',
        tooltipBackground: '#ffffff',
        tooltipBorder: '#d0d0d0',
        dialogBackground: '#ffffff',
        dialogText: '#202020',
        dialogBorder: '#d0d0d0',
        menuBackground: '#ffffff',
        menuText: '#202020',
        menuHover: '#f0f0f0',
        menuBorder: '#d0d0d0'
      },
      typography: {
        fontFamily: "'Georgia', 'Times New Roman', serif",
        codeFontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', monospace",
        fontSize: '18px',
        lineHeight: '1.6',
        fontWeight: '400',
        headingFontWeight: '700',
        codeFontSize: '16px',
        codeLineHeight: '1.45',
        monospaceFontFeatures: "'calt' 1, 'zero' 1",
        letterSpacing: '0.01em',
        paragraphSpacing: '1.8em'
      },
      spacing: {
        xxsmall: '2px',
        xsmall: '4px',
        small: '8px',
        medium: '16px',
        large: '24px',
        xlarge: '32px',
        xxlarge: '48px',
        gutter: '24px',
        blockSpacing: '1.2em'
      },
      borders: {
        radius: '2px',
        width: '1px',
        focusRingWidth: '2px'
      },
      effects: {
        shadow1: 'none',
        shadow2: 'none',
        shadow3: 'none',
        shadow4: 'none',
        transition: '0.2s ease-in-out'
      }
    }
  };
  
  /**
   * 初始化主题管理器
   * @returns {boolean} 是否成功初始化
   */
  const init = () => {
    try {
      // 注册预定义主题
      Object.values(predefinedThemes).forEach(theme => {
        registerTheme(theme);
      });
      
      // 检测系统主题
      detectSystemTheme();
      
      // 创建样式元素
      createStyleElement();
      
      // 应用默认主题
      applyTheme(defaultTheme);
      
      // 设置容器属性
      container.setAttribute('data-theme', defaultTheme);
      
      // 监听系统主题变化
      setupSystemThemeListener();
      
      return true;
    } catch (error) {
      console.error('初始化主题管理器失败:', error);
      return false;
    }
  };
  
  /**
   * 注册新主题
   * @param {ThemeConfig} theme - 主题配置
   * @returns {boolean} 是否成功注册
   */
  const registerTheme = (theme) => {
    if (!theme || !theme.id) {
      return false;
    }
    
    // 存储主题
    themeState.themes.set(theme.id, theme);
    
    // 如果是自定义主题，添加到自定义主题集合
    if (theme.isCustom) {
      themeState.customThemes.set(theme.id, theme);
    }
    
    // 触发主题注册事件
    if (eventManager) {
      eventManager.core.dispatch('themeRegistered', null, {
        themeId: theme.id,
        isCustom: !!theme.isCustom,
        timestamp: Date.now()
      });
    }
    
    return true;
  };
  
  /**
   * 应用主题
   * @param {string} themeId - 主题ID
   * @returns {boolean} 是否成功应用
   */
  const applyTheme = (themeId) => {
    // 获取主题
    const theme = themeState.themes.get(themeId);
    
    if (!theme) {
      console.warn(`主题不存在: ${themeId}`);
      return false;
    }
    
    try {
      // 更新当前主题
      themeState.currentTheme = themeId;
      
      // 设置容器属性
      container.setAttribute('data-theme', themeId);
      
      // 生成CSS变量
      generateCSSVariables(theme);
      
      // 更新样式元素
      updateStyleElement();
      
      // 触发主题变更事件
      if (eventManager) {
        eventManager.core.dispatch('themeChanged', null, {
          themeId,
          theme,
          timestamp: Date.now()
        });
      }
      
      return true;
    } catch (error) {
      console.error(`应用主题失败: ${themeId}`, error);
      return false;
    }
  };
  
  /**
   * 创建样式元素
   */
  const createStyleElement = () => {
    // 如果已存在，先移除
    if (themeState.styleElement) {
      themeState.styleElement.parentNode.removeChild(themeState.styleElement);
    }
    
    // 创建新样式元素
    const style = document.createElement('style');
    style.id = 'editor-theme-styles';
    document.head.appendChild(style);
    
    // 存储样式元素
    themeState.styleElement = style;
  };
  
  /**
   * 更新样式元素内容
   */
  const updateStyleElement = () => {
    if (!themeState.styleElement) {
      createStyleElement();
    }
    
    // 构建CSS
    let css = '';
    
    // 添加根变量
    css += ':root {\n';
    themeState.variables.forEach((value, name) => {
      css += `  ${name}: ${value};\n`;
    });
    css += '}\n\n';
    
    // 添加主题特定样式
    const theme = themeState.themes.get(themeState.currentTheme);
    if (theme) {
      // 主题特定样式可以在这里添加
      css += generateThemeCSS(theme);
    }
    
    // 设置样式内容
    themeState.styleElement.textContent = css;
  };
  
  /**
   * 生成主题CSS
   * @param {ThemeConfig} theme - 主题配置
   * @returns {string} CSS代码
   */
  const generateThemeCSS = (theme) => {
    let css = '';
    
    // 主体样式
    css += `[data-theme="${theme.id}"] {\n`;
    css += '  color: var(--text-color);\n';
    css += '  background-color: var(--background-color);\n';
    css += '  font-family: var(--font-family);\n';
    css += '  font-size: var(--font-size);\n';
    css += '  line-height: var(--line-height);\n';
    css += '  letter-spacing: var(--letter-spacing);\n';
    css += '  transition: var(--transition);\n';
    css += '}\n\n';
    
    // 编辑器区域样式
    css += `[data-theme="${theme.id}"] .editor-content {\n`;
    css += '  padding: var(--gutter);\n';
    css += '  border: var(--border-width) solid var(--border-color);\n';
    css += '  border-radius: var(--border-radius);\n';
    css += '  background-color: var(--surface-color);\n';
    css += '  box-shadow: var(--shadow1);\n';
    css += '}\n\n';
    
    // 代码区域样式
    css += `[data-theme="${theme.id}"] .editor-code, `;
    css += `[data-theme="${theme.id}"] code {\n`;
    css += '  font-family: var(--code-font-family);\n';
    css += '  font-size: var(--code-font-size);\n';
    css += '  line-height: var(--code-line-height);\n';
    css += '  background-color: var(--code-background-color);\n';
    css += '  color: var(--code-text-color);\n';
    css += '  border: var(--border-width) solid var(--code-border-color);\n';
    css += '  border-radius: var(--border-radius);\n';
    css += '  padding: var(--small) var(--medium);\n';
    css += '}\n\n';
    
    // 高亮区域样式
    css += `[data-theme="${theme.id}"] ::selection {\n`;
    css += '  background-color: var(--selection-color);\n';
    css += '  color: var(--text-color);\n';
    css += '}\n\n';
    
    // 标题样式
    css += `[data-theme="${theme.id}"] h1, `;
    css += `[data-theme="${theme.id}"] h2, `;
    css += `[data-theme="${theme.id}"] h3, `;
    css += `[data-theme="${theme.id}"] h4, `;
    css += `[data-theme="${theme.id}"] h5, `;
    css += `[data-theme="${theme.id}"] h6 {\n`;
    css += '  color: var(--markdown-heading-color);\n';
    css += '  font-weight: var(--heading-font-weight);\n';
    css += '  margin-top: var(--block-spacing);\n';
    css += '  margin-bottom: var(--block-spacing);\n';
    css += '}\n\n';
    
    // 链接样式
    css += `[data-theme="${theme.id}"] a {\n`;
    css += '  color: var(--markdown-link-color);\n';
    css += '  text-decoration: none;\n';
    css += '}\n\n';
    
    css += `[data-theme="${theme.id}"] a:hover {\n`;
    css += '  text-decoration: underline;\n';
    css += '}\n\n';
    
    // 引用样式
    css += `[data-theme="${theme.id}"] blockquote {\n`;
    css += '  border-left: 4px solid var(--markdown-quote-color);\n';
    css += '  color: var(--markdown-quote-color);\n';
    css += '  padding-left: var(--medium);\n';
    css += '  margin-left: var(--medium);\n';
    css += '  margin-right: var(--medium);\n';
    css += '}\n\n';
    
    // 列表样式
    css += `[data-theme="${theme.id}"] ul, `;
    css += `[data-theme="${theme.id}"] ol {\n`;
    css += '  color: var(--text-color);\n';
    css += '  padding-left: var(--large);\n';
    css += '}\n\n';
    
    // 专门为我们的绘图画布添加样式
    css += `[data-theme="${theme.id}"] .editor-drawing-canvas {\n`;
    css += '  position: absolute;\n';
    css += '  top: 0;\n';
    css += '  left: 0;\n';
    css += '  pointer-events: none;\n';
    css += '  z-index: 10;\n';
    css += '}\n\n';
    
    // 协作光标样式
    css += `[data-theme="${theme.id}"] .collaboration-cursor {\n`;
    css += '  position: absolute;\n';
    css += '  width: 2px;\n';
    css += '  height: 20px;\n';
    css += '  background-color: var(--primary-color);\n';
    css += '  z-index: 5;\n';
    css += '}\n\n';
    
    css += `[data-theme="${theme.id}"] .collaboration-label {\n`;
    css += '  position: absolute;\n';
    css += '  background-color: var(--primary-color);\n';
    css += '  color: var(--background-color);\n';
    css += '  font-size: 12px;\n';
    css += '  line-height: 1;\n';
    css += '  padding: 2px 4px;\n';
    css += '  border-radius: 2px;\n';
    css += '  white-space: nowrap;\n';
    css += '  z-index: 5;\n';
    css += '  transform: translateY(-100%);\n';
    css += '}\n\n';
    
    return css;
  };
  
  /**
   * 生成CSS变量
   * @param {ThemeConfig} theme - 主题配置
   */
  const generateCSSVariables = (theme) => {
    // 清空现有变量
    themeState.variables.clear();
    
    // 设置颜色变量
    Object.entries(theme.colors).forEach(([key, value]) => {
      themeState.variables.set(`--${kebabCase(key)}-color`, value);
    });
    
    // 设置排版变量
    Object.entries(theme.typography).forEach(([key, value]) => {
      themeState.variables.set(`--${kebabCase(key)}`, value);
    });
    
    // 设置间距变量
    Object.entries(theme.spacing).forEach(([key, value]) => {
      themeState.variables.set(`--${kebabCase(key)}`, value);
    });
    
    // 设置边框变量
    Object.entries(theme.borders).forEach(([key, value]) => {
      themeState.variables.set(`--${kebabCase(key)}`, value);
    });
    
    // 设置效果变量
    Object.entries(theme.effects).forEach(([key, value]) => {
      themeState.variables.set(`--${kebabCase(key)}`, value);
    });
  };
  
  /**
   * 将驼峰命名转换为短横线命名
   * @param {string} str - 驼峰命名字符串
   * @returns {string} 短横线命名字符串
   */
  const kebabCase = (str) => {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  };
  
  /**
   * 创建自定义主题
   * @param {Object} themeConfig - 主题配置
   * @returns {string|null} 主题ID或null
   */
  const createCustomTheme = (themeConfig) => {
    try {
      // 验证主题配置
      if (!themeConfig || !themeConfig.name) {
        throw new Error('无效的主题配置');
      }
      
      // 生成唯一ID
      const themeId = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // 获取基础主题
      const baseTheme = themeState.themes.get(themeConfig.baseTheme || 'light');
      
      if (!baseTheme) {
        throw new Error('找不到基础主题');
      }
      
      // 创建新主题
      const newTheme = {
        id: themeId,
        name: themeConfig.name,
        description: themeConfig.description || `基于${baseTheme.name}的自定义主题`,
        isCustom: true,
        baseTheme: themeConfig.baseTheme || 'light',
        colors: { ...baseTheme.colors, ...themeConfig.colors },
        typography: { ...baseTheme.typography, ...themeConfig.typography },
        spacing: { ...baseTheme.spacing, ...themeConfig.spacing },
        borders: { ...baseTheme.borders, ...themeConfig.borders },
        effects: { ...baseTheme.effects, ...themeConfig.effects }
      };
      
      // 注册新主题
      registerTheme(newTheme);
      
      // 返回主题ID
      return themeId;
    } catch (error) {
      console.error('创建自定义主题失败:', error);
      return null;
    }
  };
  
  /**
   * 删除自定义主题
   * @param {string} themeId - 主题ID
   * @returns {boolean} 是否成功删除
   */
  const deleteCustomTheme = (themeId) => {
    // 检查是否为自定义主题
    if (!themeState.customThemes.has(themeId)) {
      console.warn(`不是自定义主题或主题不存在: ${themeId}`);
      return false;
    }
    
    try {
      // 如果正在使用此主题，切换到默认主题
      if (themeState.currentTheme === themeId) {
        applyTheme(defaultTheme);
      }
      
      // 从集合中删除
      themeState.customThemes.delete(themeId);
      themeState.themes.delete(themeId);
      
      // 触发主题删除事件
      if (eventManager) {
        eventManager.core.dispatch('themeDeleted', null, {
          themeId,
          timestamp: Date.now()
        });
      }
      
      return true;
    } catch (error) {
      console.error(`删除自定义主题失败: ${themeId}`, error);
      return false;
    }
  };
  
  /**
   * 检测系统主题
   */
  const detectSystemTheme = () => {
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      themeState.systemTheme = darkModeQuery.matches ? 'dark' : 'light';
    }
  };
  
  /**
   * 设置系统主题监听器
   */
  const setupSystemThemeListener = () => {
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      // 添加变化监听器
      try {
        // 现代浏览器
        darkModeQuery.addEventListener('change', (e) => {
          themeState.systemTheme = e.matches ? 'dark' : 'light';
          
          // 触发系统主题变更事件
          if (eventManager) {
            eventManager.core.dispatch('systemThemeChanged', null, {
              theme: themeState.systemTheme,
              timestamp: Date.now()
            });
          }
        });
      } catch (error) {
        // 回退到旧API
        darkModeQuery.addListener((e) => {
          themeState.systemTheme = e.matches ? 'dark' : 'light';
          
          // 触发系统主题变更事件
          if (eventManager) {
            eventManager.core.dispatch('systemThemeChanged', null, {
              theme: themeState.systemTheme,
              timestamp: Date.now()
            });
          }
        });
      }
    }
  };
  
  /**
   * 根据系统主题自动切换
   * @returns {boolean} 是否成功切换
   */
  const followSystemTheme = () => {
    return applyTheme(themeState.systemTheme);
  };
  
  /**
   * 导出主题为JSON
   * @param {string} themeId - 主题ID
   * @returns {Object|null} 主题配置或null
   */
  const exportTheme = (themeId) => {
    const theme = themeState.themes.get(themeId);
    
    if (!theme) {
      console.warn(`主题不存在: ${themeId}`);
      return null;
    }
    
    // 创建可导出的副本
    const exportedTheme = {
      id: theme.id,
      name: theme.name,
      description: theme.description,
      isCustom: theme.isCustom,
      baseTheme: theme.baseTheme,
      colors: { ...theme.colors },
      typography: { ...theme.typography },
      spacing: { ...theme.spacing },
      borders: { ...theme.borders },
      effects: { ...theme.effects }
    };
    
    return exportedTheme;
  };
  
  /**
   * 导入主题
   * @param {Object} themeConfig - 主题配置
   * @returns {string|null} 主题ID或null
   */
  const importTheme = (themeConfig) => {
    try {
      // 验证主题配置
      if (!themeConfig || !themeConfig.name || !themeConfig.colors) {
        throw new Error('无效的主题配置');
      }
      
      // 生成唯一ID
      const themeId = themeConfig.id || `imported-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // 创建导入主题
      const importedTheme = {
        id: themeId,
        name: themeConfig.name,
        description: themeConfig.description || '导入的主题',
        isCustom: true,
        baseTheme: themeConfig.baseTheme,
        colors: { ...themeConfig.colors },
        typography: { ...themeConfig.typography },
        spacing: { ...themeConfig.spacing },
        borders: { ...themeConfig.borders },
        effects: { ...themeConfig.effects }
      };
      
      // 注册主题
      registerTheme(importedTheme);
      
      // 触发主题导入事件
      if (eventManager) {
        eventManager.core.dispatch('themeImported', null, {
          themeId,
          timestamp: Date.now()
        });
      }
      
      return themeId;
    } catch (error) {
      console.error('导入主题失败:', error);
      return null;
    }
  };
  
  /**
   * 获取当前主题
   * @returns {Object} 当前主题
   */
  const getCurrentTheme = () => {
    return themeState.themes.get(themeState.currentTheme);
  };
  
  /**
   * 获取所有主题
   * @returns {Object[]} 主题数组
   */
  const getAllThemes = () => {
    return Array.from(themeState.themes.values());
  };
  
  /**
   * 获取所有自定义主题
   * @returns {Object[]} 自定义主题数组
   */
  const getCustomThemes = () => {
    return Array.from(themeState.customThemes.values());
  };
  
  /**
   * 获取系统主题
   * @returns {string} 系统主题
   */
  const getSystemTheme = () => {
    return themeState.systemTheme;
  };
  
  /**
   * 清理主题管理器资源
   */
  const cleanup = () => {
    try {
      // 移除样式元素
      if (themeState.styleElement && themeState.styleElement.parentNode) {
        themeState.styleElement.parentNode.removeChild(themeState.styleElement);
      }
      
      // 清空集合
      themeState.themes.clear();
      themeState.variables.clear();
      themeState.customThemes.clear();
      
      // 触发清理事件
      if (eventManager) {
        eventManager.core.dispatch('themeManagerCleanup', null, {
          timestamp: Date.now()
        });
      }
      
      return true;
    } catch (error) {
      console.error('清理主题管理器失败:', error);
      return false;
    }
  };
  
  // 初始化
  init();
  
  // 返回公共API
  return {
    applyTheme,
    registerTheme,
    createCustomTheme,
    deleteCustomTheme,
    exportTheme,
    importTheme,
    followSystemTheme,
    getCurrentTheme,
    getAllThemes,
    getCustomThemes,
    getSystemTheme,
    cleanup
  };
}; 