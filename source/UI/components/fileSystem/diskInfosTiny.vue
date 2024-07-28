<template>
    <div class="fn__flex fn__flex-1">
        <div class="fn__flex-column fn__flex-1 file_tree_container">
            <template v-for="disk in diskInfos">
                <div class="fn__flex">
                    <div class="fn__flex-column fn__flex-1">
                        <div class="fn__flex  disk-tiny" @dblclick="() => { openFolder(disk.name + '/') }"
                            @click.stop="fetchSUbFolders(disk.name + '/')">
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
                            <div class="fn__flex-column fn__flex-1"
                                style="margin-left: 15px;">
                                <template v-for="(folder, i) in folderInfos">
                                    <div class="fn__flex" v-if="folder.parentPath.startsWith(disk.name + '/')"
                                        @click="() => fetchSUbFolders(folder.path)"
                                        @dblclick="() => { openFolder(folder.path) }">
                                        
                                        <span :style="{
                                            marginLeft:(folder.depth-1)*14+'px',
                                            marginTop:0-calcMargin(folder)-7+'px',
                                            marginBottom: 7 + 'px',
                                            width: (folder.depth-1)*14 + 'px',
                                            borderLeft: '1px solid var(--b3-theme-primary)',
                                            borderBottom: '1px solid var(--b3-theme-primary)'
                                        }"></span>
                                        <span :style="{
                                            marginBottom: 7 + 'px',
                                            width: 14 +'px',
                                            borderBottom: '1px solid var(--b3-theme-primary)'
                                        }"></span>
                                        <span :style="{
                                            marginBottom: 7 + 'px',
                                            width: 14+'px',
                                            borderBottom: '1px solid var(--b3-theme-primary)'
                                        }"></span>
                                        <div class="disk-tiny-item">{{ folderInfos[i].name }}</div>
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
const diskInfos = ref([])
const folderInfos = reactive([])
const openFolder = (folder) => {
    plugin.eventBus.emit(
        'click-galleryLocalFIleicon',
        folder,
    )
}
const calcMargin=(folder)=>{
    const index=folderInfos.findIndex(item=>{return item.path===folder.path})
    console.log(folder)
    let parentIndex = folderInfos.findIndex(item=>{return item.parentPath===folder.parentPath})
    console.log(index,parentIndex)
    return (index-parentIndex)*19

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
const fetchSUbFolders = async (root) => {
    let res = await fetch(`http://localhost:${plugin.http服务端口号}/count-etries?root=${encodeURIComponent(root)}`)
    let 子文件夹数组 = await res.json()
    子文件夹数组.filter(item => {
        console.log(item)
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

.disk-tiny-item::before {
    content: ' ';
    display: inline;
    width: 14px;
    height: 14px;
    background-color: var(--b3-theme-primary);
}
</style>