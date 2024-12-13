import { createBookmark } from '../builder.js';

/**
 * 网页元数据解析结果
 * @typedef {Object} WebPageMeta
 * @property {string} title - 页面标题
 * @property {string} description - 页面描述
 * @property {string} [favicon] - 网站图标
 * @property {string[]} [keywords] - 关键词
 * @property {string} [author] - 作者
 * @property {string} [image] - 主图
 * @property {string} [type] - 内容类型
 * @property {string} [feed] - RSS Feed URL
 */

// 保存全局复用的 webview 实例
let globalWebview = null;

/**
 * 从网页内容解析元数据
 * @param {string} url 网页URL
 * @param {Object} options 配置选项
 * @returns {Promise<WebPageMeta>}
 */
async function parseWebPageMeta(url, options = {}) {
  const { webview: existingWebview, timeout = 10000, userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' } = options;
  
  let webview = existingWebview;
  let needsCleanup = false;

  try {
    // 如果没有提供 webview，使用或创建全局 webview
    if (!webview) {
      if (!globalWebview) {
        globalWebview = document.createElement('webview');
        
        // 设置基本属性 - 默认可见
        Object.assign(webview.style, {
          width: '1024px',
          height: '768px'
        });
        
        // 设置 webview 属性
        webview.setAttribute('partition', 'persist:webcrawler');
        webview.setAttribute('useragent', userAgent);
        webview.setAttribute('allowpopups', 'false');
        
        // 添加到文档中
        document.body.appendChild(webview);
        
        // 等待 webview 初始化完成
        await new Promise(resolve => {
          webview.addEventListener('dom-ready', resolve, { once: true });
        });
      }
      webview = globalWebview;
    }

    // 配置 webview
    await webview.executeJavaScript(`
      // 禁用 JavaScript 弹窗
      window.alert = window.confirm = window.prompt = () => {};
      
      // 模拟常见的浏览器环境变量
      Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
      Object.defineProperty(navigator, 'language', { get: () => 'zh-CN' });
      
      // 禁用一些可能影响解析的特性
      Object.defineProperty(window, 'requestAnimationFrame', { value: null });
      Object.defineProperty(window, 'cancelAnimationFrame', { value: null });
    `, true);

    // 加载 URL
    await webview.loadURL(url);
    
    // 等待页面加载完成
    await new Promise((resolve, reject) => {
      const loadTimeout = setTimeout(() => {
        reject(new Error('页面加载超时'));
      }, timeout);

      // 监听加载完成事件
      const loadHandler = () => {
        clearTimeout(loadTimeout);
        // 给页面一些额外时间处理动态内容
        setTimeout(resolve, 500);
      };

      // 监听各种加载状态
      webview.addEventListener('did-finish-load', loadHandler, { once: true });
      webview.addEventListener('did-fail-load', (event) => {
        clearTimeout(loadTimeout);
        reject(new Error(`页面加载失败: ${event.errorDescription}`));
      }, { once: true });
      
      // 监听渲染进程崩溃
      webview.addEventListener('crashed', () => {
        clearTimeout(loadTimeout);
        reject(new Error('渲染进程崩溃'));
      }, { once: true });
    });

    // 解析元数据
    const meta = await webview.executeJavaScript(`
      (function() {
        const meta = {};
        
        // 解析标题
        meta.title = document.title || '';
        
        // 解析 meta 标签
        const getMeta = (name) => {
          const el = document.querySelector(\`meta[name="\${name}"], meta[property="\${name}"], meta[property="og:\${name}"]\`);
          return el ? el.getAttribute('content') : null;
        };
        
        // 解析描述
        meta.description = getMeta('description') || '';
        
        // 解析关键词
        meta.keywords = getMeta('keywords')?.split(',').map(k => k.trim()) || [];
        
        // 解析作者
        meta.author = getMeta('author') || '';
        
        // 解析主图
        meta.image = getMeta('image') || '';
        
        // 解析内容类型
        meta.type = getMeta('type') || '';
        
        // 解析 favicon
        const getFavicon = () => {
          const selectors = [
            'link[rel="icon"][sizes="32x32"]',
            'link[rel="icon"][sizes="192x192"]',
            'link[rel="apple-touch-icon"]',
            'link[rel="icon"]',
            'link[rel="shortcut icon"]'
          ];
          
          for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el && el.href) {
              return new URL(el.href, document.baseURI).href;
            }
          }
          return '';
        };
        
        meta.favicon = getFavicon();
        
        // 解析 RSS Feed
        const feed = document.querySelector('link[type="application/rss+xml"], link[type="application/atom+xml"]');
        meta.feed = feed ? new URL(feed.href, document.baseURI).href : '';
        
        // 解析站点名称
        meta.siteName = getMeta('site_name') || '';
        
        // 解析发布时间
        meta.publishedTime = getMeta('published_time') || getMeta('article:published_time') || '';
        
        // 增加更多元数据解析
        // 解析语言
        meta.language = document.documentElement.lang || getMeta('language') || '';
        
        // 解析主题色
        meta.themeColor = getMeta('theme-color') || '';
        
        // 解析更新时间
        meta.modifiedTime = getMeta('modified_time') || getMeta('article:modified_time') || '';
        
        // 解析阅读时间
        meta.readingTime = getMeta('reading_time') || '';
        
        // 数据验证
        Object.keys(meta).forEach(key => {
          if (typeof meta[key] === 'string') {
            meta[key] = meta[key].trim();
          }
        });
        
        return meta;
      })()
    `, false);

    return meta;

  } catch (error) {
    throw new Error(`解析页面元数据失败: ${error.message}`);
  }
}

// 提供一个清理方法，在需要时手动调用
function cleanup() {
  if (globalWebview) {
    globalWebview.remove();
    globalWebview = null;
  }
}

/**
 * 从网页创建 URT 资源
 * @param {string} url 网页URL
 * @param {Object} options 配置选项
 * @returns {Promise<URTResource>}
 */
async function fromWebPage(url, options = {}) {
  try {
    // 验证 URL
    if (!url || typeof url !== 'string') {
      throw new Error('无效的 URL');
    }
    
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const defaultFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    
    // 增加错误重试逻辑
    let retries = options.retries || 3;
    let meta;
    
    while (retries > 0) {
      try {
        meta = await parseWebPageMeta(url, options);
        break;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // 创建书签资源
    return createBookmark(meta.title || url, url, {
      meta: {
        created: Date.now().toString(),
        modified: Date.now().toString(),
        thumb: meta.image || null
      },
      extra: {
        favicon: meta.favicon || defaultFavicon,
        description: meta.description || '',
        tags: meta.keywords || [],
        domain,
        protocol: urlObj.protocol,
        pathname: urlObj.pathname,
        search: urlObj.search,
        hash: urlObj.hash,
        meta: {
          author: meta.author,
          type: meta.type,
          siteName: meta.siteName,
          publishedTime: meta.publishedTime,
          feed: meta.feed
        },
        reading: {
          progress: 0,
          highlights: [],
          archived: false,
          favorite: false,
          addedAt: new Date().toISOString()
        }
      },
      provenance: {
        source: 'web-parser',
        sourceId: url,
        importedAt: new Date().toISOString(),
        importVersion: '1.0.0',
        originalData: meta
      }
    });
  } catch (error) {
    console.error('从网页创建资源失败:', error);
    // 如果解析失败，返回基本书签
    return createBookmark(url, url, {
      meta: {
        created: Date.now().toString(),
        modified: Date.now().toString()
      },
      extra: {
        favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`
      }
    });
  }
}

export {
  parseWebPageMeta,
  cleanup,
  fromWebPage
};
