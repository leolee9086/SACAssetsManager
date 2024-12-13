<template>
    <div class="block__icons">
        <div class="block__logo">
            <svg class="block__logoicon">
                <use xlink:href="#iconFiles"></use>
            </svg>本地磁盘
        </div>
        <span class="fn__flex-1 fn__space"></span>
        <span data-type="refresh" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="刷新" @click="refreshDisks">
            <svg>
                <use xlink:href="#iconRefresh"></use>
            </svg>
        </span>
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
                        <div class="fn__flex disk-tiny" @dblclick="() => { openFolder(disk.name + '/') }"
                            @click.stop="toggleSUbFolders(disk.name + '/')">
                            <commonIcon class="block__logoicon" icon="iconDatabase"></commonIcon>
                            <DiskItem :disk="disk" />
                        </div>
                        <FolderList 
                            :folderInfos="folderInfos"
                            :diskName="disk.name"
                            :toggleSUbFolders="toggleSUbFolders"
                            :openFolder="openFolder"
                        />
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>
<script setup>
import { ref, onMounted, reactive } from 'vue'
import DiskItem from './DiskItem.vue';
import FolderList from './FolderList.vue'
import { listLocalDisks } from '../../../data/diskInfo.js';
import { plugin } from 'runtime'
import { commonIcon } from '../common/icons.js'
const foldUp = ref(true)
const diskInfos = ref([])
const folderInfos = reactive([])
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

// 添加刷新函数
const refreshDisks = async () => {
    diskInfos.value = await listLocalDisks();
    // 清空文件夹信息
    folderInfos.length = 0;
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