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
        <div v-if="IncludeSubfolders" @wheel="horizontalScroll" class="fn__flex subFolders">
            <div class="fn__space"></div>
            <template v-for="(子文件夹信息, i) in 子文件夹数组" :key="i">
                <div 
                @click.left.stop="() => { toggleShow(子文件夹信息, i) }" 
                @click.right.stop="() => { 右键菜单(子文件夹信息, i) }"
                :class="{ 'subfolderShown': 子文件夹信息.show }"
                    style="border-radius:15px;min-width:80px;width:80px;height:80px;background-color: var(--b3-theme-background-light);">
                    <img src="/stage/icon.png">
                    <div style="font-size: small;text-align: center;">{{ 子文件夹信息.name }}</div>
                    <div style="font-size: x-small;text-align: center;">{{ 子文件夹信息.fileCount }}个文件</div>
                    <div style="font-size: x-small;text-align: center;">{{ 子文件夹信息.folderCount }}个目录</div>
                </div>
                <div class="fn__space"></div>
            </template>
        </div>
    </div>
</template>
<script setup>
import { defineProps, defineEmits, ref, onMounted, watch } from 'vue'
import breadCrumbItem from './breadCrumbItem.vue'
import { 构建搜索模式 } from '../../../../utils/globBuilder.js';
import { plugin } from 'runtime'
import { horizontalScroll } from '../../../utils/scroll.js'
import { commonIcon } from '../icons.js'
const IncludeSubfolders = ref(true)
const emit = defineEmits(['globChange'])
const 右键菜单 = (子文件夹信息, i) => {
    
}
watch(() => IncludeSubfolders.value, () => {
    fetchSUbFolders()
    if (!IncludeSubfolders.value) {
        emit('globChange', {
            cwd: localPath,
            query: {
                $and: [
                {
                    depth: { $eq: 1 },
                    },
                ]
            }

        })
    }else{
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
const fetchSUbFolders = async () => {
    if (子文件夹数组.value[0] || fetching || retry > 8) {
        return
    }
    fetching = true
    retry += 1
    try {
        子文件夹数组.value = await (await fetch(`http://localhost:${plugin.http服务端口号}/count-etries?root=${encodeURIComponent(localPath.trim())}`)).json()
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