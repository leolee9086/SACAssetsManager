import { getStatu, 状态注册表 } from "../../globalStatus/index.js";
import { plugin } from "../../pluginSymbolRegistry.js";
import { openDialog } from "./dialog/vueDialog.js";
import { listLocalDisks } from "../../data/diskInfo.js";
import { clientApi } from "../../asyncModules.js";
function handleDialogDestroy(data, protyle) {
    if (data.selectedItems) {
        const selectedFilePath = data.selectedItems.map(
            item => item.data.path
        ).filter(item => item);

        protyle.focus();
        protyle.insert(
            selectedFilePath.map(
                item => `<span data-type="a" data-href="file:///${item}">${item.split('/').pop()}</span>`
            ).join('\n')
        );
    }
}

function openDialogWithApiConfig(protyle, type, title) {
    const port = getStatu(状态注册表.本地文件搜索接口).find(item => item.type === type).port;
    const data = {
        [`${type}ApiLocation`]: `http://localhost:${port}`,
        ui: {
            size: '64'
        }
    };
    const { app, dialog } = openDialog(
        `/plugins/${plugin.name}/source/UI/components/assetGalleryPanel.vue`,
        title,
        {},
        '',
        data,
        title,
        '200 px', '', false
    );
    dialog.destroyCallback = () => handleDialogDestroy(data, protyle);
}

function openDialogWithLocalPath(protyle, path) {
    if (path === "选择磁盘") {
        // 调用一个新的函数来处理磁盘选择对话框
        openDiskSelectionDialog(protyle);
        return;
    }

    const data = {
        localPath: path,
        ui: {
            size: '64'
        }
    };
    const { app, dialog } = openDialog(
        `/plugins/${plugin.name}/source/UI/components/assetGalleryPanel.vue`,
        `sacFile`,
        {},
        '',
        data,
        `搜索文件夹:${path}`,
        '200 px', '', false
    );
    dialog.destroyCallback = () => handleDialogDestroy(data, protyle);
}

function openDiskSelectionDialog(protyle) {
    const diskSelectionContent = `
        <div id="diskSelectionPanel" class='fn__flex-column' style="pointer-events:auto;z-index:5;max-height:80vh; background-color: #f9f9f9; border-radius: 8px; padding: 16px;">
            <h3 style="margin-bottom: 16px;">选择磁盘</h3>
            <ul id="diskList" style="list-style-type: none; padding: 0;">
                <!-- 动态插入磁盘列表项 -->
            </ul>
        </div>
    `;

    const dialog = new clientApi.Dialog({
        title: "选择磁盘",
        content: diskSelectionContent,
        width: '320px',
        height: 'auto',
        transparent: false,
        disableClose: false,
        disableAnimation: false,
    });

    // 获取磁盘列表并插入到对话框中
    listLocalDisks().then(data => {
        const diskList = dialog.element.querySelector("#diskList");
        data.forEach(disk => {
            const listItem = document.createElement('li');
            listItem.style.cursor = 'pointer';
            listItem.style.padding = '8px';
            listItem.style.borderBottom = '1px solid #ddd';
            listItem.style.transition = 'background-color 0.3s';
            listItem.title = `点击选择 ${disk.name}`;

            // 显示磁盘名和占用信息
            listItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${disk.volumeName} (${disk.name})</span>
                    <span>${(disk.total / 1024).toFixed(2)} GB 总计</span>
                    <span>${(disk.free / 1024).toFixed(2)} GB 可用</span>
                    <div style="width: 100px; height: 10px; background-color: #e0e0e0; border-radius: 5px; overflow: hidden; margin-left: 10px;">
                        <div style="width: ${Math.floor(disk.usedPercentage)}%; height: 100%; background-color: #76c7c0;"></div>
                    </div>
                </div>
            `;

            listItem.addEventListener('mouseover', () => {
                listItem.style.backgroundColor = '#e0e0e0';
            });
            listItem.addEventListener('mouseout', () => {
                listItem.style.backgroundColor = '';
            });
            listItem.addEventListener('click', () => {
                // 选择磁盘后的操作
                openDialogWithLocalPath(protyle, disk.name + '/');
                dialog.destroy();
            });
            diskList.appendChild(listItem);
        });
    });

    dialog.element.querySelector(".b3-dialog__close").style.display = 'none';
    dialog.element.querySelector(".b3-dialog__header").style.padding = '0px 24px';
    dialog.element.querySelector(".b3-dialog__header").insertAdjacentHTML('afterBegin', `<svg class="cc-dialog__close" style="position:absolute;top:2px;left:2px"><use xlink:href="#iconCloseRound"></use></svg>`);
    dialog.element.querySelector(".cc-dialog__close").addEventListener('click', () => { dialog.destroy(); });
}function openEverythingDialog(protyle) {
    openDialogWithApiConfig(protyle, 'everything', 'everything搜索');
}

function openAnytxtDialog(protyle) {
    openDialogWithApiConfig(protyle, 'anytxt', 'anytxt搜索');
}

let slashItems = [
    {
        filter: ['file', 'everything'],
        html: '<div class="b3-list-item__first"><span class="b3-list-item__text">everything 搜索文件</span><span class="b3-list-item__meta">😊</span></div>',
        id: `sacFile-everything`,
        callback: openEverythingDialog
    },
    {
        filter: ['file', 'anytxt'],
        html: '<div class="b3-list-item__first"><span class="b3-list-item__text">anytxt 搜索文件</span><span class="b3-list-item__meta">😊</span></div>',
        id: "sacFile-anytxt",
        callback: openAnytxtDialog
    }
];

Object.defineProperty(plugin, 'protyleSlash', {
    get: function() {
    
        listLocalDisks().then(data => {
            // 清理旧的磁盘搜索相关菜单项
            slashItems = slashItems.filter(item => !item.id.startsWith("sacFile-localPath"));

            if (data.length > 3) {
                // 如果磁盘超过三个，添加一个选择磁盘的菜单项
                slashItems.push({
                    filter: ['file', '选择磁盘'],
                    html: `<div class="b3-list-item__first"><span class="b3-list-item__text">选择磁盘</span><span class="b3-list-item__meta">😊</span></div>`,
                    id: "sacFile-localPath",
                    callback: (protyle) => {
                        // 弹窗选择磁盘
                        openDialogWithLocalPath(protyle, '选择磁盘');
                    }
                });
            } else {
                // 否则，添加每个磁盘的搜索菜单项
                data.forEach(disk => {
                    slashItems.push({
                        filter: ['file', '文件夹', 'folder', 'disk', `磁盘:${disk.name}`],
                        html: `<div class="b3-list-item__first"><span class="b3-list-item__text">搜索磁盘:${disk.name}</span><span class="b3-list-item__meta">😊</span></div>`,
                        id: "sacFile-localPath" + disk.name,
                        callback: (protyle) => {
                            openDialogWithLocalPath(protyle, disk.name + '/');
                        }
                    });
                });
            }
        });
        return slashItems;
    }
});
