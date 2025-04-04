/**
 * Vue组件工具模块
 * 
 * 提供各种Vue组件相关的实用工具函数
 */
import * as Vue from '../../../../../static/vue.esm-browser.js'
import {loadModule} from '../../../../../static/vue3-sfc-loader.esm.js';
import * as loader from "../../../../../static/vue3-sfc-loader.esm.js"
import { extractDeclaredVarsInNodeDefine } from '../../../../utils/codeLoaders/js/lexicalAnalyzer.js';

import * as runtime from '../../../../../source/asyncModules.js'
/**
 * 创建一个标记模板函数，用于生成组件模板
 * @param {Array<string>} propNames - 组件的props名称数组
 * @returns {Function} 标记模板函数
 */
export const 创建组件模板 = (propNames = []) => (strings, ...interpolations) => {
  const template = strings.reduce((result, str, i) => 
    result + str + (i < interpolations.length ? interpolations[i] : ''), '');
  
  return {
    props: propNames.reduce((obj, name) => {
      obj[name] = null;
      return obj;
    }, {}),
    template
  };
};

/**
 * 同步函数，返回一个异步组件封装，组件名称是动态的。
 * 
 * @param {string} sfcUrl - Vue SFC文件的URL。
 * @returns {Object} - 包含动态组件名称、异步组件和接口获取方法的对象。
 */
export function loadVueComponentAsNodeSync(sfcUrl) {
  const moduleCache = {
      vue: Vue,
      runtime
  };

  const asyncModules = {

  }
  let nodeDefine = null;
  const styleElements = [];
  const mixinOptions = {
      moduleCache: {
          ...moduleCache
      },
      handleModule(type, source, path, options) {
          if (type === '.json') {
              return JSON.parse(source);
          }
          if (type === '.js') {
              return asyncModules[path]
          }
          return asyncModules[path]

      },
      async getFile(url) {
          console.log(url)
          if (url.includes('esm.sh')) {
              try {
                  // 先尝试从缓存获取
                  const cached = await cacheManager.get(url);
                  if (cached) {
                      console.log(`从缓存加载模块: ${url}`);
                      let module;
                      if (!asyncModules[url]) {
                          module = await import(url);
                          asyncModules[url] = module;
                      } else {
                          module = asyncModules[url];
                      }
                      
                      return {
                          getContentData: asBinary => asBinary ? 
                              new TextEncoder().encode(cached.content).buffer : 
                              cached.content,
                      };
                  }

                  // 如果没有缓存，则从网络获取
                  console.log(`从网络加载模块: ${url}`);
                  const res = await fetch(fixURL(url));
                  const content = await res.text();
                  
                  let module = await import(url);
                  asyncModules[url] = module;
                  
                  // 存储到缓存
                  await cacheManager.set(url, content, module);
                  console.log(`模块已缓存: ${url}`);

                  return {
                      getContentData: asBinary => asBinary ? 
                          new TextEncoder().encode(content).buffer : 
                          content,
                  };
              } catch (error) {
                  console.error(`加载模块失败: ${url}`, error);
                  throw error;
              }
          }
          let realURL = url
          const urlObj1 = new URL(url, window.location.origin);
          if (urlObj1.pathname.endsWith('.vue.mjs')) {
              realURL = url.replace('.vue.mjs', '.vue')
          }
          if (url.endsWith('.js')) {
              if (!asyncModules[url]) {
                  let module = await import(url)
                  asyncModules[url] = module
              }
          }
          const res = await fetch(realURL);
          if (!res.ok) {
              throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
          }
          const content = await res.text();
          const urlObj = new URL(url, window.location.origin);
          // 检查 URL 是否为 .vue 文件且包含 ?asNode=true 参数
          if (urlObj.pathname.endsWith('.vue.mjs') && urlObj.searchParams.get('asNode') === 'true') {
              // 仅解析 nodeDefine 块
              const nodeDefineMatch = content.match(/<script nodeDefine>([\s\S]*?)<\/script>/);
              if (nodeDefineMatch) {
                  try {
                      nodeDefine = nodeDefineMatch[1] + `
                      \n export const scope = {${extractDeclaredVarsInNodeDefine(nodeDefineMatch[1])}}
                      `
                  } catch (error) {
                      console.error('Failed to parse nodeDefine block:', error);
                  }
              }
              return { getContentData: asBinary => nodeDefineMatch ? nodeDefine : `` };
          }
          if (urlObj.pathname.endsWith('.vue') && urlObj.searchParams.get('asNode') === 'true') {
              // 剔除解析 nodeDefine 块
              const nodeDefineRegex = /<script nodeDefine>[\s\S]*?<\/script>/g;
              const nodeDefineMatch = content.match(/<script nodeDefine>([\s\S]*?)<\/script>/);
              if (nodeDefineMatch) {
                  try {
                      nodeDefine = nodeDefineMatch[1];
                  } catch (error) {
                      console.error('Failed to parse nodeDefine block:', error);
                  }
              }

              const contentWithoutNodeDefine = content.replace(
                  nodeDefineRegex,
                  `<script nodeDefineRuntime>
                    let {${Object.getOwnPropertyNames(window[Symbol.for(urlObj.searchParams.get('ScopeId'))])}} = window[Symbol.for("${urlObj.searchParams.get('ScopeId')}")]
                  </script>`
              );
              return { getContentData: asBinary => contentWithoutNodeDefine };
          }

          return {
              getContentData: asBinary => asBinary ? res.arrayBuffer() : content,
          };
      },
      addStyle(textContent) {
          const style = Object.assign(document.createElement('style'), { textContent });
          const ref = document.head.getElementsByTagName('style')[0] || null;
          document.head.insertBefore(style, ref);
          styleElements.push(style);
      },
  };

  const loadedScopes = {};

  return {
      getComponent: async (scope) => {
          if (!scope) {
              return await loadModule(sfcUrl.trim(), mixinOptions)
          }
          const component = await loadModule(sfcUrl.trim(), mixinOptions)
          let { __scopeId } = component
          window[Symbol.for(__scopeId)] = scope
          const newComponent = await loadModule(sfcUrl.trim() + `?asNode=true&&ScopeId=${__scopeId}`, mixinOptions)
          return newComponent;
      },

      getNodeDefineScope: async (id) => {
          try {
              const cacheKey = `${sfcUrl}_${id}`;

              // 检查是否已加载
              if (loadedScopes[cacheKey]) {
                  console.warn(`Scope already loaded: ${cacheKey}`);
                  return loadedScopes[cacheKey];
              }

              let scope = (await loader.loadModule(sfcUrl.trim() + `.mjs?asNode=true&&id=${id}`, mixinOptions)).scope
              console.log(scope, id);

              // 记录已加载的scope
              loadedScopes[cacheKey] = scope;

              return scope;
          } catch (e) {
              throw `加载${sfcUrl}错误:${e}`
          }
      }
  };
}
