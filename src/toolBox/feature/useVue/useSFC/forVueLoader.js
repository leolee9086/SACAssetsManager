/**
 * Vue组件加载模块
 * 
 * 提供SFC文件加载、路径映射和模块导入功能
 */

import { 修复URL格式, 数据库缓存管理器, 异步模块缓存, 导入并缓存模块 } from './forVueCache.js';
import { 加载历史记录, 增强错误信息, 创建安全错误 } from './forVueError.js';

/**
 * 处理特定文件路径映射
 */
const 路径映射 = {
  // 特殊处理brushModeUtils.js文件的加载路径
  '/plugins/SACAssetsManager/source/UI/pannels/imagePreviewer/brushModeUtils.js': 
    '/plugins/SACAssetsManager/source/UI/pannels/imagePreviewer/brushModeUtils.js',
  // 如果还有其他可能路径问题的文件也可以添加映射
  '/plugins/SACAssetsManager/source/UI/pannels/imagePreviewer/index.vue':
    '/plugins/SACAssetsManager/source/UI/pannels/imagePreviewer/index.vue'
};

/**
 * 获取文件内容
 * @param {string} url - 文件URL
 * @returns {Promise<Object>} 包含getContentData方法的对象
 */
export const 获取文件内容 = async (url) => {
  try {
    // 检查是否有特殊路径映射
    const 映射URL = 路径映射[url] || url;
    
    // 处理来自CDN的请求
    if (映射URL.includes('esm.sh') || 映射URL.includes('cdn')) {
      try {
        // 尝试从缓存获取
        const 缓存 = await 数据库缓存管理器.获取(映射URL);
        if (缓存) {
          console.log(`从缓存加载模块: ${映射URL}`);
          let 模块;
          if (!异步模块缓存[映射URL]) {
            模块 = await import(映射URL);
            异步模块缓存[映射URL] = 模块;
          } else {
            模块 = 异步模块缓存[映射URL];
          }
          
          return {
            getContentData: asBinary => asBinary ? 
              new TextEncoder().encode(缓存.内容).buffer : 
              缓存.内容,
          };
        }

        // 如果没有缓存，则从网络获取
        console.log(`从网络加载模块: ${映射URL}`);
        const 响应 = await fetch(修复URL格式(映射URL));
        if (!响应.ok) {
          // 特别处理404错误
          if (响应.status === 404) {
            console.error(`模块404错误: ${映射URL} - 文件未找到`);
            throw Object.assign(new Error(`模块未找到(404): ${映射URL}`), { status: 404, fileUrl: 映射URL });
          }
          const 错误消息 = `网络请求失败: ${映射URL}, 状态码: ${响应.status} ${响应.statusText}`;
          console.error(错误消息);
          throw new Error(错误消息);
        }
        
        const 内容 = await 响应.text();
        
        try {
          console.log(`尝试动态导入CDN模块: ${映射URL}`);
          let 模块 = await import(映射URL);
          异步模块缓存[映射URL] = 模块;
          
          // 存储到缓存
          await 数据库缓存管理器.设置(映射URL, 内容, 模块);
          console.log(`模块已缓存: ${映射URL}`);
        } catch (错误) {
          console.warn(`导入模块失败，但已获取内容: ${映射URL}`, 错误);
          throw 增强错误信息(错误, 映射URL, `动态导入CDN模块失败: ${映射URL}`);
        }

        return {
          getContentData: asBinary => asBinary ? 
            new TextEncoder().encode(内容).buffer : 
            内容,
        };
      } catch (错误) {
        console.error(`加载CDN模块失败: ${映射URL}`, 错误);
        throw 增强错误信息(错误, 映射URL, `加载CDN模块失败: ${映射URL}`);
      }
    }
    
    console.log(`尝试加载文件: ${映射URL}`);
    try {
      const 响应 = await fetch(修复URL格式(映射URL));
      if (!响应.ok) {
        // 特别处理404错误
        if (响应.status === 404) {
          // 记录未找到的文件
          console.error(`文件404错误: ${映射URL} - 文件未找到`);
          
          // 尝试分析路径问题
          const 路径部分 = 映射URL.split('/');
          const 文件名 = 路径部分[路径部分.length - 1];
          const 目录路径 = 路径部分.slice(0, -1).join('/');
          
          // 尝试检查目录是否存在
          try {
            const 目录检查 = await fetch(目录路径);
            console.log(`目录 ${目录路径} 状态: ${目录检查.status}`);
            
            // 如果目录也不存在，提供更具体的错误信息
            if (目录检查.status === 404) {
              console.error(`目录路径不存在: ${目录路径}`);
              throw Object.assign(new Error(`目录路径不存在(404): ${目录路径}`), { 
                directoryMissing: true,
                fileName: 文件名,
                dirPath: 目录路径,
                fileUrl: 映射URL,
                status: 404
              });
            }
          } catch (e) {
            console.warn('目录检查失败', e);
          }
          
          throw Object.assign(new Error(`文件未找到(404): ${映射URL}`), { 
            status: 404, 
            fileUrl: 映射URL,
            fileName: 文件名
          });
        }
        
        const 错误消息 = `文件请求失败: ${映射URL}, 状态码: ${响应.status} ${响应.statusText}`;
        console.error(错误消息);
        throw Object.assign(new Error(错误消息), { status: 响应.status, fileUrl: 映射URL });
      }
      
      const 内容 = await 响应.text();
      
      if (映射URL.endsWith('.vue')) {
        // 分析Vue文件内容，检查常见问题
        const 脚本匹配 = 内容.match(/<script(\s[^>]*)?>/i);
        if (脚本匹配) {
          const 脚本标签 = 脚本匹配[0];
          if (!脚本标签.includes('setup') && !脚本标签.includes('type="module"')) {
            console.warn(`警告: ${映射URL} 的script标签可能需要添加setup属性或指定type="module"`, {
              scriptTag: 脚本标签,
              recommendation: '建议修改为 <script setup> 或 <script type="module">'
            });
          }
        }
      }
      
      if (映射URL.endsWith('.js')) {
        if (!异步模块缓存[映射URL]) {
          try {
            console.log(`尝试动态导入JS模块: ${映射URL}`);
            let 模块 = await import(映射URL);
            异步模块缓存[映射URL] = 模块;
            console.log(`成功加载JS模块: ${映射URL}`);
          } catch (错误) {
            console.error(`导入JS模块失败: ${映射URL}`, 错误);
            throw 增强错误信息(错误, 映射URL, `导入JS模块失败: ${映射URL}`);
          }
        }
      }
      
      return {
        getContentData: asBinary => asBinary ? 
          new TextEncoder().encode(内容).buffer : 
          内容,
      };
    } catch (请求错误) {
      if (请求错误.directoryMissing) {
        // 重新抛出目录错误，保留更详细的诊断信息
        throw 请求错误;
      }
      
      console.error(`无法获取文件: ${映射URL}`, 请求错误);
      throw 增强错误信息(请求错误, 映射URL, `获取文件失败: ${映射URL}`);
    }
  } catch (错误) {
    // 在顶层捕获所有错误，添加更多上下文信息
    console.error(`文件加载错误详情:`, { 
      url: url, 
      errorMessage: 错误.message,
      status: 错误.status || 0,
      stack: 错误.stack
    });
    
    throw 创建安全错误(错误);
  }
};

/**
 * 处理模块
 * @param {string} 类型 - 文件类型(.js, .json等)
 * @param {string} 源码 - 源代码内容
 * @param {string} 路径 - 文件路径 
 * @param {Object} 选项 - 处理选项
 * @returns {Object} 处理后的模块
 */
export const 处理模块 = (类型, 源码, 路径, 选项, 模块缓存) => {
  // 处理JSON模块
  if (类型 === '.json') {
    return JSON.parse(源码);
  }
  
  // 特殊处理runtime模块
  if (路径 === 'runtime') {
    console.log('提供runtime模块');
    return 模块缓存.runtime;
  }
  
  // 处理Vue相关模块
  if (路径 === 'vue/runtime' || 
      路径.startsWith('vue/') || 
      路径.startsWith('@vue/')) {
    console.log(`提供Vue模块作为${路径}的替代`);
    return 模块缓存.vue;
  }
  
  // 处理JS模块
  if (类型 === '.js') {
    return 异步模块缓存[路径] || 模块缓存[路径];
  }
  
  // 处理CDN模块
  if (路径.includes('esm.sh') || 路径.includes('cdn')) {
    return 异步模块缓存[路径];
  }
}; 