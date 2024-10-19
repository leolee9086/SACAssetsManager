import { plugin } from "../../pluginSymbolRegistry.js";
import { clientApi } from "../../asyncModules.js";
import { openDialog } from "./dialog/vueDialog.js";
plugin.protyleSlash = [
    {
        filter: ['file', 'everything'],
        html: '<div class="b3-list-item__first"><span class="b3-list-item__text">everything 搜索文件</span><span class="b3-list-item__meta">😊</span></div>',
        id: "sacFile",
        callback: (protyle) => {
            console.log(protyle)
            protyle.insert('<wbr>')
            const { Dialog } = clientApi
            const data = {
                    tab: {
                        data: {
                            everythingApiLocation: 'http://localhost:9999',
                            ui: {
                                size: '64'
                            }
                        }
                    }
                }
            const { app, dialog } = openDialog(
                `/plugins/${plugin.name}/source/UI/components/assetGalleryPanel.vue`,
                'everything搜索',
                {},
                '',
                data,
                'everything搜索',
                '200 px','',false)
            dialog.destroyCallback=()=>{
                if(data.selectedItems){
                    const selectedFilePath =data.selectedItems.map(
                        item=>{return item.data.path}
                    ).filter(
                        item=>{
                            return item
                        }
                    )
                    protyle.focus()
                    protyle.insert(
                        selectedFilePath.map(
                            item => `<span data-type="a" data-href="file:///${item}">${item.split('/').pop()}</span>`
                        ).join('\n')
                    )
                }
            }
        }
    }
]