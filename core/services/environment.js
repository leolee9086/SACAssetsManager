/**
 * 环境模块 - 提供系统环境信息和环境路由
 * 
 * 该模块负责：
 * - 提供系统环境信息（操作系统、运行时环境等）
 * - 设置全局环境变量
 * - 注册环境相关的功能路由
 * - 提供环境检测和验证功能
 */

import { 
  initGlobalRouter, 
  get, 
  post, 
  groupRoutes
} from '../../source/utils/feature/forGlobalRouter.js';

/**
 * 获取运行环境信息
 * @returns {Object} 环境信息对象
 */
function 获取环境信息() {
  // 基础环境信息
  const 环境信息 = {
    运行时: typeof window !== 'undefined' ? 'browser' : 'node',
    是否生产环境: process.env.NODE_ENV === 'production',
    平台: typeof navigator !== 'undefined' ? navigator.platform : process.platform,
    版本: process.env.APP_VERSION || '1.0.0',
    语言: navigator?.language || process.env.LANG || 'zh-CN',
    时区: Intl.DateTimeFormat().resolvedOptions().timeZone,
    当前时间: new Date().toISOString(),
    网络状态: navigator?.onLine ? '在线' : '离线'
  };

  // 浏览器环境特有信息
  if (typeof window !== 'undefined') {
    环境信息.浏览器 = {
      用户代理: navigator.userAgent,
      窗口尺寸: {
        宽度: window.innerWidth,
        高度: window.innerHeight
      },
      设备像素比: window.devicePixelRatio,
      支持触摸: 'ontouchstart' in window
    };
  }

  // Node环境特有信息
  if (typeof process !== 'undefined') {
    环境信息.节点 = {
      版本: process.version,
      操作系统: {
        类型: process.platform,
        架构: process.arch,
        版本: process.version
      },
      内存使用: process.memoryUsage ? process.memoryUsage() : null,
      CPU使用: process.cpuUsage ? process.cpuUsage() : null
    };
  }

  return 环境信息;
}

/**
 * 注册环境路由
 * @param {Object} 路由器 - 路由器实例
 * @param {Object} 环境模块 - 环境模块实例
 */
function 注册环境路由(路由器, 环境模块) {
  // 创建环境相关路由组
  groupRoutes({ prefix: '/env' }, (router) => {
    // 获取环境信息
    get('/info', {
      summary: '获取环境信息',
      description: '返回当前系统的环境信息，包括平台、版本、语言等',
      tags: ['环境'],
      responses: {
        200: { description: '成功获取环境信息' }
      }
    }, (ctx) => {
      return 环境模块.获取环境信息();
    });

    // 获取特定环境变量
    get('/var/:name', {
      summary: '获取指定环境变量',
      description: '根据名称获取特定的环境变量值',
      tags: ['环境'],
      parameters: [
        { name: 'name', in: 'path', required: true, description: '环境变量名称' }
      ],
      responses: {
        200: { description: '成功获取环境变量' },
        404: { description: '环境变量不存在' }
      }
    }, (ctx) => {
      const 变量名 = ctx.params.name;
      const 变量值 = 环境模块.获取环境变量(变量名);
      
      if (变量值 === undefined) {
        ctx.status = 404;
        return { error: `环境变量 ${变量名} 不存在` };
      }
      
      return { [变量名]: 变量值 };
    });

    // 设置环境变量
    post('/var', {
      summary: '设置环境变量',
      description: '设置一个或多个环境变量',
      tags: ['环境'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              additionalProperties: { type: 'string' }
            }
          }
        }
      },
      responses: {
        200: { description: '成功设置环境变量' },
        400: { description: '请求格式错误' }
      }
    }, (ctx) => {
      const 变量集 = ctx.request.body;
      
      if (!变量集 || typeof 变量集 !== 'object') {
        ctx.status = 400;
        return { error: '请求格式错误，需要提供对象格式的环境变量' };
      }
      
      const 结果 = {};
      
      for (const [变量名, 变量值] of Object.entries(变量集)) {
        环境模块.设置环境变量(变量名, 变量值);
        结果[变量名] = 变量值;
      }
      
      return { success: true, updated: 结果 };
    });

    // 环境检测API
    get('/check', {
      summary: '环境兼容性检测',
      description: '检测当前环境是否满足运行要求',
      tags: ['环境'],
      responses: {
        200: { description: '环境检测结果' }
      }
    }, (ctx) => {
      return 环境模块.检测环境兼容性();
    });
  });

  // 全局版本信息API
  get('/version', {
    summary: '获取应用版本',
    description: '返回当前应用程序的版本信息',
    tags: ['系统'],
    responses: {
      200: { description: '版本信息' }
    }
  }, (ctx) => {
    return {
      version: 环境模块.获取环境变量('版本') || '1.0.0',
      buildTime: 环境模块.获取环境变量('构建时间') || new Date().toISOString()
    };
  });
}

/**
 * 创建环境模块
 * @param {Object} 配置 - 模块配置
 * @returns {Object} 环境模块实例
 */
export async function 创建模块(配置 = {}) {
  // 初始化环境变量存储
  const 环境变量 = new Map();
  
  // 预设一些基本环境变量
  环境变量.set('版本', 配置.版本 || '1.0.0');
  环境变量.set('环境类型', 配置.环境类型 || process.env.NODE_ENV || 'development');
  环境变量.set('构建时间', 配置.构建时间 || new Date().toISOString());
  
  // 初始化全局路由器
  const 路由器 = initGlobalRouter({
    prefix: 配置.路由前缀 || '/api'
  });
  
  // 创建环境模块实例
  const 环境模块 = {
    /**
     * 获取环境信息
     * @returns {Object} 环境信息对象
     */
    获取环境信息() {
      return 获取环境信息();
    },
    
    /**
     * 获取指定环境变量
     * @param {String} 变量名 - 环境变量名称
     * @returns {*} 环境变量值或undefined
     */
    获取环境变量(变量名) {
      return 环境变量.get(变量名);
    },
    
    /**
     * 设置环境变量
     * @param {String} 变量名 - 环境变量名称
     * @param {*} 变量值 - 环境变量值
     */
    设置环境变量(变量名, 变量值) {
      环境变量.set(变量名, 变量值);
      console.info(`环境变量已设置: ${变量名} = ${变量值}`);
    },
    
    /**
     * 删除环境变量
     * @param {String} 变量名 - 要删除的环境变量名称
     * @returns {Boolean} 是否成功删除
     */
    删除环境变量(变量名) {
      const 结果 = 环境变量.delete(变量名);
      if (结果) {
        console.info(`环境变量已删除: ${变量名}`);
      }
      return 结果;
    },
    
    /**
     * 获取所有环境变量
     * @returns {Object} 所有环境变量的对象
     */
    获取所有环境变量() {
      const 结果 = {};
      环境变量.forEach((值, 键) => {
        结果[键] = 值;
      });
      return 结果;
    },
    
    /**
     * 检测环境兼容性
     * @returns {Object} 兼容性检测结果
     */
    检测环境兼容性() {
      const 兼容性结果 = {
        总体兼容: true,
        检测项: {}
      };
      
      // 检测浏览器功能
      if (typeof window !== 'undefined') {
        // ES6特性支持
        兼容性结果.检测项.ES6支持 = {
          结果: typeof Promise !== 'undefined' && typeof Symbol !== 'undefined',
          详情: '检测ES6核心特性(Promise, Symbol等)的支持情况'
        };
        
        // WebAPI支持
        兼容性结果.检测项.现代WebAPI = {
          结果: typeof fetch !== 'undefined' && typeof localStorage !== 'undefined',
          详情: '检测现代Web API(Fetch, LocalStorage等)的支持情况'
        };
        
        // Canvas支持
        兼容性结果.检测项.Canvas支持 = {
          结果: typeof document !== 'undefined' && !!document.createElement('canvas').getContext,
          详情: '检测Canvas绘图支持情况'
        };
      }
      
      // Node.js功能检测
      if (typeof process !== 'undefined') {
        // 检测Node.js版本
        const nodeVersionMatch = process.version.match(/^v(\d+)\./);
        const majorVersion = nodeVersionMatch ? parseInt(nodeVersionMatch[1], 10) : 0;
        兼容性结果.检测项.Node版本兼容 = {
          结果: majorVersion >= 14,
          详情: `当前Node.js版本: ${process.version}, 建议版本: >=14.x`
        };
      }
      // 更新总体兼容性结果
      兼容性结果.总体兼容 = Object.values(兼容性结果.检测项)
        .every(item => item.结果 === true);
      return 兼容性结果;
    },
    /**
     * 销毁模块
     */
    销毁() {
      console.info('环境模块正在清理资源...');
      环境变量.clear();
    }
  };
  // 注册环境相关路由
  注册环境路由(路由器, 环境模块);
  console.info('环境模块已初始化');
  return 环境模块;
}
