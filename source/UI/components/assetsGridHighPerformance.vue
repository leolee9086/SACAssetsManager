<template>
    <div class="fn__flex" style="max-height:100%">
        <div class="fn__flex-column fn__flex-1">
            <div class="fn__flex-column fn__flex-1">
                <div class="fn__flex-column fn__flex-1">
                    <div class="fn__flex-1 fn__flex">
                        <template v-for="(data, i) in columnDatas">
                            <assetsColumn v-if=(data[0]) 
                            :scrollTop="scrollTop"
                            :data="columnDatas[i]" 
                            :dataFetcher="fetchNewData"
                            @scrollSyncNeed="handlerColumnScroll" 
                         
                            @assetsNeedMore="pushNewAsset(column1Data)"
                            @heightChange="handlerColumnHeightChange">
                            </assetsColumn>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup>
import assetsColumn from './assetsColumn.vue';

import { 获取tab附件数据 } from "../../data/siyuanAssets.js"
import { ref, onMounted, inject, reactive, toRef, nextTick } from 'vue'
import { 创建思源附件预览页面内容 } from "../../previewers/previewerFactor.js"

let assetsMetas = ref([])
const appData = toRef(inject('appData'))
const size = ref(50)
let columnDatas = ref([[], [], [], []])
const scrollTop = ref(0)
const fetchNewData = (index)=>{
    if(index===0){
        const randomIndex = Math.floor(Math.random() * assetsMetas.value.length);
return JSON.parse(JSON.stringify(assetsMetas.value[randomIndex]));    }    
}
const pushNewAsset = (columnData) => {
    console.log(columnData)
}
const handlerColumnScroll = (_scrollTop) => {
    scrollTop.value = _scrollTop
}
//用于实现瀑布流布局的插入定位
//每次将新的卡片插入最低的序列
const columnHeights = ref([])
const handlerColumnHeightChange = (height, index) => {
    columnHeights[index] = height
}
onMounted(async () => {
    // Fetch assets data
    let assets = await 获取tab附件数据(appData.value.tab, 200);
    assetsMetas.value = assets.map((item, i) => ({
        ...item,
        index: i,
        height: parseInt(size.value),
        frameContent: 创建思源附件预览页面内容(item, true),
    }));
   // assetsMetas.value = assetsMetas.value.concat(assetsMetas.value).concat(assetsMetas.value).concat(assetsMetas.value)
    columnDatas.value.forEach(data => {
        const totalLength = assetsMetas.value.length;
        const chunkSize = Math.ceil(totalLength / columnDatas.value.length); // 计算每个子数组的长度
        const startIndex = Math.floor(Math.random() * (totalLength - chunkSize + 1)); // 随机选择起始索引
        const endIndex = startIndex + chunkSize; // 计算结束索引
        for (let i = startIndex; i < endIndex; i++) {
            let asset = assetsMetas.value[i]
            data.push({
                position: { x: 0, y: 0 },
                height: asset.height,
                asset
            })
        }
    });
}
)
</script>