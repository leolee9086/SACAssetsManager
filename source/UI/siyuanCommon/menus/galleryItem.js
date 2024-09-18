import { clientApi, plugin } from "../../../asyncModules.js";
import { 解析文件属性数组内部属性显示 } from "../../../data/attributies/parseAttributies.js";
import * as menuItems from "./galleryItemMenu/menuItems.js"
import * as 文件移动菜单组 from "./galleryItemMenu/fileMoveMenuItems.js"
import * as 元数据编辑菜单组 from "./editModeMenu/items.js"
import * as 文件内容编辑菜单组  from "./galleryItemMenu/fileEditMenuItems.js"
import * as 文件批处理菜单组 from "./batchMenu/batch.js"
import { thumbnail } from "../../../server/endPoints.js";
const { eventBus } = plugin
const 创建模式菜单 = (模式, event, assets, options) => {
    return {
        label: 模式.label,
        click: () => {
            plugin.附件编辑模式 = 模式
            setTimeout(() => 打开附件组菜单(event, assets, options), 100)
        }
    }
}
const 模式切换菜单项=(event,assets,options)=>{
    const result =        {
        label: "切换模式",
        submenu: [
            创建模式菜单({
                label: '移动',
                value: "移动"
            },
                event, assets, options
            ),
            创建模式菜单(
                {
                    label: "插件",
                    value: '插件'
                },
                event, assets, options
            ),
            创建模式菜单(
                {
                    label: "常规",
                    value: '常规'

                },
                event, assets, options
            ),
            创建模式菜单(
                {
                    label: "编辑",
                    value: '编辑'

                },
                event, assets, options
            ),
           
        ]
    }
    options.tab.data.localPath&&result.submenu.push(
            创建模式菜单(
                {
                    label: "批处理(实验性)",
                    value: '批处理'
                },
                event, assets, options
            )
    )
    return result
}
function 计算主标签(assets, 模式) {
    if (模式 && 模式.label) {
        return 模式 && 模式.label + ':' + '附件' + (assets.length === 0 ? `` : `(${assets.length})`)
    } else {
        return '附件' + (assets.length === 0 ? `` : `(${assets.length})`)
    }
}

export const 打开附件组菜单 = (event, assets, options) => {
    const {position,panelController}=options
    plugin.附件编辑模式=plugin.附件编辑模式||{
        label:'常规',
        value:"常规"
    }
    const menu = new clientApi.Menu('sac-galleryitem-menu')
    menu.addItem(
        {
            label: 计算主标签(assets, plugin.附件编辑模式),
            disabled: 'true',
            type: 'readonly'
        }
    )
    menu.addSeparator()
    menu.addItem(模式切换菜单项(event,assets,options))
    if (plugin.附件编辑模式 && plugin.附件编辑模式.value === '批处理') {
        menu.addSeparator();
        menu.addItem(文件批处理菜单组.删除所有ThumbsDB(options))
        menu.addItem(文件批处理菜单组.展平并按扩展名分组(options));
        menu.addItem(文件批处理菜单组.整理纯色和接近纯色的图片(options));
        menu.addItem(文件批处理菜单组.扫描重复文件(options));
        menu.addSeparator();

        menu.addItem(文件批处理菜单组.快速扫描重复文件(options));

        menu.addItem(文件批处理菜单组.处理重复文件(options));
        menu.addSeparator();

        menu.addItem(文件批处理菜单组.归集图片文件(options));
        menu.addItem(文件批处理菜单组.扫描空文件夹(options));
        menu.addItem(文件批处理菜单组.复制文档树结构(options));

    }
    if (plugin.附件编辑模式 && plugin.附件编辑模式.value === '插件') {
        menu.addSeparator();
        menu.addItem(
            menuItems.使用TEColors插件分析图像颜色(assets),
        )
        添加插件菜单内容(menu.assets)
    }
    if (plugin.附件编辑模式 && plugin.附件编辑模式.value === '移动') {
        menu.addSeparator();
        menu.addItem(文件移动菜单组.以file链接形式添加到最近笔记本日记(assets))
        menu.addItem(文件移动菜单组.移动到回收站(assets,panelController))
        文件移动菜单组.移动到最近目录菜单组(assets,event).forEach(
            item=>{
                menu.addItem(item)

            }
        )
    }
    if (plugin.附件编辑模式 && plugin.附件编辑模式.value === '编辑') {
        menu.addSeparator();
        menu.addItem(元数据编辑菜单组.重新计算文件颜色(assets))
        assets.length === 1&& menu.addItem(元数据编辑菜单组.上传缩略图(assets))
        assets.length === 1&& menu.addItem(元数据编辑菜单组.从剪贴板上传缩略图(assets))
        menu.addSeparator()
        let png菜单组 =文件内容编辑菜单组.压缩图片菜单项(assets,80,9,'png')
        png菜单组.submenu=文件内容编辑菜单组.压缩菜单组(assets,'png')
        menu.addItem(png菜单组)

        let jpg菜单组 =文件内容编辑菜单组.压缩图片菜单项(assets,80,9,'jpg')
        jpg菜单组.submenu=文件内容编辑菜单组.压缩菜单组(assets,'jpg')
        menu.addItem(jpg菜单组)

        let webp菜单组 =文件内容编辑菜单组.压缩图片菜单项(assets,80,9,'webp')
        webp菜单组.submenu=文件内容编辑菜单组.压缩菜单组(assets,'webp')
        menu.addItem(webp菜单组)

        if (assets.length === 1) {
            const asset = assets[0];
            const colorUrl = thumbnail.getColor(asset.type, asset.path, false);
            
            fetch(colorUrl)
                .then(response => response.json())
                .then(colorData => {
                    if (colorData && Array.isArray(colorData)) {
                        colorData.forEach(colorInfo => {
                            const colorHex = `#${colorInfo.color.map(c => c.toString(16).padStart(2, '0')).join('')}`;
                            menu.addItem({
                                label: `颜色操作: ${colorHex}`,
                                icon: `<span style="background-color: ${colorHex}; width: 16px; height: 16px; display: inline-block; margin-right: 5px;"></span>`,
                                submenu: [
                                    {
                                        label: `复制颜色代码: ${colorHex}`,
                                        click: () => {
                                            navigator.clipboard.writeText(colorHex);
                                        }
                                    },
                                    {
                                        label: `删除此颜色记录`,
                                        click: () => {
                                            // 调用删除颜色记录的函数

                                        }
                                    },
                                    {
                                        label: `颜色占比: ${colorInfo.percent*100}%`,
                                        disabled: true
                                    }
                                ]
                            });
                        });
                    }
                })
                .catch(error => {
                    console.error('获取颜色信息失败:', error);
                });
        }
    }
    assets&&assets[0]&&添加通用菜单内容(menu, assets)
    assets&&assets[0]&&添加只读菜单内容(menu, assets)
    eventBus.emit(
        'contextmenu-galleryitem', { event, assets, menu, mode: plugin.附件编辑模式 }
    )
    menu.open(position)
    document.addEventListener('mousedown', () => { menu.close }, { once: true })
}
function 添加只读菜单内容(menu, assets) {
    menu.addItem({
        label: `创建时间:${解析文件属性数组内部属性显示('ctimeMs', assets)}`,
        disabled: 'ture',
        type: 'readonly'
    })

}
function 添加插件菜单内容(menu, assets) {
    /**
     * 创建一个下级菜单
     */
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
            try {
                plugin.eventBus.emit(
                    'assets-item-clicked', {
                    menu, assets
                }
                )
            } catch (e) {
                console.warn(e)
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


/**
 * 常规菜单内容
 * @param {*} menu 
 * @param {*} assets 
 */
function 添加通用菜单内容(menu, assets) {
    //常规模式下展开所有常规菜单
    if ((plugin.附件编辑模式.value==='常规')) {
        menu.addSeparator();
        menu.addItem(menuItems.打开资源文件所在笔记(assets))
        menu.addItem(menuItems.使用默认应用打开附件(assets))
        menu.addItem(menuItems.在文件管理器打开附件(assets))
        menu.addItem(menuItems.在新页签打开文件所在路径(assets))
        menu.addSeparator();
        menu.addItem(menuItems.复制文件地址(assets))
        menu.addItem(menuItems.复制文件链接(assets))
        menu.addItem(menuItems.复制文件缩略图地址(assets))
        menu.addItem(menuItems.上传到assets并复制链接(assets))
        menu.addSeparator();
        menu.addItem(menuItems.清理缓存并硬刷新())
        menu.addSeparator();
    } else {
        //否则收缩到子菜单项目
        menu.addSeparator();
        const 附件打开菜单组 = [
            menuItems.打开资源文件所在笔记(assets),
            menuItems.使用默认应用打开附件(assets),
            menuItems.在文件管理器打开附件(assets),
            menuItems.在新页签打开文件所在路径(assets),
        ]
        menu.addItem(
            {
                label: "打开",
                submenu: 附件打开菜单组
            }
        )
        menu.addSeparator();
        const 附件复制菜单组 = [
            menuItems.复制文件地址(assets),
            menuItems.复制文件链接(assets),
            menuItems.复制文件缩略图地址(assets),
            menuItems.上传到assets并复制链接(assets),
        ]
        menu.addItem(
            {
                label: "复制",
                submenu: 附件复制菜单组
            }
        )
    }
}