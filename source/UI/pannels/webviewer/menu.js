import { clientApi, plugin } from '../../../asyncModules.js';
import { showStreamingChatDialog } from '../../dialogs/streamingChatDialog.js'
import { 刷新页面菜单项 } from './menuItems/main.js';
import { 提取店铺信息菜单项, 查找五家推荐店铺菜单项 } from './menuItems/大众点评专属.js';
import { 创建网页浏览器上下文 } from './webviewContext/index.js';
const remote = require('@electron/remote')
const 实例化网页electron菜单项 = (网页浏览器上下文, 原始菜单项) => {
  return new remote.MenuItem({
    label: 原始菜单项.label,
    click: (e) => {
      原始菜单项.click({
        ...网页浏览器上下文,
        event: e
      }
      )
    }
  })
}
const 过滤网页electron菜单项 = async (菜单项数组, 网页浏览器上下文) => {
  const 超时时间 = 10; // 设置100ms的超时时间
  
  const 过滤单个菜单项 = async (菜单项) => {
    // 如果没有filter函数，默认显示
    if (!菜单项.filter) return true;

    try {
      // 创建一个Promise，包含超时控制
      const 结果 = await Promise.race([
        // 将同步函数也封装为异步函数
        Promise.resolve().then(() => 菜单项.filter(网页浏览器上下文)),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('过滤函数执行超时')), 超时时间)
        )
      ]);
      
      return 结果;
    } catch (错误) {
      console.warn(`菜单项 "${菜单项.label}" 的过滤函数执行失败: ${错误.message}`);
      return false; // 发生错误时不显示该菜单项
    }
  };

  const 过滤后的菜单项 = await Promise.all(
    菜单项数组.map(async (菜单项) => {
      const 应该显示 = await 过滤单个菜单项(菜单项);
      return 应该显示 ? 菜单项 : null;
    })
  );

  // 移除null值并返回结果
  return 过滤后的菜单项.filter(项 => 项 !== null);
};



export function createContextMenu({ remote, webviewRef, selectionText, linkURL, onShowMask }) {
  const menu = new remote.Menu();
  const 网页浏览器上下文 = 创建网页浏览器上下文(webviewRef)
  menu.append(实例化网页electron菜单项(网页浏览器上下文, 刷新页面菜单项));

  // 添加 AI 总结页面内容的菜单项
  menu.append(new remote.MenuItem({
    label: 'AI 总结页面内容',
    click: async () => {
      try {
        // 获取页面内容
        const pageContent = await webviewRef.executeJavaScript(`
          document.body.innerText
        `);

        // 准备发送给 AI 的消息
        const messages = [
          {
            role: 'system',
            content: '请总结以下网页内容的主要观点，用简洁的中文表达。'
          },
          {
            role: 'user',
            content: pageContent
          }
        ];

        // 显示对话框并开始流式响应
        const emitter = await showStreamingChatDialog(messages, window.siyuan?.config?.ai?.openAI || {
          endpoint: 'https://api.openai.com/v1',
          apiKey: '',
          model: 'gpt-3.5-turbo'
        });

        // 开始流式处理
        emitter.emit('start');
      } catch (error) {
        console.error('AI 总结失败:', error);
      }
    }
  }));

  // 添加大众点评店铺信息提取菜单项
  const currentURL = webviewRef.getURL();
  if (currentURL.includes('dianping.com/shopold')||currentURL.includes('dianping.com/shop')) {
    menu.append(实例化网页electron菜单项(网页浏览器上下文,提取店铺信息菜单项));
  }

  // 修正城市页面 URL 匹配
  if (currentURL.match(/dianping\.com\/(?!shop|shopold|review|photos|map|search|list|deal)/)) {
    menu.append(实例化网页electron菜单项(网页浏览器上下文,查找五家推荐店铺菜单项));

    menu.append(new remote.MenuItem({
      label: '提取店铺列表',
      click: async () => {
        try {
          // 获取页面上所有店铺信息
          const shopsData = await webviewRef.executeJavaScript(`
function getCleanHTML() {
    // 克隆整个文档
    const clone = document.cloneNode(true);
    
    // 移除所有script和style标签
    clone.querySelectorAll('script, style, link[rel="stylesheet"]').forEach(el => el.remove());
    
    // 移除head标签
    const head = clone.querySelector('head');
    if (head) head.remove();
    
    // 返回处理后的HTML
    return clone.documentElement.outerHTML;
}

// 使用示例
 getCleanHTML();
          `);

          let csvContent = '';
          const messages = [
            {
              role: 'system',
              content: `请将以下店铺信息转换为CSV格式，第一行为表头。请按照以下格式输出：
店铺名称,评分,分类,人均消费,位置,评价数量

示例输出：
店铺名称,评分,分类,人均消费,位置,评价数量
聚丰园饺子馆,4.5,饺子馆,45元,北京市海淀区中关村大街1号,1234

请严格按照上述格式输出，不要添加其他内容。如果字段值中包含逗号，请用双引号将该字段值包裹。`
            },
            {
              role: 'user',
              content: JSON.stringify(shopsData)
            }
          ];

          const emitter = await showStreamingChatDialog(messages, window.siyuan?.config?.ai?.openAI || {
            endpoint: 'https://api.openai.com/v1',
            apiKey: '',
            model: 'gpt-3.5-turbo'
          });

          // 监听数据
          emitter.on('data', (text) => {
            csvContent += text;
          });

          // 监听结束事件
          emitter.on('end', () => {
            // 移除 think 标签及其内容
            csvContent = csvContent
              .replace(/<think[\s\S]*?<\/think>/g, '')
              .replace(/<think>.*?<\/think>/g, '')
              .replace(/^\s*[\r\n]/gm, '')
              .trim();

            // 修正城市名称提取逻辑
            const cityName = currentURL.split('dianping.com/')[1].split('/')[0];
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const fileName = `${cityName}_shops_${timestamp}.csv`;

            // 创建下载链接
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          });

          // 开始流式处理
          emitter.emit('start');
        } catch (error) {
          console.error('店铺列表提取失败:', error);
        }
      }
    }));
  }

  // 如果有链接URL，添加链接相关选项
  if (linkURL) {
    // 在当前页签打开
    menu.append(new remote.MenuItem({
      label: '在当前页签打开链接',
      click: () => webviewRef.loadURL(linkURL)
    }));

    // 在新页签打开
    menu.append(new remote.MenuItem({
      label: '在新页签打开链接',
      click: () => {
        clientApi.openTab({
          app: window.siyuan.ws.app,
          custom: {
            icon: 'iconLink',
            title: '网页浏览',
            id: plugin.name + "webviewer" + "Tab",
            data: {
              url: linkURL
            }
          },

        });
      }
    }));
  }

  // 如果有选中文本，添加相关菜单项
  if (selectionText) {
    // 添加复制选项
    menu.append(new remote.MenuItem({
      role: 'copy',
      label: '复制'
    }));

    // 添加搜索思源选项
    menu.append(new remote.MenuItem({
      label: '搜索思源',
      click: () => {
        // TODO: 实现搜索思源功能
        onShowMask();
      }
    }));
  }

  return menu;
} 