/**
 * 引入api等
 */
const { Plugin } = require("siyuan");
const clientApi = require("siyuan");
/**
 * 将api暴露到全局空间
 */
let eventBus
globalThis[Symbol.for(`siyuanClientApi`)] = globalThis[Symbol.for(`siyuanClientApi`)] || clientApi

// 添加全局符号访问插件实例
function setupGlobalAccess(pluginObj) {
  window[Symbol.for('plugin-SACAssetsManager')] = pluginObj;
}

function 同步获取文件夹列表(路径) {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', `/api/file/readDir`, false); // 使用 POST 方法
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(JSON.stringify({ path: 路径 }));

  if (xhr.status === 200) {
    const response = JSON.parse(xhr.responseText);
    if (response.code === 0) {
      return response.data;
    }
  }
  return [];
}

function 构建TAB配置() {
  const TAB_CONFIGS = {};
  // 使用插件工作空间的完整路径
  const 基础路径 = `/data/plugins/SACAssetsManager/source/UI/pannels`;
  try {
    const 文件列表 = 同步获取文件夹列表(基础路径);

    文件列表.forEach(文件信息 => {
      if (文件信息.isDir) {
        const 文件夹名 = 文件信息.name;
        const tabName = `${文件夹名}Tab`;

        TAB_CONFIGS[tabName] = {
          // 注意这里使用的是前端访问路径
          component: `/plugins/SACAssetsManager/source/UI/pannels/${文件夹名}/index.vue`,
          containerId: `${文件夹名}`
        };
      }
    });

  } catch (错误) {
    console.error('构建TAB配置时出错:', 错误);
  }

  return TAB_CONFIGS;
}




/**
 * tab注册
 */
const TAB_CONFIGS = {
  AssetsTab: {
    component: '/plugins/SACAssetsManager/source/UI/components/assetGalleryPanel.vue',
    containerId: 'assetsColumn'
  },


  ...构建TAB配置()
}

// 定义事件类型常量
const EVENTS = {
  OPEN_TAB: 'plugin-tab:open',
  TAB_OPENED: 'plugin-tab:opened',
  TAB_CLOSED: 'plugin-tab:closed',
  SEND_DATA_TO_TAB: 'plugin-tab:send-data'
};

const DOCK_CONFIGS = {
  AssetsPanel: {
    icon: "iconInfo",
    position: "LeftBottom",
    component: '/plugins/SACAssetsManager/source/UI/pannels/assetInfoPanel/index.vue',
    title: "SACAssetsPanel",
    propertyName: "assetsPanelDock"
  },
  CollectionPanel: {
    icon: "iconDatabase",
    position: "RightBottom",
    component: '/plugins/SACAssetsManager/source/UI/components/collectionPanel.vue',
    title: "SACAssetsCollectionPanel",
    propertyName: "collectionPanelDock"
  },
  PannelListPanel: {
    icon: "iconPanel",
    position: "RightBottom",
    component: '/plugins/SACAssetsManager/source/UI/pannels/pannelList/index.vue',
    title: "面板列表",
    propertyName: "pannelListDock"
  },
  ServiceManagerPanel: {
    icon: "iconServer",
    position: "RightBottom",
    component:"/plugins/SACAssetsManager/source/UI/pannels/serviceManager/index.vue",
    title: "服务管理",
    propertyName: "serviceManagerDock"
  }
}
let pluginInstance = {}

/**
 * 创建停靠面板
 * @param {Plugin} plugin 插件实例
 * @param {string} dockType 面板类型
 * @returns {Object} dock实例
 */
function createDock(plugin, dockType) {
  const config = DOCK_CONFIGS[dockType];
  const dock = plugin.addDock({
    config: {
      icon: config.icon,
      position: config.position,
      size: { width: 200, height: 0 },
      title: config.title
    },
    data: { text: "" },
    type: dockType,
    init() {
      const container = 插入UI面板容器(this.element);
        // 其他面板使用原有的Vue加载方式
        import('/plugins/SACAssetsManager/src/toolBox/feature/useVue/vueComponentLoader.js').then(
          async module => {
            try {
              // 使用await等待异步函数完成
              const app = await module.initVueApp(config.component);
              // 确保app存在且mount函数可用
              if (app && typeof app.mount === 'function') {
                app.mount(container);
              } else {
                console.error('Vue应用创建失败', app);
              }
            } catch (error) {
              console.error('加载Vue组件失败:', error);
            }
          }
        );
      
    }
  });
  return dock;
}

module.exports = class SACAssetsManager extends Plugin {
  onload() {
    setupGlobalAccess(this);
    this.初始化插件同步状态()
    this.初始化插件异步状态()
    this.创建web服务()
    this.创建资源Tab类型()
    this.添加菜单()
    this.加载i18n工具()
  }

  初始化插件同步状态() {
    pluginInstance = this
    eventBus = this.eventBus
    this.stayAlive = true

    this.插件自身工作空间路径 = `/data/plugins/${this.name}`
    this.工作空间根路径 = window.siyuan.config.system.workspaceDir
    this.插件自身伺服地址 = `/plugins/${this.name}`
    this.selfURL = this.插件自身伺服地址

    this.最近打开本地文件夹列表 = new Set()
    Object.entries(DOCK_CONFIGS).forEach(([dockType, config]) => {
      this[config.propertyName] = createDock(this, dockType);
    });
  }
  初始化插件异步状态() {
    import(`${this.插件自身伺服地址}/source/index.js`)
  }

  async 写入i18n(lang, content) {
    let targetPath = this.插件自身工作空间路径 + '/i18n/' + `${lang}.json`
    let workspace = await import(`${this.插件自身伺服地址}/polyfills/fs.js`)
    await workspace.writeFile(targetPath, JSON.stringify(content, undefined, 2))
  }
  加载i18n工具() {
    this.$翻译 = function (字符串数组, ...插值) {
      // 直接使用原始的模板字符串
      return 字符串数组.reduce((结果, 字符串, 索引) =>
        结果 + 字符串 + (插值[索引] || ''), '');
    };
    import(`${this.插件自身伺服地址}/src/utils/i18n/aiI18n.js`).then(
      module => {
        this.翻译 = (字符串数组, ...插值) => {
          let 完整模板 = '';
          字符串数组.forEach((字符串, 索引) => {
            完整模板 += 字符串;
            if (索引 < 插值.length) {
              完整模板 += `__VAR_${索引}__`;
            }
          });
          if (!this.启用AI翻译) {
            let 翻译结果 = this.i18n[完整模板] || 完整模板
            插值.forEach((值, 索引) => {
              翻译结果 = 翻译结果.replace(`__VAR_${索引}__`, 值);
            });
            return 翻译结果
          }
          if (this.i18n[完整模板] && this.i18n[完整模板] !== 完整模板) {
            let 翻译结果 = this.i18n[完整模板]
            插值.forEach((值, 索引) => {
              翻译结果 = 翻译结果.replace(`__VAR_${索引}__`, 值);
            });
            return 翻译结果
          } else {
            if (siyuan.config.lang === 'zh_CN') {
              this.i18n[完整模板] = 完整模板
              this.写入i18n(siyuan.config.lang, this.i18n)
              let 翻译结果 = this.i18n[完整模板]
              插值.forEach((值, 索引) => {
                翻译结果 = 翻译结果.replace(`__VAR_${索引}__`, 值);
              });
              return 翻译结果
            }
            setTimeout(async () => {
              let result = (module.创建可选AI翻译标签函数(() => { return true }))(字符串数组, ...插值)
              this.i18n[完整模板] = result.template
              await this.写入i18n(siyuan.config.lang, this.i18n)
            })
            return this.$翻译(字符串数组, ...插值)
          }
        }
      }
    )

  }

  /**
   * 只有getter,避免被不小心改掉
   */
  get events() {
    return {
      打开附件: 'open-asset',
      资源界面项目右键: 'rightclick-galleryitem',
      打开附件所在路径: 'open-asset-folder',
    }
  }

  async 创建web服务() {
    // 从toolBox直接导入端口管理函数
    const { 获取插件服务端口号 } = await import(`${this.插件自身伺服地址}/src/toolBox/base/forNetWork/forPort/forSiyuanPort.js`);
    this.http服务端口号 = await 获取插件服务端口号(this.name + "_http", 6992);
    this.https服务端口号 = await 获取插件服务端口号(this.name + "_https", 6993);
    
    // 初始化服务状态存储
    this.servicesStatus = {
      main: {
        isRunning: false,
        startTime: null,
        port: this.http服务端口号,
        lastHeartbeat: null
      },
      static: {
        isRunning: false,
        startTime: null, 
        port: this.https服务端口号,
        lastHeartbeat: null
      }
    };
    
    // 启动自动心跳检测
    this.heartbeatInterval = setInterval(() => {
      this.checkServicesStatus();
    }, 5000); // 每5秒检查一次
    
    await import(`${this.插件自身伺服地址}/source/server/main.js`);
    
    // 添加服务管理辅助函数
    this.pingServer = async () => {
      // 检查主服务是否响应
      try {
        if (!this.serverContainer) return false;
        
        // 发送心跳并等待响应
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(false), 2000); // 2秒超时
          
          // 临时事件监听器
          const handleHeartbeat = (e, data) => {
            clearTimeout(timeout);
            
            if (data && data.type === 'heartbeat') {
              // 存储服务状态信息
              this.updateServicesStatus(data);
              resolve(true);
            } else if (data && data.webContentID === this.serverContainerWebContentsID) {
              resolve(true);
            }
          };
          
          // 添加临时监听器
          const { ipcRenderer } = require('electron');
          ipcRenderer.once('heartbeat', handleHeartbeat);
          
          // 发送心跳请求
          ipcRenderer.send('heartbeat', { requireResponse: true });
          
          // 3秒后清理
          setTimeout(() => {
            ipcRenderer.removeListener('heartbeat', handleHeartbeat);
          }, 3000);
        });
      } catch (error) {
        console.warn('Ping主服务失败:', error);
        return false;
      }
    };
    
    this.pingStaticServer = async () => {
      // 检查静态服务器是否响应
      try {
        if (!this.staticServerContainer) return false;
        
        // 如果30秒内有心跳响应，认为服务活跃
        if (this.staticServerLastPong) {
          const isActive = (Date.now() - this.staticServerLastPong) < 30000;
          
          // 更新服务状态
          if (isActive && this.servicesStatus && this.servicesStatus.static) {
            this.servicesStatus.static.isRunning = true;
            this.servicesStatus.static.lastHeartbeat = this.staticServerLastPong;
            
            // 如果没有记录启动时间，则记录
            if (!this.servicesStatus.static.startTime) {
              this.servicesStatus.static.startTime = this.staticServerStartTime || Date.now();
            }
            
            // 广播状态更新
            this.eventBus.emit('service:status-updated', {
              service: 'static',
              status: this.servicesStatus.static
            });
          }
          
          return isActive;
        }
        
        // 发送ping并等待响应
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(false), 2000); // 2秒超时
          
          // 设置临时处理程序
          const staticChannel = new BroadcastChannel('SACAssetsStatic');
          const handlePong = (event) => {
            if (event.data && event.data.type === 'pong') {
              clearTimeout(timeout);
              
              // 更新状态
              if (this.servicesStatus && this.servicesStatus.static) {
                this.servicesStatus.static.isRunning = true;
                this.servicesStatus.static.lastHeartbeat = event.data.timestamp;
                
                // 如果没有记录启动时间，则记录
                if (!this.servicesStatus.static.startTime) {
                  this.servicesStatus.static.startTime = this.staticServerStartTime || Date.now();
                }
                
                // 广播状态更新
                this.eventBus.emit('service:status-updated', {
                  service: 'static',
                  status: this.servicesStatus.static
                });
              }
              
              staticChannel.close();
              resolve(true);
            }
          };
          
          staticChannel.addEventListener('message', handlePong);
          
          // 发送ping
          staticChannel.postMessage({ type: 'ping', timestamp: Date.now() });
          
          // 3秒后清理
          setTimeout(() => {
            staticChannel.removeEventListener('message', handlePong);
            staticChannel.close();
          }, 3000);
        });
      } catch (error) {
        console.warn('Ping静态服务器失败:', error);
        return false;
      }
    };
    
    this.getStaticServerUrl = () => {
      if (!this.staticServerContainer || !this.https服务端口号) return null;
      return `http://localhost:${this.https服务端口号}`;
    };
    
    // 更新服务状态并广播更新事件
    this.updateServicesStatus = (heartbeatData) => {
      try {
        if (!heartbeatData || !heartbeatData.services) return;
        
        // 更新主服务状态
        if (heartbeatData.services.main) {
          this.servicesStatus.main.isRunning = heartbeatData.services.main.isRunning;
          this.servicesStatus.main.port = heartbeatData.services.main.port;
          this.servicesStatus.main.lastHeartbeat = heartbeatData.timestamp;
          
          // 如果没有记录启动时间，使用服务报告的启动时间
          if (!this.servicesStatus.main.startTime && heartbeatData.services.main.startTime) {
            this.servicesStatus.main.startTime = heartbeatData.services.main.startTime;
            
            // 记录到插件实例
            this.mainServerStartTime = heartbeatData.services.main.startTime;
          }
          
          // 广播状态更新
          this.eventBus.emit('service:status-updated', {
            service: 'main',
            status: this.servicesStatus.main
          });
        }
        
        // 更新静态服务状态
        if (heartbeatData.services.static) {
          this.servicesStatus.static.isRunning = heartbeatData.services.static.isRunning;
          this.servicesStatus.static.port = heartbeatData.services.static.port;
          this.servicesStatus.static.lastHeartbeat = heartbeatData.timestamp;
          
          // 如果没有记录启动时间，使用服务报告的启动时间
          if (!this.servicesStatus.static.startTime && heartbeatData.services.static.startTime) {
            this.servicesStatus.static.startTime = heartbeatData.services.static.startTime;
            
            // 记录到插件实例
            this.staticServerStartTime = heartbeatData.services.static.startTime;
          }
          
          // 广播状态更新
          this.eventBus.emit('service:status-updated', {
            service: 'static',
            status: this.servicesStatus.static
          });
        }
      } catch (err) {
        console.error('更新服务状态失败:', err);
      }
    };
    
    // 检查所有服务状态
    this.checkServicesStatus = async () => {
      try {
        // 先ping主服务
        const mainStatus = await this.pingServer();
        
        // 如果主服务已关闭但状态未更新，发出事件
        if (!mainStatus && this.servicesStatus.main.isRunning) {
          this.servicesStatus.main.isRunning = false;
          this.eventBus.emit('server:stopped');
          this.eventBus.emit('service:status-updated', {
            service: 'main',
            status: this.servicesStatus.main
          });
        }
        
        // 再ping静态服务
        const staticStatus = await this.pingStaticServer();
        
        // 如果静态服务已关闭但状态未更新，发出事件
        if (!staticStatus && this.servicesStatus.static.isRunning) {
          this.servicesStatus.static.isRunning = false;
          this.eventBus.emit('staticServer:stopped');
          this.eventBus.emit('service:status-updated', {
            service: 'static',
            status: this.servicesStatus.static
          });
        }
      } catch (err) {
        console.warn('检查服务状态失败:', err);
      }
    };
  }
  /**
   * 移动到menus.js中
   */
  添加菜单() {
    import(`/plugins/${this.name}/source/UI/siyuanCommon/index.js`)

  }
  创建资源Tab类型() {
    // 统一的tab创建函数
    const createTab = (tabType) => {
      const config = TAB_CONFIGS[tabType];
      return this.addTab({
        type: tabType,
        init() {
          this.element.innerHTML = `<div class="plugin-sample__${tabType.toLowerCase()}">${this.data.text}</div>`;
          import('/plugins/SACAssetsManager/src/toolBox/feature/useVue/vueComponentLoader.js').then(
            async module => {
              try {
                // 使用await等待异步函数完成
                await module.createVueInterface(this, config.component, config.containerId);
                
                // 如果有传递数据，在组件挂载后触发事件
                if (this.data.tabData) {
                  // 使用一个小延迟确保Vue组件已完全挂载
                  setTimeout(() => {
                    pluginInstance.eventBus.emit(EVENTS.SEND_DATA_TO_TAB, {
                      tabType,
                      tabId: this.id,
                      data: this.data.tabData
                    });
                  }, 100);
                }
              } catch (error) {
                console.error(`加载Tab组件(${tabType})失败:`, error);
              }
            }
          );
        },
        beforeDestroy() {
          this.element.innerHTML = "";
          this.controllers?.forEach(controller => controller.abort());
          
          // 发送Tab关闭事件
          pluginInstance.eventBus.emit(EVENTS.TAB_CLOSED, {
            tabType,
            tabId: this.id
          });
        }
      });
    }
    // 为每种类型创建tab
    Object.keys(TAB_CONFIGS).forEach(tabType => {
      this[`${tabType}Define`] = createTab(tabType);
    });
  }
}





function 插入UI面板容器(UI容器父元素) {
  UI容器父元素.innerHTML = `<div class="fn__flex-1 fn__flex-column cc_ui-container"></div>`
  return UI容器父元素.querySelector(".fn__flex-1.fn__flex-column")
}


/***
 * 引入这个模块只是为了测试
 */
import('/plugins/SACAssetsManager/tests/index.js')

