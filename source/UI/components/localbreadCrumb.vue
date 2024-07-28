<template>
    <div @mouseover="showSubfolder = true" @mouseleave="showSubfolder = false">
        <div class="protyle-breadcrumb">
            <div class="protyle-breadcrumb__bar protyle-breadcrumb__bar--nowrap">
                <span class="protyle-breadcrumb__item protyle-breadcrumb__item--active" data-node-path="">
                    <svg class="popover__block" data-id="">
                        <use :xlink:href="'#iconFolder'"></use>
                    </svg>
                    本地文件夹
                </span>
                <span class="fn__space"></span>
                <template v-for="(pathPttern, i) in localPathArray">
                    <span class="protyle-breadcrumb__item protyle-breadcrumb__item--active" @click="() => 打开本地资源视图(i)">
                        <svg class="popover__block" data-id="">
                            <use :xlink:href="i === 0 ? '#iconDatabase' : '#iconFolder'"></use>
                        </svg>
                        {{ pathPttern }}
                    </span>
                    <span class="fn__space"></span>
                </template>
                <commonIcon class="protyle-breadcrumb__arrow" icon="iconRight"></commonIcon>
            </div>
            <span class="fn__space fn__flex-1 protyle-breadcrumb__space">
            </span>
            <input class="b3-switch fn__flex-center ariaLabel" aria-label="显示子路径" v-model="IncludeSubfolders" type="checkbox">
            <button class="b3-tooltips b3-tooltips__w block__icon fn__flex-center" style="opacity: 1;" data-menu="true"
                aria-label="更多">
                <svg>
                    <use xlink:href="#iconMore"></use>
                </svg>
            </button>
        </div>
        <div v-if="showSubfolder&&IncludeSubfolders" @wheel="horizontalScroll" class="fn__flex subFolders">
            <div class="fn__space"></div>
            <template v-for="(子文件夹信息, i) in 子文件夹数组" :key="i">
                <div @click.stop="() => { toggleShow(子文件夹信息, i) }" :class="{ 'subfolderShown': 子文件夹信息.show }"
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
import { defineProps, defineEmits, ref, onMounted, reactive } from 'vue'
import { getFilePatternsWithExtensions } from '../../utils/globBuilder.js';
import {  plugin } from 'runtime'
import {horizontalScroll} from '../utils/scroll.js'
import {commonIcon} from './common/icons.js'
const IncludeSubfolders = ref(true)
const emit = defineEmits(['globChange'])
function toggleShow(子文件夹信息, i) {
    子文件夹信息.show = !子文件夹信息.show
    let scheme = getFilePatternsWithExtensions(子文件夹数组.value, localPath.replace(/\\/g, '/') + '/')
    emit('globChange', scheme)
}
const 子文件夹数组 = ref([])
const showSubfolder = ref(false)
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
let fetching=false
let retry=0
const fetchSUbFolders = async () => {
    if(子文件夹数组.value[0]||fetching||retry>8){
        return
    }
    fetching=true
    retry+=1
    try {
        子文件夹数组.value = await (await fetch(`http://localhost:${plugin.http服务端口号}/count-etries?root=${encodeURIComponent(localPath)}`)).json()
    } catch (e) {
        子文件夹数组.value = []
    }
    fetching=false
}
onMounted(async () => {
    if (localPath) {
        localPath.replace(/\\/g, '/').split('/').forEach(
            item => {
                localPathArray.value.push(item)
            }
        )
        setInterval(fetchSUbFolders,100)
        emit('globChange',
            {
                pattern: localPath.replace(/\\/g, '/') + '/**',
                options: {
                    // 其他glob选项...
                    nodir: true, // 排除目录，只匹配文件
                    dot: true, // 包括以点(.)开头的文件和目录
                    // ... 其他选项
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