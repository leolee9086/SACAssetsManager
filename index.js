const { Plugin } = require("siyuan");
const clientApi = require("siyuan");
globalThis[Symbol.for(`clientApi`)] = globalThis[Symbol.for(`clientApi`)] || clientApi
let eventBus
module.exports = class SACAssetsManager extends Plugin {
  onload() {
    eventBus = this.eventBus
    this.插件自身工作空间路径 = `/data/plugins/${this.name}`
    this.工作空间根路径 = window.siyuan.config.system.workspaceDir
    this.插件自身伺服地址 = `/plugins/${this.name}`
    this.selfURL = this.插件自身伺服地址
    this.stayAlive = true
    this.创建web服务()
    this.添加资源文件菜单()
    this.创建资源Tab类型()
    this.监听资源项目事件()
  }
  async 创建web服务() {
    await import(`${this.插件自身伺服地址}/source/server/main.js`)
    const 端口工具箱 = await import(`${this.插件自身伺服地址}/source/utils/port.js`)
    this.http服务端口号 = await 端口工具箱.获取插件服务端口号(this.name + "_http", 80)
    this.https服务端口号 = await 端口工具箱.获取插件服务端口号(this.name + "_https", 443)
    console.log(this.http服务端口号, this.https服务端口号)
  }
  监听资源项目事件(){
    this.eventBus.on(
      'open-asset',(e)=>{
        const assetPath= e.detail
        const { shell } = window.require('@electron/remote');
        
        shell.openPath(siyuan.config.system.workspaceDir+'\\data\\'+assetPath).then((result) => {
          if (result) {
            console.error('Failed to open asset:', result);
          }
        });

      }
    )
    this.eventBus.on(
      'rightclick-galleryitem',(e)=>{
        const {event,assets} = e.detail
        const menu =new clientApi.Menu('sac-galleryitem-menu')
        menu.addItem(
          {
            label:'附件'+(assets.length===0?``:`(${assets.length})`),
            disabled:'ture',
            type:'readonly'
          }
        )
        menu.addSeparator();
        menu.addItem(
          {
            label:'打开',
            submenu:[
              {
                label:"所在笔记",
                click:()=>{
                  const {event,assets}=e.detail
                  console.log(assets)
                  assets.forEach(asset => {
                    clientApi.openTab(
                      {
                        app:this.app,
                        doc:{
                          id:asset.block_id,
                          action:"cb-get-focus"
                        }
                      }
                    )
  
                  });
                }
              },
              {
                label:'使用默认应用打开'
              },
              {
                label:'在文件管理器打开'
              }
            ]
          },
        )
        menu.addSeparator();

        menu.addItem(
          {
            label:'添加至',
            submenu:[
              {
                label:"最近笔记"
              },{
                label:"日记"
              }
            ]
          },
        )

        this.eventBus.emit(
          'contextmenu-galleryitem',{event,assets,menu}
        )
        
        menu.open({y:event.y,x:event.x})
      }
    )
  }
  添加资源文件菜单() {
    this.eventBus.on(
      'click-galleryboxicon',(event)=>{
            clientApi.openTab({
              app: this.app,
              custom: {
                icon: "iconAssets",
                title: "资源",
                data: {
                  box: event.detail.data.box
                },
                id: this.name + 'AssetsTab'
              },
              position:'right'

            })
          
        
      }
    )
    this.eventBus.on(
      'click-editortitleicon', (event) => {
        console.log(event.detail)
        event.detail.menu.addItem({
          label: "打开附件管理视图",
          click: () => {
            clientApi.openTab({
              app: this.app,
              custom: {
                icon: "iconAssets",
                title: "资源",
                data: {
                  block_id: event.detail.data.id
                },
                id: this.name + 'AssetsTab'
              },
              position:'right'

            })
          }
        })
      })
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
      },
      destroy() {
      }
    })
  }
}
