<template>
    <template v-for="fileListItem in fileList">
        <fileListItem :fileListItem="fileListItem"></fileListItem>
    </template>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import fileListItem from './common/fileListItem.vue';
import {initVueApp} from '../utils/componentsLoader.js'
const fileList = ref([])
onMounted(async() => {
    // 读取测试数据文件
    const dataPath = __dirname
    let  data = await fetch('http://127.0.0.1/glob?path=D:\\')
    data = await data.json() 
    fileList.value=data.slice(0,100)
});
</script>