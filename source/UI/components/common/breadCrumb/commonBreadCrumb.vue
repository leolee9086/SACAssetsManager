<template>
    <component
    :is="breadCrumbType" :block_id="block_id" :box="box" :localPath="localPath" :tagLabel="tagLabel"></component>
</template>
<script setup>
import { toRef, computed,inject } from 'vue'
const appData = toRef(inject('appData'))
import DocBreadCrumb from './docbreadCrumb.vue'
import LocalBreadCrumb from './localBreadCrumb.vue'
import TagCrumb from './tagCrumb.vue'
const { block_id, box, localPath,tagLabel } = appData.value.tab.data
const breadCrumbType = computed(()=>{
    if(block_id){
        return DocBreadCrumb
    }
    if(box){
        return DocBreadCrumb
    }
    if(localPath){
        return LocalBreadCrumb
    }
    if(tagLabel){
        return TagCrumb
    }
})
</script>
