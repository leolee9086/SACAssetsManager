<template>
    <component
    :is="breadCrumbType" :block_id="block_id" :box="box" :localPath="localPath" :tagLabel="tagLabel"></component>
</template>
<script setup>
import { toRef, computed,inject,onMounted,defineEmits } from 'vue'
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
const emit = defineEmits(['globChange'])
onMounted(()=>{
    if (localPath) {

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
