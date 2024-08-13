<template>
    <div class="block__icons">
        <div class="block__logo">
            <svg class="block__logoicon">
                <use xlink:href="#iconTags"></use>
            </svg>标签
        </div>
        <span class="fn__flex-1"></span>
        <span class="fn__space"></span>
        <span data-type="refresh" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="刷新"><svg class="">
                <use xlink:href="#iconRefresh"></use>
            </svg></span>
        <span class="fn__space"></span>
        <span data-type="sort" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="排序">
            <svg>
                <use xlink:href="#iconSort"></use>
            </svg>
        </span>
        <span class="fn__space"></span>
        <span data-type="expand" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="展开 Ctrl+↓">
            <svg>
                <use xlink:href="#iconExpand"></use>
            </svg>
        </span>
        <span class="fn__space"></span>
        <span data-type="collapse" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="折叠 Ctrl+↑">
            <svg>
                <use xlink:href="#iconContract"></use>
            </svg>
        </span>
        <span class="fn__space"></span>
        <span data-type="min" class="block__icon b3-tooltips b3-tooltips__sw" aria-label="最小化 Ctrl+W"><svg>
                <use xlink:href="#iconMin"></use>
            </svg></span>
    </div>
    <div class="fn__flex-1" style="margin-bottom: 8px;max-height: 30vh;">
        <div class="fn__flex-column fn__flex-1 file_tree_container" >
            <TagItem  v-for="tag in tags" @delete:tag="deleteTag" :key="tag.label" :tag="tag" @update:tag="updateTag" />
        </div>
    </div>
</template>
<script setup>
import { onMounted, ref,onUnmounted } from 'vue';
import { kernelApi, plugin,clientApi } from '../../../asyncModules.js';
import TagItem from './tagItem.vue'
import {getTagAssets,saveTags} from '../../../data/tags.js'
const tags = ref([])
const updateTag=(tag)=>{
    tags.value.find(item=>item.label===tag.label).assets=tag.assets
    saveTags(tags.value)
    plugin.eventBus.emit('update-tag',tag)

}
const deleteTag=(tag)=>{
    if(tag.assets.length){
        clientApi.confirm('确认删除标签',`标签下仍有${tag.assets.length}个资源，确认删除吗？`,()=>{
            tags.value=tags.value.filter(item=>item.label!==tag.label)
            saveTags(tags.value)
        })
    }else{
        tags.value=tags.value.filter(item=>item.label!==tag.label)
        saveTags(tags.value)
    }
}
let autoRefreshFlag=false
let intervalId
onUnmounted(
    ()=>{
        clearInterval(intervalId)
    }
)
onMounted(async () => {
    tags.value = await getTagAssets(await kernelApi.getTag({ sort: 0 }))
    plugin.eventBus.on('ws-main', async (e) => {
        if (e.detail.cmd === 'transactions') {
            const data = e.detail.data
            const { doOperations, undoOperations } = data[0];
            (doOperations || []).concat(undoOperations || []).forEach(async (operation) => {
                if (operation.data && operation.data.indexOf('<span data-type="tag">') > -1) {
                    autoRefreshFlag = true
                }
            });
        }
    })
    intervalId = setInterval(async()=>{
        if(autoRefreshFlag){
            tags.value = await getTagAssets(await kernelApi.getTag({ sort: 0 }))
            autoRefreshFlag = false
        }
    },1000)
})
</script>