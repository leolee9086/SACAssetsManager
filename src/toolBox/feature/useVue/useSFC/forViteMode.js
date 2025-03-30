/**
 * Vite风格的Vue组件加载器
 * 
 * 提供类似Vite的开发体验，包括：
 * 1. 快速冷启动 - 利用ESM直接加载
 * 2. 按需编译 - 只编译当前需要的文件
 * 3. 热模块替换(HMR) - 无需刷新页面的模块热替换
 * 4. 依赖预打包管理 - 智能处理依赖
 */

import { 修复URL格式, 创建样式管理器, 获取组件内容, 导入并缓存模块 } from './forVueCache.js';
import { 加载历史记录 } from './forVueError.js';
import { 处理模块 } from './forVueLoader.js';

/**
 * 解析文件路径
 * @param {string} 基础路径 - 基础目录路径
 * @param {string} 相对路径 - 相对路径
 * @returns {string} 完整路径
 */
const 解析路径 = (基础路径, 相对路径) => {
  if (相对路径.startsWith('/') || 相对路径.startsWith('http')) {
    return 相对路径;
  }
  
  // 简单的路径解析
  const 路径部分 = 基础路径.split('/');
  路径部分.pop(); // 移除文件名
  
  const 相对部分 = 相对路径.split('/');
  相对部分.forEach(部分 => {
    if (部分 === '..') {
      路径部分.pop();
    } else if (部分 !== '.') {
      路径部分.push(部分);
    }
  });
  
  return 路径部分.join('/');
};

/**
 * 创建ES模块内容
 * @param {string} 内容 - 源代码内容
 * @param {string} 文件路径 - 文件路径
 * @returns {string} 处理后的ES模块内容
 */
const 创建ES模块 = (内容, 文件路径) => {
  if (文件路径.endsWith('.vue')) {
    // 这里我们可以使用@babel工具处理SFC文件
    // 但简单起见，我们只提取script部分并转换为ESM
    const scriptMatch = 内容.match(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/);
    if (scriptMatch) {
      let scriptContent = scriptMatch[2];
      
      // 处理<script setup>
      if (scriptMatch[1] && scriptMatch[1].includes('setup')) {
        return `
          // 从 ${文件路径} 提取的代码
          ${scriptContent}
          // HMR 支持
          if (import.meta.hot) {
            import.meta.hot.accept();
          }
        `;
      } 
      
      // 处理普通<script>
      return `
        // 从 ${文件路径} 提取的代码
        ${scriptContent}
        // HMR 支持
        if (import.meta.hot) {
          import.meta.hot.accept();
        }
      `;
    }
    
    return `
      // ${文件路径} 不包含script标签
      export default {};
    `;
  }
  
  // 处理JS文件
  if (文件路径.endsWith('.js')) {
    return `
      // 从 ${文件路径} 提取的代码
      ${内容}
      // HMR 支持
      if (import.meta.hot) {
        import.meta.hot.accept();
      }
    `;
  }
  
  // 处理JSON文件
  if (文件路径.endsWith('.json')) {
    try {
      const json = JSON.parse(内容);
      return `export default ${内容};`;
    } catch (错误) {
      console.error(`解析JSON文件失败: ${文件路径}`, 错误);
      return `export default {};`;
    }
  }
  
  // 处理CSS文件
  if (文件路径.endsWith('.css')) {
    return `
      // 从 ${文件路径} 创建的样式模块
      const style = document.createElement('style');
      style.textContent = ${JSON.stringify(内容)};
      document.head.appendChild(style);
      export default {};
    `;
  }
  
  // 默认行为
  return `
    // 未知文件类型: ${文件路径}
    export default ${JSON.stringify(内容)};
  `;
};

/**
 * 创建运行时编译器
 * 提供类似Vite的即时编译能力
 * @param {Object} 选项 - 编译器选项
 * @returns {Object} 编译工具对象
 */
export const 创建运行时编译器 = (选项 = {}) => {
  const 基础路径 = 选项.基础路径 || '/';
  const 模块映射 = new Map();
  const 热重载回调 = new Map();
  const 样式管理器 = 创建样式管理器();
  
  // 创建虚拟模块系统
  const 创建虚拟模块 = async (路径) => {
    try {
      // 获取文件内容
      const { 内容 } = await 获取组件内容(路径);
      
      // 创建模块代码
      const 模块代码 = 创建ES模块(内容, 路径);
      
      // 创建模块URL
      const blob = new Blob([模块代码], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      
      return {
        路径,
        url,
        内容,
        模块代码
      };
    } catch (错误) {
      console.error(`创建虚拟模块失败: ${路径}`, 错误);
      throw 错误;
    }
  };
  
  // 导入模块
  const 导入模块 = async (路径) => {
    const 完整路径 = 解析路径(基础路径, 路径);
    
    // 检查是否已缓存
    if (模块映射.has(完整路径)) {
      return 模块映射.get(完整路径).模块;
    }
    
    // 创建虚拟模块
    const 虚拟模块 = await 创建虚拟模块(完整路径);
    
    try {
      // 动态导入模块
      const 模块 = await import(虚拟模块.url);
      
      // 缓存模块
      模块映射.set(完整路径, {
        ...虚拟模块,
        模块
      });
      
      return 模块;
    } catch (错误) {
      console.error(`导入模块失败: ${完整路径}`, 错误);
      throw 错误;
    }
  };
  
  // 热重载实现
  const 热重载API = {
    // 接受热更新
    accept(回调) {
      const 当前模块 = new Error().stack.split('\n')[2].match(/at\s+(.+):\d+:\d+/)[1];
      热重载回调.set(当前模块, 回调 || (() => console.log(`模块更新: ${当前模块}`)));
    },
    
    // 定义导出更新处理
    acceptExports(导出名, 回调) {
      const 当前模块 = new Error().stack.split('\n')[2].match(/at\s+(.+):\d+:\d+/)[1];
      热重载回调.set(`${当前模块}:${导出名}`, 回调);
    }
  };
  
  // 执行热重载
  const 执行热重载 = async (路径) => {
    if (!热重载回调.has(路径)) {
      console.log(`没有热重载处理程序: ${路径}`);
      return false;
    }
    
    try {
      // 获取回调
      const 回调 = 热重载回调.get(路径);
      
      // 重新加载模块
      const 模块 = await 导入模块(路径);
      
      // 执行回调
      await 回调(模块);
      return true;
    } catch (错误) {
      console.error(`热重载失败: ${路径}`, 错误);
      return false;
    }
  };
  
  // 外部接口
  return {
    /**
     * 解析模块
     * @param {string} 路径 - 模块路径 
     * @returns {Promise<Object>} 解析后的模块
     */
    async 解析(路径) {
      return await 导入模块(路径);
    },
    
    /**
     * 热更新模块
     * @param {string} 路径 - 需要热更新的模块路径
     * @returns {Promise<boolean>} 是否成功更新
     */
    async 热更新(路径) {
      return await 执行热重载(路径);
    },
    
    /**
     * 创建导入映射
     * @param {Object} 依赖 - 依赖映射表
     * @returns {Object} 处理后的依赖映射
     */
    创建导入映射(依赖 = {}) {
      return Object.entries(依赖).reduce((映射, [名称, 路径]) => {
        映射[名称] = 解析路径(基础路径, 路径);
        return 映射;
      }, {});
    },
    
    /**
     * 获取ES模块URL
     * @param {string} 路径 - 模块路径
     * @returns {Promise<string>} 模块URL
     */
    async 获取模块URL(路径) {
      const 完整路径 = 解析路径(基础路径, 路径);
      
      if (!模块映射.has(完整路径)) {
        const 虚拟模块 = await 创建虚拟模块(完整路径);
        模块映射.set(完整路径, 虚拟模块);
      }
      
      return 模块映射.get(完整路径).url;
    },
    
    /**
     * 获取热重载API
     * @returns {Object} 热重载API
     */
    获取热重载API() {
      return 热重载API;
    },
    
    /**
     * 获取样式管理器
     * @returns {Object} 样式管理器
     */
    获取样式管理器() {
      return 样式管理器;
    },
    
    /**
     * 释放资源
     */
    清理() {
      // 清理Blob URLs
      模块映射.forEach(模块 => {
        if (模块.url) {
          URL.revokeObjectURL(模块.url);
        }
      });
      
      // 清理样式
      样式管理器.清空样式();
      
      // 清空缓存
      模块映射.clear();
      热重载回调.clear();
    }
  };
};

/**
 * 创建Vite风格开发服务器
 * @param {Object} 选项 - 服务器选项
 * @returns {Object} 开发服务器对象
 */
export const 创建开发服务器 = (选项 = {}) => {
  const 编译器 = 创建运行时编译器(选项);
  const 监视器映射 = new Map();
  const 已处理文件 = new Set();
  
  // 处理热更新
  const 处理文件变化 = async (文件路径) => {
    if (已处理文件.has(文件路径)) {
      return;
    }
    
    已处理文件.add(文件路径);
    setTimeout(() => 已处理文件.delete(文件路径), 100);
    
    console.log(`文件变化: ${文件路径}`);
    
    // 执行热重载
    const 成功 = await 编译器.热更新(文件路径);
    if (!成功) {
      console.log(`无法热重载，尝试完全重载: ${文件路径}`);
      // 这里可以实现完全页面重载逻辑
    }
  };
  
  // 设置文件监视（在Electron环境使用fs.watch，在浏览器环境可使用WebSocket）
  const 监视文件 = (路径) => {
    if (监视器映射.has(路径)) {
      return;
    }
    
    // 检查是否在Electron环境
    if (window.require && typeof window.require === 'function') {
      try {
        const fs = window.require('fs');
        
        if (fs && fs.watch) {
          const 监视器 = fs.watch(路径, { recursive: true }, (事件类型, 文件名) => {
            const 完整路径 = 路径 + '/' + 文件名;
            处理文件变化(完整路径);
          });
          
          监视器映射.set(路径, 监视器);
          console.log(`开始监视目录: ${路径}`);
        }
      } catch (错误) {
        console.warn(`设置文件监视失败: ${错误.message}`);
      }
    } else {
      console.log('不在Electron环境，使用基于WebSocket的文件监视');
      // 这里可以实现基于WebSocket的监视逻辑
    }
  };
  
  // 解析并加载Vue组件
  const 加载Vue组件 = async (路径, 选项 = {}) => {
    try {
      加载历史记录.记录事件('开始加载Vue组件', 路径);
      
      // 获取文件内容
      const { 内容 } = await 获取组件内容(路径);
      
      // 解析Vue组件
      const script模式 = 内容.match(/<script(\s+[^>]*)?>([\s\S]*?)<\/script>/);
      const template模式 = 内容.match(/<template>([\s\S]*?)<\/template>/);
      const style模式 = 内容.match(/<style(\s+[^>]*)?>([\s\S]*?)<\/style>/g);
      
      // 创建组件对象
      const 组件对象 = {
        名称: 选项.名称 || '动态组件',
        template: template模式 ? template模式[1] : '<div>无模板内容</div>',
        // 这里需要更复杂的逻辑来转换script中的内容为组件选项
      };
      
      // 处理样式
      if (style模式) {
        const 样式管理器 = 编译器.获取样式管理器();
        style模式.forEach(style => {
          const 内容 = style.match(/<style(\s+[^>]*)?>([\s\S]*?)<\/style>/)[2];
          const style元素 = document.createElement('style');
          style元素.textContent = 内容;
          document.head.appendChild(style元素);
          样式管理器.添加样式(style元素);
        });
      }
      
      return 组件对象;
    } catch (错误) {
      加载历史记录.记录错误(错误, `加载Vue组件失败: ${路径}`);
      throw 错误;
    }
  };
  
  // 返回服务器对象
  return {
    /**
     * 获取编译器
     * @returns {Object} 运行时编译器
     */
    获取编译器() {
      return 编译器;
    },
    
    /**
     * 加载组件
     * @param {string} 路径 - 组件路径
     * @param {Object} 选项 - 加载选项
     * @returns {Promise<Object>} Vue组件
     */
    async 加载组件(路径, 选项 = {}) {
      return await 加载Vue组件(路径, 选项);
    },
    
    /**
     * 启用监视
     * @param {string} 路径 - 监视的目录路径
     */
    启用监视(路径) {
      监视文件(路径);
    },
    
    /**
     * 停止监视
     * @param {string} 路径 - 停止监视的目录路径
     */
    停止监视(路径) {
      if (监视器映射.has(路径)) {
        const 监视器 = 监视器映射.get(路径);
        监视器.close();
        监视器映射.delete(路径);
        console.log(`停止监视目录: ${路径}`);
      }
    },
    
    /**
     * 停止所有监视
     */
    停止所有监视() {
      监视器映射.forEach((监视器, 路径) => {
        监视器.close();
        console.log(`停止监视目录: ${路径}`);
      });
      监视器映射.clear();
    },
    
    /**
     * 释放资源
     */
    清理() {
      this.停止所有监视();
      编译器.清理();
    }
  };
};

/**
 * 创建Vite风格依赖预处理器
 * @param {Object} 选项 - 预处理器选项
 * @returns {Object} 依赖预处理器对象
 */
export const 创建依赖预处理器 = (选项 = {}) => {
  const 依赖缓存 = new Map();
  const 处理中 = new Set();
  const 并发限制 = 选项.并发限制 || 5;
  
  // 优先级队列
  const 任务队列 = [];
  let 运行中任务数 = 0;
  
  // 预处理依赖
  const 预处理依赖 = async (依赖名, 路径, 优先级 = 0) => {
    const 键 = `${依赖名}@${路径}`;
    
    if (依赖缓存.has(键) || 处理中.has(键)) {
      return;
    }
    
    处理中.add(键);
    
    // 添加到队列
    return new Promise((resolve, reject) => {
      任务队列.push({
        依赖名,
        路径,
        优先级,
        执行: async () => {
          try {
            // 尝试导入模块
            const 模块 = await 导入并缓存模块(路径);
            依赖缓存.set(键, 模块);
            处理中.delete(键);
            resolve(模块);
          } catch (错误) {
            处理中.delete(键);
            reject(错误);
          } finally {
            运行中任务数--;
            处理下一个任务();
          }
        }
      });
      
      // 按优先级排序
      任务队列.sort((a, b) => b.优先级 - a.优先级);
      
      // 尝试执行任务
      处理下一个任务();
    });
  };
  
  // 处理队列中的下一个任务
  const 处理下一个任务 = () => {
    if (任务队列.length === 0 || 运行中任务数 >= 并发限制) {
      return;
    }
    
    const 任务 = 任务队列.shift();
    运行中任务数++;
    任务.执行();
  };
  
  // 解析依赖图
  const 解析依赖图 = async (入口点, 已访问 = new Set()) => {
    if (已访问.has(入口点)) {
      return [];
    }
    
    已访问.add(入口点);
    
    try {
      // 尝试获取文件内容
      let 文件内容;
      try {
        const 内容结果 = await 获取组件内容(入口点);
        文件内容 = 内容结果.内容;
      } catch (错误) {
        // 如果文件不存在，尝试添加不同的扩展名
        if (错误.状态码 === 404) {
          // 检查路径是否已有扩展名
          const 有扩展名 = /\.\w+$/.test(入口点);
          
          if (!有扩展名) {
            console.log(`路径${入口点}无法访问，尝试添加扩展名`);
            
            // 尝试常见扩展名列表
            const 扩展名列表 = ['.vue', '.js', '.json', '.ts', '.jsx', '.tsx'];
            
            for (const 扩展名 of 扩展名列表) {
              try {
                const 带扩展名路径 = `${入口点}${扩展名}`;
                const 内容结果 = await 获取组件内容(带扩展名路径);
                文件内容 = 内容结果.内容;
                console.log(`成功使用扩展名加载: ${带扩展名路径}`);
                // 添加正确的路径到已访问集合
                已访问.add(带扩展名路径);
                break;
              } catch (e) {
                // 继续尝试下一个扩展名
              }
            }
          }
          
          // 如果所有扩展名都失败了
          if (!文件内容) {
            console.warn(`无法加载依赖: ${入口点}，跳过此依赖`);
            return [];
          }
        } else {
          // 其他错误，记录后跳过
          console.warn(`解析依赖图失败: ${入口点}`, 错误);
          return [];
        }
      }
      
      // 确保已获取到文件内容
      if (!文件内容) {
        return [];
      }
      
      // 查找import语句
      const import匹配 = 文件内容.matchAll(/import\s+(?:[\w\s{},*]+from\s+)?['"]([^'"]+)['"]/g);
      const 依赖 = [];
      
      for (const 匹配 of import匹配) {
        const 依赖路径 = 匹配[1];
        
        // 跳过外部依赖（以http开头或不包含/的路径）
        if (依赖路径.startsWith('http') || !依赖路径.includes('/')) {
          continue;
        }
        
        // 解析完整路径
        const 完整路径 = 解析路径(入口点, 依赖路径);
        依赖.push(完整路径);
        
        // 递归处理依赖
        try {
          const 子依赖 = await 解析依赖图(完整路径, 已访问);
          依赖.push(...子依赖);
        } catch (子错误) {
          console.warn(`处理子依赖失败: ${完整路径}`, 子错误);
          // 继续处理其他依赖
        }
      }
      
      return 依赖;
    } catch (错误) {
      console.warn(`解析依赖图失败: ${入口点}`, 错误);
      return [];
    }
  };
  
  // 返回预处理器对象
  return {
    /**
     * 预加载依赖
     * @param {string} 依赖名 - 依赖名称
     * @param {string} 路径 - 依赖路径
     * @param {number} 优先级 - 处理优先级(0-10)
     * @returns {Promise<Object>} 预加载的模块
     */
    async 预加载(依赖名, 路径, 优先级 = 0) {
      return await 预处理依赖(依赖名, 路径, 优先级);
    },
    
    /**
     * 批量预加载
     * @param {Object} 依赖映射 - 名称到路径的映射
     * @returns {Promise<Object>} 预加载结果
     */
    async 批量预加载(依赖映射) {
      const 结果 = {};
      const 任务 = [];
      
      for (const [名称, 路径] of Object.entries(依赖映射)) {
        任务.push(
          this.预加载(名称, 路径)
            .then(模块 => {
              结果[名称] = 模块;
            })
            .catch(错误 => {
              console.error(`预加载依赖失败: ${名称} (${路径})`, 错误);
              结果[名称] = null;
            })
        );
      }
      
      await Promise.all(任务);
      return 结果;
    },
    
    /**
     * 自动检测并预加载入口点的所有依赖
     * @param {string} 入口点 - 入口文件路径
     * @returns {Promise<Array>} 预加载的依赖列表
     */
    async 自动预加载(入口点) {
      // 解析依赖图
      const 依赖列表 = await 解析依赖图(入口点);
      
      // 批量预加载
      const 任务 = 依赖列表.map((路径, 索引) => {
        const 优先级 = 依赖列表.length - 索引; // 越早发现的依赖优先级越高
        return this.预加载(`依赖${索引}`, 路径, 优先级);
      });
      
      await Promise.all(任务);
      return 依赖列表;
    },
    
    /**
     * 获取已缓存的依赖
     * @param {string} 依赖名 - 依赖名称
     * @param {string} 路径 - 依赖路径
     * @returns {Object|null} 缓存的模块或null
     */
    获取缓存(依赖名, 路径) {
      const 键 = `${依赖名}@${路径}`;
      return 依赖缓存.get(键) || null;
    },
    
    /**
     * 清理缓存
     */
    清理缓存() {
      依赖缓存.clear();
    }
  };
};

/**
 * 初始化Vite风格模式
 * @param {Object} Vue - Vue实例
 * @param {Object} 选项 - 初始化选项
 * @returns {Promise<Object>} Vite模式对象
 */
export const 初始化Vite模式 = async (Vue, 选项 = {}) => {
  const 服务器 = 创建开发服务器({
    基础路径: 选项.基础路径 || '/',
    ...选项
  });
  
  const 依赖处理器 = 创建依赖预处理器({
    并发限制: 选项.并发限制 || 5
  });
  
  // 如果提供了入口点，自动预加载依赖
  if (选项.入口点) {
    try {
      console.log(`开始自动预加载入口点依赖: ${选项.入口点}`);
      await 依赖处理器.自动预加载(选项.入口点);
      console.log('预加载依赖完成');
    } catch (错误) {
      console.warn('预加载依赖失败', 错误);
    }
  }
  
  // 如果启用了热重载，开始监视目录
  if (选项.热重载 && 选项.监视目录) {
    服务器.启用监视(选项.监视目录);
  }
  
  return {
    服务器,
    依赖处理器,
    编译器: 服务器.获取编译器(),
    
    /**
     * 加载并挂载Vue组件
     * @param {string} 路径 - 组件路径
     * @param {Element} 容器 - 挂载容器
     * @param {Object} 数据 - 组件数据
     * @returns {Promise<Object>} Vue应用实例
     */
    async 加载并挂载(路径, 容器, 数据 = {}) {
      try {
        // 加载组件
        const 组件 = await 服务器.加载组件(路径);
        
        // 创建应用
        const app = Vue.createApp({
          render() {
            return Vue.h(组件);
          }
        });
        
        // 提供数据
        app.provide('appData', Vue.reactive(数据));
        
        // 挂载应用
        app.mount(容器);
        
        // 添加卸载钩子，清理样式
        const 原始卸载 = app.unmount;
        app.unmount = function() {
          服务器.获取编译器().获取样式管理器().清空样式();
          return 原始卸载.apply(this, arguments);
        };
        
        return app;
      } catch (错误) {
        console.error(`加载并挂载组件失败: ${路径}`, 错误);
        throw 错误;
      }
    },
    
    /**
     * 释放资源
     */
    清理() {
      服务器.清理();
      依赖处理器.清理缓存();
    }
  };
}; 