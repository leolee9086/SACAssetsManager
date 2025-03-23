/**
 * 组件序列化工具
 * 将各种格式的组件定义转换为可序列化格式\
 * 只需要保证"反序列化"之后,在同样的上下文环境中,能够正常工作即可
 */
export const ComponentSerializer = {
    /**
     * 序列化组件定义
     * @param {String|Object|Function} componentDef - 组件定义(路径、源码、对象或函数)
     * @param {Object} options - 配置选项
     * @returns {Object} - 序列化后的组件信息
     */
    serialize(componentDef, options = {}) {
      // 默认选项
      const defaultOptions = {
        baseUrl: '',
        validateOnly: false,
        includeStyles: true,
        resolveImports: false,
        serializeFunctions: true, // 是否序列化函数
        allowUnsafe: false, // 是否允许潜在不安全的内容
        preserveState: false, // 是否保留组件状态
        cacheKey: null, // 缓存键
      };
      
      const opts = { ...defaultOptions, ...options };
      
      // 确定组件类型
      const type = this._getDefinitionType(componentDef);
      
      // 根据类型处理
      switch (type) {
        case 'path':
          return this._serializePath(componentDef, opts);
        
        case 'source':
          return this._serializeSource(componentDef, opts);
        
        case 'object':
          return this._serializeObject(componentDef, opts);
          
        case 'function':
          return this._serializeFunction(componentDef, opts);
          
        case 'unknown':
        default:
          if (opts.fallbackType) {
            // 允许指定回退类型
            return this[`_serialize${opts.fallbackType.charAt(0).toUpperCase() + opts.fallbackType.slice(1)}`](componentDef, opts);
          }
          throw new Error('无法识别的组件定义类型');
      }
    },
    
    /**
     * 确定组件定义的类型
     * @private
     */
    _getDefinitionType(def) {
      if (typeof def === 'function') {
        return 'function';
      }
      
      if (typeof def === 'string') {
        // 判断是路径还是源代码
        if (def.trim().startsWith('<') || 
            def.includes('<template>') || 
            def.includes('export default') ||
            def.includes('defineComponent')) {
          return 'source';
        }
        
        if (def.endsWith('.vue') || 
            def.endsWith('.jsx') || 
            def.endsWith('.tsx') ||
            /[\/\\]/.test(def) || // 包含斜杠或反斜杠
            /^(\.\/|\.\.\/|\/|https?:\/\/)/.test(def)) { // 以相对/绝对路径或URL开头
          return 'path';
        }
        
        return 'unknown';
      }
      
      if (typeof def === 'object' && def !== null) {
        // 对象格式的组件定义（更宽松的检测）
        return 'object';
      }
      
      return 'unknown';
    },
    
    /**
     * 序列化路径类型的定义
     * @private
     */
    _serializePath(path, options) {
      return {
        type: 'path',
        definition: this._normalizePath(path, options.baseUrl),
        options: { ...options },
        timestamp: Date.now()
      };
    },
    
    /**
     * 序列化源代码类型的定义
     * @private
     */
    _serializeSource(source, options) {
      if (options.validateOnly && !options.allowUnsafe) {
        this._validateSource(source);
      }
      
      return {
        type: 'source',
        definition: source,
        options: { ...options },
        timestamp: Date.now()
      };
    },
    
    /**
     * 序列化对象类型的定义
     * @private
     */
    _serializeObject(obj, options) {
      // 深复制对象并处理特殊情况
      const processed = this._processObjectForSerialization(obj, options);
      
      return {
        type: 'object',
        definition: processed,
        options: { ...options },
        timestamp: Date.now()
      };
    },
    
    /**
     * 序列化函数类型的定义
     * @private
     */
    _serializeFunction(func, options) {
      // 函数序列化
      const funcStr = func.toString();
      
      return {
        type: 'function',
        definition: funcStr,
        options: { ...options },
        timestamp: Date.now()
      };
    },
    
    /**
     * 处理对象序列化，包括函数的序列化
     * @private
     */
    _processObjectForSerialization(obj, options, path = '') {
      if (obj === null || obj === undefined) return obj;
      
      // 函数处理
      if (typeof obj === 'function') {
        if (options.serializeFunctions) {
          return {
            __isFunction: true,
            __value: obj.toString()
          };
        }
        // 如果不序列化函数，返回null或指定值
        return options.functionPlaceholder || null;
      }
      
      // 数组处理
      if (Array.isArray(obj)) {
        return obj.map((item, index) => 
          this._processObjectForSerialization(item, options, `${path}[${index}]`)
        );
      }
      
      // 对象处理
      if (typeof obj === 'object') {
        const result = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const newPath = path ? `${path}.${key}` : key;
            // 跳过指定的不需要序列化的属性
            if (options.skipProperties && options.skipProperties.includes(key)) {
              continue;
            }
            result[key] = this._processObjectForSerialization(obj[key], options, newPath);
          }
        }
        return result;
      }
      
      return obj;
    },
    
    /**
     * 验证源代码中是否有不支持的内容
     * @private
     */
    _validateSource(source) {
      // 检查潜在危险API
      const potentiallyDangerousApis = [
        'eval(', 'new Function(', 'document.write(',
        'innerHTML', 'setTimeout(', 'setInterval(',
        'WebAssembly', 'fetch(', 'XMLHttpRequest'
      ];
      
      for (const api of potentiallyDangerousApis) {
        if (source.includes(api)) {
          console.warn(`组件源码包含潜在危险API: ${api}，请确保代码安全性`);
        }
      }
      
      // 浏览器API检查
      const browserAPIs = ['window.', 'document.', 'navigator.', 'localStorage', 'sessionStorage'];
      for (const api of browserAPIs) {
        if (source.includes(api)) {
          console.warn(`组件源码包含浏览器API: ${api}，可能在跨窗口传递时出现问题`);
        }
      }
    },
    
    /**
     * 标准化路径，处理相对路径等
     * @private
     */
    _normalizePath(path, baseUrl) {
      if (/^(https?:\/\/|\/|data:)/.test(path)) {
        return path;
      }
      
      // 如果是相对路径且提供了baseUrl
      if (baseUrl) {
        // 移除结尾的斜杠
        const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        // 确保路径格式正确
        const relativePath = path.startsWith('./') || path.startsWith('../') 
          ? path 
          : `./${path}`;
        
        // 简单的路径合并
        return `${base}/${relativePath.replace(/^\.\//, '')}`;
      }
      
      return path;
    },
    
    /**
     * 反序列化组件定义
     * 在新窗口中使用
     */
    async deserialize(serialized, context = {}) {
      const { type, definition, options = {}, timestamp } = serialized;
      
      // 检查缓存
      if (options.cacheKey && this._cache && this._cache[options.cacheKey]) {
        const cached = this._cache[options.cacheKey];
        // 检查缓存是否过期
        if (!options.cacheTTL || Date.now() - timestamp < options.cacheTTL) {
          return cached.component;
        }
      }
      
      // 根据类型处理
      let component;
      try {
        switch (type) {
          case 'path':
            component = await this._deserializePath(definition, options, context);
            break;
          
          case 'source':
            component = await this._deserializeSource(definition, options, context);
            break;
          
          case 'object':
            component = await this._deserializeObject(definition, options, context);
            break;
            
          case 'function':
            component = await this._deserializeFunction(definition, options, context);
            break;
          
          default:
            throw new Error(`不支持的序列化类型: ${type}`);
        }
        
        // 添加到缓存
        if (options.cacheKey) {
          if (!this._cache) this._cache = {};
          this._cache[options.cacheKey] = {
            component,
            timestamp: Date.now()
          };
        }
        
        return component;
      } catch (error) {
        console.error(`组件反序列化失败 (${type}):`, error);
        
        // 如果有提供备用组件
        if (options.fallbackComponent) {
          console.warn('使用备用组件');
          return options.fallbackComponent;
        }
        
        // 重新抛出错误
        throw error;
      }
    },
    
    /**
     * 从路径加载组件
     * @private
     */
    async _deserializePath(path, options, context) {
      // 优先使用提供的自定义加载器
      if (options.customLoader && typeof options.customLoader === 'function') {
        return await options.customLoader(path, options, context);
      }
      
      // 支持动态导入
      if (options.useImport) {
        try {
          const module = await import(/* @vite-ignore */ path);
          return module.default || module;
        } catch (error) {
          console.error('动态导入失败:', error);
          throw error;
        }
      }
      
      // 默认使用 vue3-sfc-loader
      const { loadModule } = context.loader || window.vue3SfcLoader;
      if (!loadModule) {
        throw new Error('未找到 vue3-sfc-loader，请确保已加载或提供自定义加载器');
      }
      
      try {
        // 获取源代码
        const response = await fetch(path, options.fetchOptions || {});
        if (!response.ok) {
          throw new Error(`无法加载组件: ${response.status} ${response.statusText}`);
        }
        
        const source = await response.text();
        
        // 使用vue3-sfc-loader加载
        return await loadModule(source, {
          moduleCache: { vue: context.vue || window.Vue },
          getFile: () => Promise.resolve(source),
          addStyle: (styleContent) => {
            if (options.includeStyles !== false) {
              const style = document.createElement('style');
              style.textContent = styleContent;
              document.head.appendChild(style);
              
              // 返回清理函数，便于组件卸载时清理样式
              return () => {
                document.head.removeChild(style);
              };
            }
          },
          log: options.silent ? () => {} : (context.log || console),
          additionalModuleHandlers: options.moduleHandlers || {}
        });
      } catch (error) {
        console.error('加载组件失败:', error);
        throw error;
      }
    },
    
    /**
     * 从源代码加载组件
     * @private
     */
    async _deserializeSource(source, options, context) {
      // 优先使用提供的自定义编译器
      if (options.customCompiler && typeof options.customCompiler === 'function') {
        return await options.customCompiler(source, options, context);
      }
      
      // 如果是纯JS/TS源码而非SFC
      if (source.includes('export default') && !source.includes('<template>')) {
        // 尝试使用动态Function解析
        try {
          const Vue = context.vue || window.Vue;
          const { defineComponent } = Vue;
          
          // 替换 export default 为 return
          const code = source
            .replace(/export\s+default/, 'return ')
            .replace(/import\s+{([^}]+)}\s+from\s+['"]vue['"]/g, '');
          
          const createComponentFunction = new Function('Vue', `
            const { defineComponent, ref, reactive, computed, watch, onMounted, onUnmounted } = Vue;
            ${code}
          `);
          
          return createComponentFunction(Vue);
        } catch (error) {
          console.error('解析JS源码失败:', error);
          throw error;
        }
      }
      
      // 使用 vue3-sfc-loader 处理 SFC
      const { loadModule } = context.loader || window.vue3SfcLoader;
      if (!loadModule) {
        throw new Error('未找到 vue3-sfc-loader，请确保已加载或提供自定义编译器');
      }
      
      try {
        // 直接使用源代码加载
        return await loadModule(source, {
          moduleCache: { vue: context.vue || window.Vue },
          getFile: () => Promise.resolve(source),
          addStyle: (styleContent) => {
            if (options.includeStyles !== false) {
              const style = document.createElement('style');
              style.textContent = styleContent;
              document.head.appendChild(style);
              
              // 返回清理函数
              return () => {
                document.head.removeChild(style);
              };
            }
          },
          log: options.silent ? () => {} : (context.log || console),
          additionalModuleHandlers: options.moduleHandlers || {}
        });
      } catch (error) {
        console.error('从源代码加载组件失败:', error);
        throw error;
      }
    },
    
    /**
     * 从对象定义加载组件
     * @private
     */
    async _deserializeObject(obj, options, context) {
      // 恢复被序列化的函数
      const processedObj = this._restoreFunctions(obj, context);
      
      const Vue = context.vue || window.Vue;
      
      // 处理模板
      if (processedObj.template && !processedObj.render) {
        // 如果有模板，需要编译
        const compiler = context.compiler || window.VueCompiler || Vue.compile;
        if (!compiler) {
          throw new Error('需要Vue模板编译器，请确保已加载');
        }
        
        try {
          // 尝试编译模板
          const { render } = compiler(processedObj.template);
          processedObj.render = render;
        } catch (error) {
          console.error('模板编译失败:', error);
          throw error;
        }
      }
      
      return processedObj;
    },
    
    /**
     * 从函数字符串恢复组件
     * @private
     */
    async _deserializeFunction(funcStr, options, context) {
      try {
        const Vue = context.vue || window.Vue;
        
        // 创建函数
        // 提供常用的Vue API给函数使用
        const func = new Function('Vue', `
          const { defineComponent, ref, reactive, computed, watch, onMounted, onUnmounted } = Vue;
          const _vue = Vue;
          return (${funcStr});
        `);
        
        return func(Vue);
      } catch (error) {
        console.error('函数反序列化失败:', error);
        throw error;
      }
    },
    
    /**
     * 递归恢复被序列化的函数
     * @private
     */
    _restoreFunctions(obj, context) {
      if (!obj) return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(item => this._restoreFunctions(item, context));
      }
      
      if (typeof obj === 'object') {
        // 检查是否是序列化的函数
        if (obj.__isFunction && obj.__value) {
          try {
            const Vue = context.vue || window.Vue;
            return new Function('Vue', `
              const { defineComponent, ref, reactive, computed, watch, onMounted, onUnmounted } = Vue;
              return (${obj.__value});
            `)(Vue);
          } catch (error) {
            console.error('恢复函数失败:', obj.__value, error);
            return () => null; // 返回空函数作为后备
          }
        }
        
        // 递归处理普通对象
        const result = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result[key] = this._restoreFunctions(obj[key], context);
          }
        }
        return result;
      }
      
      return obj;
    },
    
    /**
     * 清理缓存
     */
    clearCache(cacheKey = null) {
      if (!this._cache) return;
      
      if (cacheKey) {
        delete this._cache[cacheKey];
      } else {
        this._cache = {};
      }
    }
  };