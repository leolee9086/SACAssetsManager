const { Plugin } = require("siyuan");
const clientApi = require("siyuan");
globalThis[Symbol.for(`clientApi`)] = globalThis[Symbol.for(`clientApi`)] || clientApi
let eventBus


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

console.log('测试', 构建TAB配置())



/**
 * tab注册
 */
const TAB_CONFIGS = {
  AssetsTab: {
    component: '/plugins/SACAssetsManager/source/UI/components/assetGalleryPanel.vue',
    containerId: 'assetsColumn'
  },
  EditorTab: {
    component: '/plugins/SACAssetsManager/source/UI/components/editors/image.vue',
    containerId: 'assetsColumn'
  },
  ImagePreviewerTab: {
    component: '/plugins/SACAssetsManager/source/UI/pannels/pageEditor/index.vue',
    containerId: 'imagePreviewerPanel'
  }
}
const DOCK_CONFIGS = {
  AssetsPanel: {
    icon: "iconInfo",
    position: "LeftBottom",
    component: '/plugins/SACAssetsManager/source/UI/pannels/assetInfoPanel/assestInfoPanel.vue',
    title: "SACAssetsPanel"
  },
  CollectionPanel: {
    icon: "iconDatabase",
    position: "RightBottom",
    component: '/plugins/SACAssetsManager/source/UI/components/collectionPanel.vue',
    title: "SACAssetsCollectionPanel"
  }
}
let pluginInstance = {}
module.exports = class SACAssetsManager extends Plugin {
  onload() {
    pluginInstance = this
    eventBus = this.eventBus
    this.插件自身工作空间路径 = `/data/plugins/${this.name}`
    this.工作空间根路径 = window.siyuan.config.system.workspaceDir
    this.插件自身伺服地址 = `/plugins/${this.name}`
    this.selfURL = this.插件自身伺服地址
    this.初始化插件同步状态()
    this.初始化插件异步状态()
    this.加载工具webview()
    this.添加全局事件监听()
    this.stayAlive = true
    this.创建web服务()
    this.添加资源信息边栏()
    this.创建资源Tab类型()
    this.添加菜单()
    this.加载i18n工具()
  }
  初始化插件同步状态() {
    this.最近打开本地文件夹列表 = new Set()
  }
  初始化插件异步状态() {
    import(`${this.插件自身伺服地址}/source/UI/icons/addicon.js`)
    import(`${this.插件自身伺服地址}/source/globalStatus/index.js`)
  }

  async 写入i18n(lang, content) {
    let targetPath = this.插件自身工作空间路径 + '/i18n/' + `${lang}.json`
    let workspace = await import(`${this.插件自身伺服地址}/source/polyfills/fs.js`)
    await workspace.writeFile(targetPath, JSON.stringify(content, undefined, 2))
  }
  加载i18n工具() {
    this.$翻译 = function (字符串数组, ...插值) {
      // 直接使用原始的模板字符串
      return 字符串数组.reduce((结果, 字符串, 索引) =>
        结果 + 字符串 + (插值[索引] || ''), '');
    };
    import(`${this.插件自身伺服地址}/source/utils/i18n/aiI18n.js`).then(
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
      打开附件所在路径: 'open-asset-folder'
    }
  }
  加载工具webview() {
    //用于触发原生拖拽事件
    import(`${this.插件自身伺服地址}/source/utilWebviews/drag.js`)
  }
  添加全局事件监听() {
    import(`${this.插件自身伺服地址}/source/events/globalEvents.js`)
  }
  emitEvent(eventName, detail, options) {
    if (!Object.values(this.events).includes(eventName)) {
      throw new Error(`事件名不存在: ${eventName}`);
    } else {
      if (options && options.stack) {
        this.eventBus.emit(eventName, {
          stack: (new Error()).stack,
          ...detail
        })
        return
      }
      this.eventBus.emit(eventName, detail)
    }
  }
  createDock(dockType) {
    const config = DOCK_CONFIGS[dockType];
    const dock = this.addDock({
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
        import('/plugins/SACAssetsManager/source/UI/tab.js').then(
          module => {
            const app = module.initVueApp(config.component)
            app.mount(container)
          }
        )
      }
    });
    return dock;
  }

  添加资源信息边栏() {
    this.assetsPanelDock = this.createDock('AssetsPanel');
    this.collectionPanelDock = this.createDock('CollectionPanel');
  }
  async 创建web服务() {
    const 端口工具箱 = await import(`${this.插件自身伺服地址}/source/utils/port.js`)
    this.http服务端口号 = await 端口工具箱.获取插件服务端口号(this.name + "_http", 6992)
    this.https服务端口号 = await 端口工具箱.获取插件服务端口号(this.name + "_https", 6993)
    await import(`${this.插件自身伺服地址}/source/server/main.js`)
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
          import('/plugins/SACAssetsManager/source/UI/tab.js').then(module => {
            module.创建Vue组件界面(this, config.component, config.containerId);
          });
        },
        beforeDestroy() {
          this.element.innerHTML = "";
          this.controllers?.forEach(controller => controller.abort());
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
import('/plugins/SACAssetsManager/source/utils/test.js')

