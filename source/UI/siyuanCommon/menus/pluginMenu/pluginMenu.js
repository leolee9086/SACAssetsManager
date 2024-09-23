export function 添加插件菜单内容(menu, assets) {
    const 插件菜单代理 = {
        items: [],
        addItem(menuItem) {
            this.items.push(menuItem)
        },
        addSeparator: () => {
            menu.addSeparator()
        }
    }
    const plugins = siyuan.ws.app.plugins
    plugins.forEach(
        plugin => {
            console.log(assets)
            try {
                plugin.eventBus.emit(
                    'assets-item-clicked', {
                    menu, assets
                }
                )
            } catch (e) {
                console.warn(e)
            }
            if (plugin.name === 'monaco-editor') {
                try {
                    assets.forEach(
                        asset => {
                            if (asset.type === 'note') {
                                return
                            }
                            const element = document.createElement('span')
                            element.setAttribute('data-href', `file://${asset.path.replace(/\\/g,'/')}`)
                            console.log(element)
                            plugin.eventBus.emit(
                                "open-menu-link", {
                                element,
                                menu: 插件菜单代理
                            }
                            )

                        }
                    )
                } catch (e) {
                    console.warn(e)
                }
            }
        }
    )
    if (插件菜单代理.items.length) {
        menu.addSeparator()
        插件菜单代理.items.forEach(
            menuItem => {
                try {
                    menu.addItem(menuItem)
                } catch (e) {
                    console.warn(e)
                }
            }
        )
        menu.addSeparator()
    }
}