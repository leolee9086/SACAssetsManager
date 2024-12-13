<template>
    <div class="block__icons">
        <div class="block__logo">
            <svg class="block__logoicon">
                <use xlink:href="#iconFiles"></use>
            </svg>本地磁盘
        </div>
        <span class="fn__flex-1 fn__space"></span>
        <span data-type="focus" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="定位打开的文档 "><svg>
                <use xlink:href="#iconFocus"></use>
            </svg></span>
        <span class="fn__space"></span>
        <span data-type="collapse" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="折叠 Ctrl+↑">
            <svg>
                <use xlink:href="#iconContract"></use>
            </svg>
        </span>
        <div class="fn__space"></div>
        <div data-type="more" class="b3-tooltips b3-tooltips__sw block__icon" aria-label="更多">
            <svg>
                <use xlink:href="#iconMore"></use>
            </svg>
        </div>
        <span class="fn__space"></span>
        <span data-type="layout" class="block__icon b3-tooltips b3-tooltips__nw" aria-label="上"
            @click="foldUp = !foldUp">
            <svg>
                <use :xlink:href="foldUp ? '#iconUp' : '#iconRight'"></use>
            </svg>
        </span>
    </div>
    <div class="fn__flex fn__flex-1" v-if="foldUp">
        <div class="fn__flex-column fn__flex-1 file_tree_container">
            <template v-for="disk in diskInfos">
                <div class="fn__flex">
                    <div class="fn__flex-column fn__flex-1">
                        <div class="fn__flex  disk-tiny" @dblclick="() => { openFolder(disk.name + '/') }"
                            @click.stop="toggleSUbFolders(disk.name + '/')">
                            <commonIcon class="block__logoicon" icon="iconDatabase"></commonIcon>
                            <div :key="disk.name" class=" fn__flex fn__flex-1">
                                <div class="disk-body-tiny fn__flex-1">
                                    <div class="disk-progress">
                                        <div class="disk-header ">
                                            <span>{{ `${disk.volumeName}(${disk.name})` }}</span>
                                            <span>{{ (disk.total / 1024).toFixed(2) }} GB</span>
                                            <span>{{ (disk.free / 1024).toFixed(2) }} GB 可用</span>
                                        </div>
                                        <div class="disk-progress-bar"
                                            :style="{ width: Math.floor(disk.usedPercentage) + '%' }">
                                            {{ Math.floor(disk.usedPercentage) + '%' }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="fn__flex fn__flex-1" v-if="folderInfos.length > 0">
                            <div class="fn__flex-column fn__flex-1" style="margin-left: 15px;" @scroll="handleScroll">
                                <template v-for="(folder, i) in folderInfos">
                                    <div class="fn__flex  disk-tiny-item"
                                        v-if="folder && folder.parentPath.startsWith(disk.name + '/')"
                                        :class="{ 'stripe': i % 2 === 0, 'disk-tiny-item-selected': folder.selected }"
                                        @click="(e) => callbacks(folder)(e)">
                                        <span :style="{
                                            marginLeft: (folder.depth - 1) * 14 + 'px',
                                            marginTop: 0 - calcMargin(folder) - 7 + 'px',
                                            marginBottom: 7 + 'px',
                                            width: (folder.depth - 1) * 14 + 'px',
                                            borderLeft: genVisible(folder) ? '1px solid var(--b3-theme-secondary)' : '1px solid var(--b3-theme-primary)',
                                            borderBottom: genVisible(folder) ? '1px solid var(--b3-theme-secondary)' : '1px solid var(--b3-theme-primary)',
                                            zIndex: genVisible(folder) ? 1 : ''
                                        }"></span>
                                        <span :style="{
                                            marginBottom: 7 + 'px',
                                            width: 14 + 'px',
                                            borderBottom: genVisible(folder) ? '1px solid var(--b3-theme-secondary)' : '1px solid var(--b3-theme-primary)',
                                            zIndex: genVisible(folder) ? 1 : ''
                                        }"></span>
                                        <span :style="{
                                            marginBottom: 7 + 'px',
                                            width: 14 + 'px',
                                            borderBottom: genVisible(folder) ? '1px solid var(--b3-theme-secondary)' : '1px solid var(--b3-theme-primary)',
                                            zIndex: genVisible(folder) ? 1 : ''
                                        }"></span>
                                        <div 
                                        @click.right="(event)=>{
                                            打开文件夹图标菜单(event,folderInfos[i].path,{
                                                position:{
                                                    x:event.x,
                                                    y:event.y
                                                }
                                            })
                                        }"
                                        class="disk-tiny-item-text fn__flex fn__flex-1">{{ folderInfos[i].name }}
                                            <div class="fn__space fn__flex-1" style="">
                                            </div>
                                            <span>{{ folder.fileCount }}</span>
                                            <span class="fn__space"></span>
                                            <span>{{ folder.folderCount }}</span>
                                        </div>
                                    </div>
                                </template>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>
<script setup>
import { ref, onMounted, reactive, nextTick } from 'vue'
import { listLocalDisks } from '../../../data/diskInfo.js';
import { plugin } from 'runtime'
import { commonIcon } from '../common/icons.js'
import { buildMultiClickListener } from '../../../utils/DOM/continuousEvent.js';
import { 打开文件夹图标菜单 } from '../../siyuanCommon/menus/folderItem.js';
const callbacks = (folder) =>{ 
    folder.callbacks =folder.callbacks ||    buildMultiClickListener(300, [
    (event) => {
        toggleSUbFolders(folder.path)
    },
    (event) => {
        openFolder(folder.path)
        }
    ])
    return folder.callbacks
}
const foldUp = ref(true)
const diskInfos = ref([])
const folderInfos = reactive([])
const genVisible = (folder, disk) => {
    let flag
    if (!folder) { return false }
    folder.selected && (flag = true)
    //  !folderInfos.find(item=>item.path===folder.parentPath)&&(flag=true)
    folderInfos.find(item => item.selected && item.path.indexOf(folder.path) === 0) && (flag = true)
    folderInfos.find(item => item.selected && folder.path.indexOf(item.path) === 0) && !folderInfos.find(item => item.selected && item.parentPath === folder.parentPath) && (flag = true)
    !folderInfos.find(item => item.selected) && (flag = true)
    folder.visible = flag
    return flag
}
const calcMargin = (folder) => {
    const index = folderInfos.findIndex(item => { return item.path === folder.path })
    let parentIndex = folderInfos.findIndex(item => { return item.parentPath === folder.parentPath })
    return (index - parentIndex) * 19

}
function sortDocuments(a, b) {
    // 将路径按斜杠分割成数组
    const partsA = a.path.split(/\//).filter(Boolean); // 使用正则表达式分割路径并去除空字符串
    const partsB = b.path.split(/\//).filter(Boolean);
    // 比较路径的每个部分，直到找到不同的部分
    for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
        if (partsA[i].toLowerCase() < partsB[i].toLowerCase()) return -1;
        if (partsA[i].toLowerCase() > partsB[i].toLowerCase()) return 1;
    }
    // 如果路径前缀相同，则比较路径的深度
    if (partsA.length < partsB.length) return -1;
    if (partsA.length > partsB.length) return 1;
}

// 调用函数
const openFolder = (folder) => {
    plugin.eventBus.emit(
        'click-galleryLocalFIleicon',
        folder,
    )
}

const toggleSUbFolders = async (root) => {
    if (folderInfos.find(item => item.parentPath === root) || folderInfos.find(item => item.path === root && item.selected)?.folderCount === 0) {
        let rootItem = folderInfos.find(item => item.path === root)
        rootItem && (rootItem.selected = false)
        let subItems = folderInfos.filter(item => item.parentPath.indexOf(root) === 0 && item.path !== root)
        subItems.forEach(_item => {
            folderInfos.splice(folderInfos.findIndex(item => item.path === _item.path), 1)
        })
    } else {
        let res = await fetch(`http://localhost:${plugin.http服务端口号}/count-etries?root=${encodeURIComponent(root)}&&maxCount=100`)
        let 子文件夹数组 = await res.json()
        子文件夹数组.filter(item => {
            return !JSON.parse(JSON.stringify(folderInfos)).find(_item => { return _item.path === root + item.name + '/' })
        }).forEach(
            item => {
                folderInfos.push({
                    ...item,
                    name: item.name,
                    parentPath: root,
                    path: root + item.name + '/',
                    depth: root.split('/').length - 1
                })
            }
        )
        folderInfos.forEach(item => {
            item.selected = false
        })
        folderInfos.filter(_item => root.startsWith(_item.path)).forEach(
            ancestor => {
                ancestor.selected = true
            }
        )

        let rootItem = folderInfos.find(item => item.path === root)
        子文件夹数组[0] && rootItem && (rootItem.selected = true)
    }
    folderInfos.sort(sortDocuments)
}

onMounted(async () => {
    diskInfos.value = await listLocalDisks();
})
</script>
<style scoped>
.disk-tiny {
    width: 100%;
    padding-bottom: 4px;
    margin-bottom: 4px;
    border-bottom: 1px solid var(--b3-theme-on-background);
    color: var(--b3-theme-primary);
}

.file_tree_container {
    padding-left: 5px;
    padding-right: 5px;
}

.disk-tiny-item-selected .disk-tiny-item-text {
    background-color: var(--b3-theme-primary);
    color: var(--b3-theme-on-primary);
}


.stripe {
    background-color: var(--b3-theme-background-light);
}
</style>