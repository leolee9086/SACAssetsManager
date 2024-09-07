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
    this.添加全局事件监听()
    this.stayAlive = true
    this.创建web服务()
    this.添加资源信息边栏()
    this.创建资源Tab类型()
    this.添加菜单()
  
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
  添加全局事件监听(){
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
        icon: "iconAssetsPannel",
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
        this.contollers=[]
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
        icon: "iconCollectionPannel",
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
    this.https服务端口号 = await 端口工具箱.获取插件服务端口号(this.name + "_https",6993)
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
        this.controllers&&this.controllers.forEach(controller=>{
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
