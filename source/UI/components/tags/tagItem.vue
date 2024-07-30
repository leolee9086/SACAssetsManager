<template>
    <div class="tagItem"
     @click.ctrl.stop="openTagNotes" 
     @drop="handleDrop" 
     @dragover="handleDragover" 
     @dragleave="handleDragLeave"
     @click.stop="openTagAssets"     
     >
        <div  class="fn__flex fn__flex-1 tag-item-content" :style="{ paddingLeft: (tag.depth + 1) * 16 + 'px' }">
            <svg class="b3-list-item__graphic">
                <use xlink:href="#iconTags"></use>
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
    plugin.eventBus.emit('click-tag-item',tag.value.label)
}
const handleDragover=(e)=>{
    e.preventDefault();
    e.currentTarget.classList.add('dragover')
}
const handleDragLeave=(e)=>{
    e.currentTarget.classList.remove('dragover')
}
const emit=defineEmits(['update:tag'])
const handleDrop=(e)=>{
    tag.value.assets = tag.value.assets || []
    const files = e.dataTransfer.files;
    const uri =    e.dataTransfer.getData('text/uri-list');
    console.log(uri)
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
const tag=toRef(props.tag)
</script>
<style  scoped>
.dragover{
    background-color: #f0f0f0;
}
.tag-item-content:hover{
    background-color:var(--b3-theme-secondary);
    color: var(--b3-theme-on-secondary);
}
</style>