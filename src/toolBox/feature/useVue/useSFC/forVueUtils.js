/**
 * Vue组件工具模块
 * 
 * 提供各种Vue组件相关的实用工具函数
 */

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
 * 异步加载Vue组件，并通过NodeSync接口返回
 * @param {string} componentURL - 组件的URL
 * @param {Function} loadModule - SFC loader的loadModule函数
 * @param {Object} options - 加载器选项
 * @returns {Object} 包含getNodeDefineScope和getComponent方法的对象
 */
export const 加载组件为节点同步 = (componentURL, loadModule, options) => {
  // 缓存组件和作用域
  const 作用域缓存 = {};
  const 组件缓存 = {};
  
  return {
    /**
     * 获取组件的NodeDefine作用域
     * @param {string} id - 组件实例ID
     * @returns {Promise<Object>} 组件作用域
     */
    async 获取节点定义作用域(id) {
      const 缓存键 = `${componentURL}_${id}`;
      
      if (作用域缓存[缓存键]) {
        return 作用域缓存[缓存键];
      }
      
      try {
        const component = await loadModule(componentURL, options);
        
        // 创建作用域对象
        const 作用域 = {
          id,
          nodeDefine: component.nodeDefine || {},
          isLoaded: false
        };
        
        作用域缓存[缓存键] = 作用域;
        return 作用域;
      } catch (错误) {
        console.error('加载组件NodeDefine失败:', 错误);
        throw 错误;
      }
    },
    
    /**
     * 获取组件实例
     * @param {Object} scope - 组件作用域
     * @returns {Promise<Object>} Vue组件实例
     */
    async 获取组件(作用域) {
      const 缓存键 = `${componentURL}_${作用域.id}`;
      
      if (组件缓存[缓存键]) {
        return 组件缓存[缓存键];
      }
      
      try {
        const component = await loadModule(componentURL, options);
        
        组件缓存[缓存键] = component;
        return component;
      } catch (错误) {
        console.error('加载组件实例失败:', 错误);
        throw 错误;
      }
    }
  };
}; 