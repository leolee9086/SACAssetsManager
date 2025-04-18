<template>
    <div>
        <div class="protyle-breadcrumb">
            <div class="protyle-breadcrumb__bar protyle-breadcrumb__bar--nowrap">
                <breadCrumbItem icon="iconFolder" label="本地文件夹"></breadCrumbItem>
                <span class="fn__space"></span>
                <template v-for="(pathPttern, i) in localPathArray">
                    <breadCrumbItem :icon="i === 0 ? '#iconDatabase' : '#iconFolder'" :label="pathPttern"
                        @click="() => { 打开本地资源视图(i) }"></breadCrumbItem>
                </template>
                <commonIcon class="protyle-breadcrumb__arrow" icon="iconRight"></commonIcon>
            </div>
            <span class="fn__space fn__flex-1 protyle-breadcrumb__space">
            </span>
            <input class="b3-switch fn__flex-center ariaLabel" aria-label="显示子路径" v-model="IncludeSubfolders"
                type="checkbox">
            <button class="b3-tooltips b3-tooltips__w block__icon fn__flex-center" style="opacity: 1;" data-menu="true"
                aria-label="更多">
                <svg>
                    <use xlink:href="#iconMore"></use>
                </svg>
            </button>
        </div>
        <thumbnailGallery
            v-if="IncludeSubfolders"
            :items="子文件夹数组"
            :showBorder="true"
            @itemClick="(item) => toggleShow(item)"
            @itemContextMenu="(item, event) => 右键菜单(item, event)"
            @imageError="使用默认图标">
            <template #extra-info="{ item }">
                <div style="font-size: x-small;">{{ item.fileCount }}个文件</div>
                <div style="font-size: x-small;">{{ item.folderCount }}个目录</div>
            </template>
        </thumbnailGallery>
    </div>
</template>
<script setup>
import { defineProps, defineEmits, ref, onMounted, watch } from 'vue'
import breadCrumbItem from './breadCrumbItem.vue'
import { 构建搜索模式 } from '../../../../../src/toolBox/base/useEcma/forFile/globTools.js';
import { plugin } from 'runtime'
import { commonIcon } from '../icons.js'
import { 打开文件夹图标菜单 } from '../../../siyuanCommon/menus/folderItem.js';
import { fs } from '../../../../server/endPoints.js';
import thumbnailGallery from '../thumbnailGalleryHori.vue'
const IncludeSubfolders = ref(true)
const emit = defineEmits(['globChange'])
const 右键菜单 = (子文件夹信息, event) => {
    const 子文件夹路径 = window.require('path').join(localPath, 子文件夹信息.name).replace(/\\/g, '/')
    const position = { y: event.y, x: event.x }
    const options = {
        position
    }
    打开文件夹图标菜单(event, 子文件夹路径, options)
}
watch(() => IncludeSubfolders.value, () => {
    fetchSUbFolders()
    if (!IncludeSubfolders.value) {
        emit('globChange', {
            cwd: localPath,
            /***
             * 内置属性
             */
            depth: 1,
        })
    } else {
        emit('globChange', 构建搜索模式(子文件夹数组.value, localPath.replace(/\\/g, '/')))
    }
})
function toggleShow(子文件夹信息, i) {
    子文件夹信息.show = !子文件夹信息.show
    let scheme = 构建搜索模式(子文件夹数组.value, localPath.replace(/\\/g, '/'))
    emit('globChange', scheme)
}
const 子文件夹数组 = ref([])
const 打开本地资源视图 = (i) => {
    const localPath = localPathArray.value.slice(0, i + 1)
    plugin.eventBus.emit(
        'click-galleryLocalFIleicon',
        localPath.join('/'),
    )
}
const localPathArray = ref([])
const { localPath } = defineProps(
    [
        'localPath',
    ]
)
let fetching = false
let retry = 0
const 使用默认图标 = (event) => {
    event.target.src = '/stage/icon.png'  // 设置默认图标路径
}

const fetchSUbFolders = async () => {
    if (子文件夹数组.value[0] || fetching || retry > 8) {
        return
    }
    fetching = true
    retry += 1
    try {
        const response = await fetch(`http://localhost:${plugin.http服务端口号}/count-etries?root=${encodeURIComponent(localPath.trim())}`)
        const data = await response.json()
        子文件夹数组.value = data.map(folder => ({
            ...folder,
            thumbnailUrl: fs.path.getFolderThumbnail(window.require('path').join(localPath, folder.name).replace(/\\/g, '/'))
        }))
    } catch (e) {
        console.warn(e)
        子文件夹数组.value = []
    }
    fetching = false
}
onMounted(async () => {
    if (localPath) {
        localPath.replace(/\\/g, '/').split('/').forEach(
            item => {
                item && localPathArray.value.push(item)
            }
        )
        setInterval(fetchSUbFolders, 100)
        emit('globChange',
            {
                cwd: localPath,
                query: {

                }
            }
        )
    }
})
</script>
<style>
.subfolderShown {
    color: aqua;
    border-color: aqua;
    border-width: 1px;
    border-style: ridge
}

.subFolders {
    overflow-x: scroll;
    overflow-y: hidden;
    height: 140px;
    min-height: 140px;
    display: flex;
    border-bottom: 1px dashed var(--b3-theme-on-background);
    padding-bottom: 8px;
    margin-bottom: 8px;
}
</style>