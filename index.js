const { Plugin } = require("siyuan");
const clientApi = require("siyuan");
globalThis[Symbol.for(`clientApi`)] = globalThis[Symbol.for(`clientApi`)] || clientApi
let eventBus
/**
 * 测试全盘信息读取
 */
//import ('/plugins/SACAssetsManager/source/utils/Math.js')
module.exports = class SACAssetsManager extends Plugin {
  onload() {
    eventBus = this.eventBus
    this.插件自身工作空间路径 = `/data/plugins/${this.name}`
    this.工作空间根路径 = window.siyuan.config.system.workspaceDir
    this.插件自身伺服地址 = `/plugins/${this.name}`
    this.selfURL = this.插件自身伺服地址
    this.加载状态控制器()
    this.初始化进程状态()
    this.加载工具webview()
    this.添加全局事件监听()
    this.stayAlive = true
    this.创建web服务()
    this.添加资源信息边栏()
    this.创建资源Tab类型()
    this.添加菜单()
    this.加载i18n工具()
  }
  async 加载状态控制器(){
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
          if(!this.启用AI翻译){
            let 翻译结果 =this.i18n[完整模板]|| 完整模板
            插值.forEach((值, 索引) => {
              翻译结果 = 翻译结果.replace(`__VAR_${索引}__`, 值);
            });
            return 翻译结果
          }
          if (this.i18n[完整模板]&&this.i18n[完整模板]!==完整模板) {
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
  初始化进程状态() {
    this.最近打开本地文件夹列表 = new Set()
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
  添加资源信息边栏() {
    this.addDock({
      config: {
        icon: "iconInfo",
        position: "LeftBottom",
        size: { width: 200, height: 0 },
        title: "SACAssetsPanel",
      },
      data: {
        text: "",
      },
      type: "config",
      init() {
        const UI容器父元素 = this.element
        this.contollers = []
        const UI容器 = 插入UI面板容器(UI容器父元素)
        import('/plugins/SACAssetsManager/source/UI/tab.js').then(
          module => {
            module.创建资源信息面板(UI容器)
          }
        )
      },
    })
    this.addDock({
      config: {
        icon: "iconDatabase",
        position: "RightBottom",
        size: { width: 200, height: 0 },
        title: "SACAssetsCollectionPanel",
      },
      data: {
        text: "",
      },
      type: "Collection",
      init() {
        const UI容器父元素 = this.element
        const UI容器 = 插入UI面板容器(UI容器父元素)
        import('/plugins/SACAssetsManager/source/UI/tab.js').then(
          module => {
            module.创建收藏夹面板(UI容器)
          }
        )
      },

    })
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
    eventBus.on(
      'assets-tab-open', (e) => {
        let tab = e.detail;
        import('/plugins/SACAssetsManager/source/UI/tab.js').then(
          module => {
            module.创建图库界面(tab)
          }
        )
      }
    )
    let plugin = this
    this.AsseatsTabDefine = this.addTab({
      type: 'AssetsTab',
      init() {
        this.element.innerHTML = `<div class="plugin-sample__custom-tab">${this.data.text}</div>`;
        plugin.eventBus.emit(
          'assets-tab-open', this
        )
      },
      beforeDestroy() {
        this.element.innerHTML = ""
        this.controllers && this.controllers.forEach(controller => {
          controller.abort()
        })
      }

    })
  }
}
function 插入UI面板容器(UI容器父元素) {
  UI容器父元素.innerHTML = `<div class="fn__flex-1 fn__flex-column cc_ui-container"></div>`
  return UI容器父元素.querySelector(".fn__flex-1.fn__flex-column")
}
