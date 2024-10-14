<template>
    <div class="tagItem fn__flex"
     @click.ctrl.stop="openTagNotes" 
     @drop="handleDrop" 
     @dragover="handleDragover" 
     @dragleave="handleDragLeave"
     @click.stop="openTagAssets"     
     style="line-height: 28px;min-height: 28px;padding:0 4px;"
     >
        <div draggable="true"
        @dragstart="handleDragStart"
        
        :class="['fn__flex', 'fn__flex-1','tag-item-content', tag.removed?'ariaLabel':'',tag.removed?'tag-item-content-removed':'',tag.removed?'tag-item-content-removed':'', ]" :aria-label="tag.removed?'在笔记中无引用,可以删除':'tag需要在笔记中无引用方可删除'" :style="{ paddingLeft: (tag.depth + 1) * 16 + 'px',alignItems:'baseline',borderRadius: '15px' }">
            <svg class="b3-list-item__graphic">
                <use xlink:href="#iconTags"></use>
            </svg>
            <svg class="b3-list-item__graphic" v-if="tag.removed" @click="deleteTag">
                <use xlink:href="#iconTrashcan"></use>
            </svg>
            {{ tag.name }}
            <div class="fn__flex-1 fn__space"></div>
            <span class="counter">{{ tag.count }}</span>
            <span class="counter">{{ tag.assets?tag.assets.length:0 }}</span>
        </div>
        <template v-if="tag.children && tag.children.length">
            <TagItem v-for="subTag in tag.children" :key="subTag.label" :tag="subTag" />
        </template>
    </div>
</template>
<script setup>
import { clientApi, plugin } from '../../../asyncModules.js';
import {toRef} from 'vue'
import { 打开标签资源视图 } from '../../siyuanCommon/tabs/assetsTab.js';
const deleteTag=()=>{
    emit('delete:tag',tag.value)
}
const openTagNotes = () => {
    const keyWord = `#${tag.value.label}#`
    const tab = clientApi.openTab({
        app: plugin.app,
        title:"标签:"+tag.value.name,
        search: {
            k: keyWord
        }
    });
}
const openTagAssets=()=>{
    打开标签资源视图(tag.value.label)
}
const handleDragover=(e)=>{
    e.preventDefault();
    e.currentTarget.classList.add('dragover')
}
const handleDragLeave=(e)=>{
    e.currentTarget.classList.remove('dragover')
}
const emit=defineEmits(['update:tag','delete:tag'])
const handleDrop=(e)=>{
    tag.value.assets = tag.value.assets || []
    const files = e.dataTransfer.files;
    const uri =    e.dataTransfer.getData('text/uri-list');
    Array.from(files).forEach(file => {
        tag.value.assets.push(file.path)
        tag.value.assets=Array.from(new Set(tag.value.assets))
        emit('update:tag',tag.value)
    });
    e.currentTarget.classList.remove('dragover')
}
const props= defineProps({
    tag: {
        type: Object,
        required: true
    }
});
const handleDragStart=(e)=>{
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain',`#${tag.value.label}#`)
    e.dataTransfer.setData('text/uri-list',`#${tag.value.label}#`)
    e.dataTransfer.setData('text/html',`<span data-type="tag">${tag.value.label}</span>`)

}
const tag=toRef(props,'tag')
</script>
<style  scoped>
.dragover{
    background-color: #f0f0f0;
}
.tag-item-content:hover,.tag-item-content:hover *{
    background-color:var(--b3-theme-secondary);
    color: var(--b3-theme-primary);
}
.tag-item-content-removed{
    color: var(--b3-theme-error);
}
</style>