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
import { fetchSync } from "../../../../src/toolBox/base/forNetWork/forFetch/fetchSyncTools.js";
import { 向菜单批量添加项目 } from "../../../utils/siyuanUI/menu.js";
import { checkClipboardForFilePath } from "../../../../src/toolBox/base/useBrowser/useClipBoard.js";
import { rgbaArrayToHexString } from "../../../utils/color/colorSpace.js";
import { h, f } from "../../../utils/DOM/builder.js";
import { 创建链式思源菜单 } from "../../../../src/toolBox/useAge/forSiyuan/useSiyuanMenu.js";
const { eventBus } = plugin

// 将颜色操作相关函数组合在一起
const 颜色操作 = {
  添加颜色操作菜单(menu, asset) {
    const colorUrl = thumbnail.getColor(asset.type, asset.path, false);
    try {
      const response = fetchSync(colorUrl);
      if (!response.ok) {
        console.error('获取颜色信息失败:', response.statusText);
        return;
      }
      
      const colorData = response.json();
      if (!colorData || !Array.isArray(colorData)) return;
      
      colorData.forEach(colorInfo => {
        const colorHex = rgbaArrayToHexString(colorInfo.color);
        const fragment = this.创建颜色菜单项(colorHex, colorInfo);
        menu.addItem({
          element: fragment,
          submenu: this.生成颜色子菜单(colorHex, colorInfo)
        });
      });
    } catch (error) {
      console.error('获取颜色信息失败:', error);
    }
  },

  创建颜色菜单项(colorHex, colorInfo) {
    return f(
      h('svg', {
        class: 'b3-menu__icon',
        viewBox: '0 0 24 24',
        width: '16',
        height: '16',
        fill: 'currentColor'
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
  },

  生成颜色子菜单(colorHex, colorInfo) {
    return [
      {
        label: `复制颜色代码: ${colorHex}`,
        click: () => navigator.clipboard.writeText(colorHex)
      },
      {
        label: `删除此颜色记录`,
        click: () => {
          // 调用删除颜色记录的函数
        }
      },
      {
        label: `颜色占比: ${(colorInfo.percent * 100).toFixed(2)}%`,
        disabled: true
      }
    ];
  }
};

// 菜单构建相关函数
const 菜单构建 = {
  添加附件选中信息(menu, assets) {
    menu.addItem({
      label: 计算主标签(assets, plugin.附件编辑模式),
      disabled: 'true',
      type: 'readonly'
    });
  },

  添加移动菜单(menu, assets, event, panelController) {
    menu.addSeparator();
    menu.addItem(文件移动菜单组.以file链接形式添加到最近笔记本日记(assets));
    menu.addItem(文件移动菜单组.移动到回收站(assets, panelController));
    menu.addItem(文件移动菜单组.创建文件夹并移动(assets, panelController));
    文件移动菜单组.移动到最近目录菜单组(assets, event).forEach(
      item => menu.addItem(item)
    );
  },

  添加批处理菜单组(menu, options) {
    const menuItems = [
      { action: 文件批处理菜单组.删除所有ThumbsDB, separator: true },
      { action: 文件批处理菜单组.扫描重复文件 },
      { action: 文件批处理菜单组.快速扫描重复文件 },
      { action: 文件批处理菜单组.处理重复文件 },
      { action: 文件批处理菜单组.还原重复文件 },
      { action: 文件批处理菜单组.快速还原重复文件 },
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
    向菜单批量添加项目(menu, menuItems, options);
  },

  添加只读菜单内容(menu, assets) {
    menu.addItem({
      label: `创建时间:${解析文件属性数组内部属性显示('ctimeMs', assets)}`,
      disabled: 'ture',
      type: 'readonly'
    });
  },

  添加通用菜单内容(menu, assets) {
    // 常规模式下展开所有常规菜单
    if (plugin.附件编辑模式.value === '常规') {
      this.添加展开的通用菜单(menu, assets);
    } else {
      // 否则收缩到子菜单项目
      this.添加折叠的通用菜单(menu, assets);
    }
  },

  添加展开的通用菜单(menu, assets) {
    menu.addSeparator();
    
    // 处理剪贴板路径
    this.添加剪贴板路径菜单(menu);
    
    menu.addItem(menuItems.打开资源文件所在笔记(assets));
    menu.addItem(menuItems.使用默认应用打开附件(assets));
    menu.addItem(menuItems.在文件管理器打开附件(assets));
    menu.addItem(menuItems.在新页签打开文件所在路径(assets));
    menu.addItem(menuItems.打开efu文件视图(assets));

    // 添加图片预览器菜单项
    this.添加图片预览器菜单项(menu, assets);

    menu.addSeparator();
    menu.addItem(menuItems.复制文件地址(assets));
    menu.addItem(menuItems.复制文件链接(assets));
    menu.addItem(menuItems.复制文件缩略图地址(assets));
    menu.addItem(menuItems.上传到assets并复制链接(assets));
    menu.addSeparator();
    menu.addSeparator();
  },

  添加折叠的通用菜单(menu, assets) {
    menu.addSeparator();
    
    // 打开菜单组
    const 附件打开菜单组 = [
      menuItems.打开资源文件所在笔记(assets),
      menuItems.使用默认应用打开附件(assets),
      menuItems.在文件管理器打开附件(assets),
      menuItems.在新页签打开文件所在路径(assets),
      menuItems.打开efu文件视图(assets)
    ];
    
    menu.addItem({
      label: "打开",
      submenu: 附件打开菜单组
    });
    
    menu.addSeparator();
    
    // 复制菜单组
    const 附件复制菜单组 = [
      menuItems.复制文件地址(assets),
      menuItems.复制文件链接(assets),
      menuItems.复制文件缩略图地址(assets),
      menuItems.上传到assets并复制链接(assets),
    ];
    
    menu.addItem({
      label: "复制",
      submenu: 附件复制菜单组
    });
  },

  添加剪贴板路径菜单(menu) {
    checkClipboardForFilePath().then(paths => {
      if (!paths || paths.length === 0) return;
      
      if (paths.length === 1) {
        menu.addItem({
          label: `在新页签中打开${paths[0]}`,
          click: () => 打开本地资源视图(paths[0])
        });
      } else {
        menu.addItem({
          label: `在新页签中打开剪贴板中所有路径`,
          click: () => paths.forEach(path => 打开本地资源视图(path)),
          submenu: paths.map(path => ({
            label: `打开${path}`,
            click: () => 打开本地资源视图(path)
          }))
        });
      }
    });
  },

  添加图片预览器菜单项(menu, assets) {
    if (assets.find(item => isImage(item.path))) {
      menu.addItem({
        label: "在预览器中打开",
        click: () => {
          clientApi.openTab({
            app: plugin.app,
            custom: {
              icon: "iconImage",
              title: "图片预览器",
              id: plugin.name + 'imagePreviewerTab',
              data: {
                text: '图片预览器',
                assets: assets
              }
            }
          });
        }
      });
    }
  }
};

// 主菜单函数
export const 打开附件组菜单 = (event, assets, options) => {
  const { position, panelController } = options;
  
  // 确保附件编辑模式存在
  plugin.附件编辑模式 = plugin.附件编辑模式 || {
    label: '常规',
    value: "常规"
  };
  
  const menu = new clientApi.Menu('sac-galleryitem-menu');
  const 链式菜单 = 创建链式思源菜单(menu);
  
  // 添加基本信息
  菜单构建.添加附件选中信息(menu, assets);
  
  // 添加模式切换
  链式菜单.addSeparator()
    .addItem(模式切换菜单项(event, assets, options));
  
  // 根据不同模式添加不同菜单
  const 当前模式 = plugin.附件编辑模式?.value;
  
  if (当前模式 === '批处理') {
    菜单构建.添加批处理菜单组(menu, options);
  } else if (当前模式 === '插件') {
    menu.addSeparator();
    menu.addItem(menuItems.使用TEColors插件分析图像颜色(assets));
    添加插件菜单内容(menu, assets);
  } else if (当前模式 === '移动') {
    菜单构建.添加移动菜单(menu, assets, event, panelController);
  } else if (当前模式 === '编辑') {
    添加编辑模式菜单(menu, assets);
  }
  
  // 添加通用菜单内容
  assets && assets[0] && 菜单构建.添加通用菜单内容(menu, assets);
  
  // 添加底部菜单项
  添加底部菜单项(menu, assets);
  
  // 触发事件并打开菜单
  eventBus.emit('contextmenu-galleryitem', { event, assets, menu, mode: plugin.附件编辑模式 });
  menu.open(position);
  document.addEventListener('mousedown', () => { menu.close }, { once: true });
};

// 添加编辑模式菜单
function 添加编辑模式菜单(menu, assets) {
  menu.addSeparator();
  
  // D5A文件相关菜单
  if (assets.find(item => item.path.endsWith('.d5a'))) {
    menu.addItem(元数据编辑菜单组.d5a内置缩略图(assets));
    menu.addItem(元数据编辑菜单组.d5a内置缩略图单次确认(assets));
  }
  
  // 图片相关菜单
  if (assets.find(item => item && isImage(item.path))) {
    menu.addItem(元数据编辑菜单组.打开图片编辑器对话框(assets));
    menu.addItem(元数据编辑菜单组.打开简版图片编辑器(assets));
  }
  
  // 通用编辑菜单
  menu.addItem(元数据编辑菜单组.重新计算文件颜色(assets));
  menu.addItem(元数据编辑菜单组.编辑附件标签组(assets));
  menu.addSeparator();
  
  // 单个文件特有菜单
  if (assets.length === 1) {
    menu.addItem(元数据编辑菜单组.上传缩略图(assets));
    menu.addItem(元数据编辑菜单组.从剪贴板上传缩略图(assets));
  }
  
  // 压缩菜单
  menu.addSeparator();
  添加压缩菜单(menu, assets);
  
  // 颜色操作菜单
  if (assets.length === 1) {
    颜色操作.添加颜色操作菜单(menu, assets[0]);
  }
}

// 添加压缩菜单
function 添加压缩菜单(menu, assets) {
  const 格式列表 = ['png', 'jpg', 'webp'];
  
  格式列表.forEach(格式 => {
    let 菜单项 = 文件内容编辑菜单组.压缩图片菜单项(assets, 80, 9, 格式);
    菜单项.submenu = 文件内容编辑菜单组.压缩菜单组(assets, 格式);
    menu.addItem(菜单项);
  });
}

// 添加底部菜单项
function 添加底部菜单项(menu, assets) {
  menu.addSeparator();
  menu.addItem(menuItems.清理缓存并硬刷新());
  menu.addItem({
    'label': plugin.启用AI翻译 ? plugin.翻译`停用AI翻译` : plugin.翻译`启用AI翻译(实验性)`,
    click: () => {
      plugin.启用AI翻译 = !plugin.启用AI翻译;
    }
  });

  menu.addSeparator();
  assets && assets[0] && 菜单构建.添加只读菜单内容(menu, assets);
}

// 导出函数
plugin.打开附件组菜单 = 打开附件组菜单;