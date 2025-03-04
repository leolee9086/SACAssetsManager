/**
 * SACAssetsManager 插件入口
 * 实现轻量级扩展加载系统
 * 
 * 架构设计:插件本体层只是一个适配层,它需要非常"瘦"
 * - 模块(Services): 
 *    核心系统级别组件，为扩展提供基础能力，可动态修改扩展可获取的API
 *    最核心的模块只有一个"模块加载器",它将加载所有模块,包括扩展加载模块
 *    我们需要处理的最大问题是最精炼而丰富的核心模块提供
 * - 扩展(Extensions): 
 *    "插件的插件"，通过路由调用模块功能，通过事件总线模块进行相互通信
 *    扩展本身是通过插件的编译模块和编译工具箱实时编译的,所以我们需要一个极其高效的编译模块
 *    编译模块需要能够支持在浏览器端运行,并且保证扩展代码书写看起来与原生代码尽可能小
 * - 工具箱(ToolBox): 
 *    几乎所有外部依赖和环境能力都会被工具箱包裹而不是直接调用,
 *    扩展在引入外部依赖时会警告,以尽可能充分利用外部依赖,并简化扩展发开体验
 * 
 * 主体命名风格必须保持中文,英文仅仅用于:
 * 1.外界提供的接口
 * 2.对外部接口
 * 3.原生环境(js,node,浏览器,宿主软件)提供的功能
 */


// 导入核心模块
/**
 * @AI 主体插件会被
 * const runCode = (code: string, sourceURL: string) => {
    return window.eval("(function anonymous(require, module, exports){".concat(code, "\n})\n//# sourceURL=").concat(sourceURL, "\n"));
  };
  这样的方式加载，所以**在本文件中**请不要使用静态import，并且尽可能减少初始化时动态加载的数量
 */

/**
 * 思源笔记的前端API通过它的插件以require('siyuan')的形式提供给插件
 * 我们需要将它以更加零散灵活的形式提供给扩展
 */
const siyuanClientApi = require("siyuan");
const { Plugin } = siyuanClientApi;

// 预先缓存常用API引用，避免重复属性查找
const {
  confirm, showMessage, adaptHotkey,
  fetchPost, fetchGet, fetchSyncPost,
  getFrontend, getBackend,
  openTab, Dialog, Menu,
  Constants, Protyle, Setting
} = siyuanClientApi;

class SACAssetsManager extends Plugin {
  async onload() {
    console.info("SACAssetsManager 插件加载中...");

    try {
      // 初始化环境变量 - 提前初始化以避免多次访问
      this.初始化环境变量();

      // 使用变量缓存 this 引用，减少作用域链查找
      const self = this;

      // 预先准备宿主层API对象引用，减少对象创建开销
      const 插件方法 = {
        loadData: self.loadData.bind(self),
        saveData: self.saveData.bind(self),
        removeData: self.removeData.bind(self),
        addTopBar: self.addTopBar.bind(self),
        addStatusBar: self.addStatusBar.bind(self),
        addTab: self.addTab.bind(self),
        addDock: self.addDock.bind(self),
        addFloatLayer: self.addFloatLayer.bind(self),
        addCommand: self.addCommand.bind(self),
        addIcons: self.addIcons.bind(self),
        getOpenedTab: self.getOpenedTab.bind(self),
        openSetting: self.openSetting.bind(self)
      };

      // 客户端API对象复用已缓存的引用
      const 客户端API = {
        confirm, showMessage, adaptHotkey,
        fetchPost, fetchGet, fetchSyncPost,
        getFrontend, getBackend,
        openTab, Dialog, Menu,
        Constants, Protyle, Setting
      };

      // 创建宿主层API对象
      const 宿主层API = {
        插件名称: self.name,
        环境变量: self.环境变量,
        解析路径: self.解析路径.bind(self),
        客户端API,
        插件方法,
        eventBus: self.eventBus,
        注册卸载回调: (回调) => { self.卸载回调 = 回调; }
      };

      // 初始化模块加载器模块 - 根据注释要求，避免静态import，使用动态导入
      // 使用缓存变量存储模块引用，避免重复加载
      if (!self.模块加载器模块) {
        // 修复模块加载器路径，使用插件URL作为基础路径，避免404错误
        const 模块加载器路径 = self.解析路径('core/servicesLoader.js');
        self.模块加载器模块 = await import(模块加载器路径);
      }
      
      
      // 将宿主层API传递给模块加载器
      await self.模块加载器模块.初始化({
        ...宿主层API,
      });

      // 由模块加载器接管后续所有操作
      await self.模块加载器模块.启动();

      console.info("SACAssetsManager 插件加载完成");
    } catch (错误) {
      console.error("SACAssetsManager 插件加载失败:", 错误);
    }
  }

  async onunload() {
    console.info("SACAssetsManager 插件卸载中...");

    // 由模块加载器处理所有卸载工作
    if (this.模块加载器模块) {
      await this.模块加载器模块.销毁();
      this.模块加载器模块 = null;
    }

    // 执行注册的卸载回调（如果有）
    if (this.卸载回调) {
      await this.卸载回调();
    }

    console.info("SACAssetsManager 插件卸载完成");
  }

  // 优化环境变量初始化方法
  初始化环境变量() {
    const { protocol, hostname, port } = window.location;
    const portStr = port ? `:${port}` : '';
    const name = this.name;

    // 一次性设置所有路径变量
    this.插件URL = `${protocol}//${hostname}${portStr}/plugins/${name}/`;
    this.数据路径 = `/data/storage/petal/${name}`;
    this.临时路径 = `/temp/${name}/`;
    this.公共路径 = `/data/public`;
    this.插件路径 = `/data/plugins/${name}`;

    // 条件判断提前，避免每次都检查
    if (window.require) {
      const path = window.require('path');
      this.本地路径 = path.join(window.siyuan.config.system.workspaceDir, 'data', 'plugins', name);
    } else {
      this.本地路径 = null;
    }

    // 使用对象字面量一次性创建环境变量
    this.环境变量 = {
      插件名称: name,
      插件URL: this.插件URL,
      数据路径: this.数据路径,
      临时路径: this.临时路径,
      公共路径: this.公共路径,
      插件路径: this.插件路径,
      本地路径: this.本地路径
    };
  }

  // 优化路径解析方法
  解析路径(路径) {
    // 使用字符串方法代替正则表达式
    if (路径.startsWith('/') || 路径.startsWith('http://') || 路径.startsWith('https://')) {
      return 路径;
    }
    // 避免创建完整URL对象，仅在必要时使用
    return decodeURIComponent(new URL(路径, this.插件URL).toString());
  }
}

// 导出插件类
module.exports = SACAssetsManager;