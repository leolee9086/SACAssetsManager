import { clientApi, plugin } from "../../../asyncModules.js";
import { 解析文件属性数组内部属性显示 } from "../../../data/attributies/parseAttributies.js";
import * as menuItems from "./galleryItemMenu/menuItems.js"
import * as 文件移动菜单组 from "./galleryItemMenu/fileMoveMenuItems.js"
import * as 元数据编辑菜单组 from "./editModeMenu/items.js"
import * as 文件内容编辑菜单组 from "./galleryItemMenu/fileEditMenuItems.js"
import * as 文件批处理菜单组 from "./batchMenu/batch.js"
import { thumbnail } from "../../../server/endPoints.js";
import { 模式切换菜单项 } from "./modeMenu/modeSwitch.js";
import { 计算主标签 } from "./common/menuHead.js";
import { 添加插件菜单内容 } from "./pluginMenu/pluginMenu.js";
import { 打开本地资源视图 } from "../tabs/assetsTab.js";
import { isImage } from "../../../utils/image/isImage.js";
import { 根据背景色获取黑白前景色 } from "../../../utils/color/processColor.js";
import { fetchSync } from "../../../utils/netWork/fetchSync.js";
import { 构建菜单 } from "../../../utils/siyuanUI/menu.js";
//import { checkClipboardForFilePath } from "../../../utils/browser/clipBoard.js";
import { checkClipboardForFilePath } from "../../../../src/toolBox/base/useBrowser/useClipBoard.js";
import { rgbaArrayToHexString } from "../../../utils/color/colorSpace.js";
import { h, f } from "../../../utils/DOM/builder.js";
const { eventBus } = plugin
function 添加批处理菜单组(menu, options) {
    const menuItems = [
        { action: 文件批处理菜单组.删除所有ThumbsDB, separator: true },
        { action: 文件批处理菜单组.扫描重复文件 },
        { action: 文件批处理菜单组.快速扫描重复文件 },
        { action: 文件批处理菜单组.处理重复文件 },
        { action: 文件批处理菜单组.扫描空文件夹, separator: true },
        { action: 文件批处理菜单组.整理纯色和接近纯色的图片 },
        { action: 文件批处理菜单组.图片去重 },
        { action: 文件批处理菜单组.图片去重, args: [true] },
        { action: 文件批处理菜单组.基于pHash的图片去重 },
        { action: 文件批处理菜单组.基于pHash的图片去重, args: [true], separator: true },
        { action: 文件批处理菜单组.展平并按扩展名分组 },
        { action: 文件批处理菜单组.归集图片文件 },
        { action: 文件批处理菜单组.复制文档树结构, separator: true },
        { action: 文件批处理菜单组.批量打包文件 }
    ];
    构建菜单(menu, menuItems, options);
}
function 添加颜色操作菜单(menu, asset) {
    const colorUrl = thumbnail.getColor(asset.type, asset.path, false);
    try {
        const response = fetchSync(colorUrl);
        if (response.ok) {
            const colorData = response.json();
            if (colorData && Array.isArray(colorData)) {
                colorData.forEach(colorInfo => {
                    const colorHex = rgbaArrayToHexString(colorInfo.color);
                    const fragment = 创建颜色菜单项(colorHex, colorInfo);
                    menu.addItem({
                        element: fragment,
                        submenu: 生成颜色子菜单(colorHex, colorInfo)
                    });
                });
            }
        } else {
            console.error('获取颜色信息失败:', response.statusText);
        }
    } catch (error) {
        console.error('获取颜色信息失败:', error);
    }
}

function 创建颜色菜单项(colorHex, colorInfo) {
    return f(
        h('svg', {
            class: 'b3-menu__icon',
            viewBox: '0 0 24 24',
            width: '16',    // 添加具体宽度
            height: '16',   // 添加具体高度
            fill: 'currentColor'  // 添加填充颜色

        },
            h('svg:use', {
                'xlink:href': '#iconColors'
            })
        ),
        h('div', {
            class: 'b3-menu__label',
            style: {
                backgroundColor: colorHex,
                marginRight: '5px',
                color: 根据背景色获取黑白前景色(colorHex)
            },    
        }, `颜色操作: ${colorHex}`)
    );
}
function 生成颜色子菜单(colorHex, colorInfo) {
    return [
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
            label: `颜色占比: ${colorInfo.percent * 100}%`,
            disabled: true
        }
    ];
}
function 添加附件选中信息(menu, assets) {
    menu.addItem(
        {
            label: 计算主标签(assets, plugin.附件编辑模式),
            disabled: 'true',
            type: 'readonly'
        }
    )
}

export const 打开附件组菜单 = (event, assets, options) => {
    const { position, panelController } = options
    plugin.附件编辑模式 = plugin.附件编辑模式 || {
        label: '常规',
        value: "常规"
    }
    const menu = new clientApi.Menu('sac-galleryitem-menu')
    添加附件选中信息(menu, assets)
    menu.addSeparator()
    menu.addItem(模式切换菜单项(event, assets, options))
    if (plugin.附件编辑模式 && plugin.附件编辑模式.value === '批处理') {
        添加批处理菜单组(menu, options)
    }
    if (plugin.附件编辑模式 && plugin.附件编辑模式.value === '插件') {
        menu.addSeparator();
        menu.addItem(
            menuItems.使用TEColors插件分析图像颜色(assets),
        )
        添加插件菜单内容(menu, assets)
    }
    if (plugin.附件编辑模式 && plugin.附件编辑模式.value === '移动') {
        menu.addSeparator();
        menu.addItem(文件移动菜单组.以file链接形式添加到最近笔记本日记(assets))
        menu.addItem(文件移动菜单组.移动到回收站(assets, panelController))
        menu.addItem(文件移动菜单组.创建文件夹并移动(assets, panelController))
        文件移动菜单组.移动到最近目录菜单组(assets, event).forEach(
            item => {
                menu.addItem(item)
            }
        )
    }
    if (plugin.附件编辑模式 && plugin.附件编辑模式.value === '编辑') {
        menu.addSeparator();
        if (assets.find(item => item.path.endsWith('.d5a'))) {
            menu.addItem(元数据编辑菜单组.d5a内置缩略图(assets))
            menu.addItem(元数据编辑菜单组.d5a内置缩略图单次确认(assets))
        }
        if (assets.find(item => item && isImage(item.path))) {
            menu.addItem(元数据编辑菜单组.打开图片编辑器对话框(assets))
            menu.addItem(元数据编辑菜单组.打开简版图片编辑器(assets))

        }
        menu.addItem(元数据编辑菜单组.重新计算文件颜色(assets))
        menu.addItem(元数据编辑菜单组.编辑附件标签组(assets))
        menu.addSeparator();
        assets.length === 1 && menu.addItem(元数据编辑菜单组.上传缩略图(assets))
        assets.length === 1 && menu.addItem(元数据编辑菜单组.从剪贴板上传缩略图(assets))
        menu.addSeparator()
        let png菜单组 = 文件内容编辑菜单组.压缩图片菜单项(assets, 80, 9, 'png')
        png菜单组.submenu = 文件内容编辑菜单组.压缩菜单组(assets, 'png')
        menu.addItem(png菜单组)

        let jpg菜单组 = 文件内容编辑菜单组.压缩图片菜单项(assets, 80, 9, 'jpg')
        jpg菜单组.submenu = 文件内容编辑菜单组.压缩菜单组(assets, 'jpg')
        menu.addItem(jpg菜单组)

        let webp菜单组 = 文件内容编辑菜单组.压缩图片菜单项(assets, 80, 9, 'webp')
        webp菜单组.submenu = 文件内容编辑菜单组.压缩菜单组(assets, 'webp')
        menu.addItem(webp菜单组)

        if (assets.length === 1) {
            添加颜色操作菜单(menu, assets[0]);
        }
    }
    assets && assets[0] && 添加通用菜单内容(menu, assets)
    menu.addSeparator()
    menu.addItem(menuItems.清理缓存并硬刷新())
    menu.addItem({
        'label': plugin.启用AI翻译 ? plugin.翻译`停用AI翻译` : plugin.翻译`启用AI翻译(实验性)`,
        click: () => {
            plugin.启用AI翻译 = !plugin.启用AI翻译
        }
    })

    menu.addSeparator()

    assets && assets[0] && 添加只读菜单内容(menu, assets)
    eventBus.emit(
        'contextmenu-galleryitem', { event, assets, menu, mode: plugin.附件编辑模式 }
    )
    menu.open(position)
    document.addEventListener('mousedown', () => { menu.close }, { once: true })
}
plugin.打开附件组菜单 = 打开附件组菜单
function 添加只读菜单内容(menu, assets) {
    menu.addItem({
        label: `创建时间:${解析文件属性数组内部属性显示('ctimeMs', assets)}`,
        disabled: 'ture',
        type: 'readonly'
    })
}
/**
 * 常规菜单内容
 * @param {*} menu 
 * @param {*} assets 
 */
function 添加通用菜单内容(menu, assets) {
    //常规模式下展开所有常规菜单
    if ((plugin.附件编辑模式.value === '常规')) {
        menu.addSeparator();
        checkClipboardForFilePath().then(paths => {
            if (paths && paths.length > 0) {
                console.log(paths);
                if (paths.length === 1) {
                    menu.addItem({
                        label: `在新页签中打开${paths[0]}`,
                        click: () => {
                            打开本地资源视图(paths[0]);
                        }
                    });
                } else {
                    menu.addItem({
                        label: `在新页签中打开剪贴板中所有路径`,
                        click: () => {
                            paths.forEach(path => {
                                打开本地资源视图(path);
                            });
                        },
                        submenu: paths.map(path => ({
                            label: `打开${path}`,
                            click: () => {
                                打开本地资源视图(path);
                            }
                        }))
                    });
                }
            }
        })
        menu.addItem(menuItems.打开资源文件所在笔记(assets))
        menu.addItem(menuItems.使用默认应用打开附件(assets))
        menu.addItem(menuItems.在文件管理器打开附件(assets))
        menu.addItem(menuItems.在新页签打开文件所在路径(assets))
        menu.addItem(menuItems.打开efu文件视图(assets))
        
        // 添加图片预览器菜单项
        if (assets.find(item => isImage(item.path))) {
            menu.addItem({
                label: "在预览器中打开",
                click: () => {
                    clientApi.openTab({
                        app:plugin.app,
                        custom:{
                            icon: "iconImage",
                            title: "图片预览器",
                            id:plugin.name+'imagePreviewerTab',
                            data: {
                                text: '图片预览器',
                                assets: assets
                            }
                        },
                     
                    });
                }
            });
        }
        
        menu.addSeparator();
        menu.addItem(menuItems.复制文件地址(assets))
        menu.addItem(menuItems.复制文件链接(assets))
        menu.addItem(menuItems.复制文件缩略图地址(assets))
        menu.addItem(menuItems.上传到assets并复制链接(assets))
        menu.addSeparator();
        menu.addSeparator();
    } else {
        //否则收缩到子菜单项目
        menu.addSeparator();
        const 附件打开菜单组 = [
            menuItems.打开资源文件所在笔记(assets),
            menuItems.使用默认应用打开附件(assets),
            menuItems.在文件管理器打开附件(assets),
            menuItems.在新页签打开文件所在路径(assets),
            menu.addItem(menuItems.打开efu文件视图(assets))

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