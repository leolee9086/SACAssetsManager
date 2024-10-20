import { getStatu, 状态注册表 } from "../../globalStatus/index.js";
import { plugin } from "../../pluginSymbolRegistry.js";
import { openDialog } from "./dialog/vueDialog.js";
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

function openEverythingDialog(protyle) {
    console.log(getStatu(状态注册表.本地文件搜索接口).find(item => item.type === 'everything').port)
    const data = {

        everythingApiLocation:'http://localhost:'+ getStatu(状态注册表.本地文件搜索接口).find(item => item.type === 'everything').port,
        ui: {
            size: '64'
        }

    };
    const { app, dialog } = openDialog(
        `/plugins/${plugin.name}/source/UI/components/assetGalleryPanel.vue`,
        'everything搜索',
        {},
        '',
        data,
        'everything搜索',
        '200 px', '', false
    );
    dialog.destroyCallback = () => handleDialogDestroy(data, protyle);
}
function openAnytxtDialog(protyle) {
    const data = {

        anytxtApiLocation: 'http://localhost:'+getStatu(状态注册表.本地文件搜索接口).find(item => item.type === 'anytxt').port,
        ui: {
            size: '64'
        }

    };
    const { app, dialog } = openDialog(
        `/plugins/${plugin.name}/source/UI/components/assetGalleryPanel.vue`,
        'everything搜索',
        {},
        '',
        data,
        'everything搜索',
        '200 px', '', false
    );
    dialog.destroyCallback = () => handleDialogDestroy(data, protyle);
}
plugin.protyleSlash = [
    {
        filter: ['file', 'everything'],
        html: '<div class="b3-list-item__first"><span class="b3-list-item__text">everything 搜索文件</span><span class="b3-list-item__meta">😊</span></div>',
        id: "sacFile",
        callback: openEverythingDialog
    }, {
        filter: ['file', 'anytxt'],
        html: '<div class="b3-list-item__first"><span class="b3-list-item__text">anytxt 搜索文件</span><span class="b3-list-item__meta">😊</span></div>',
        id: "sacFile",
        callback: openAnytxtDialog
    }
];