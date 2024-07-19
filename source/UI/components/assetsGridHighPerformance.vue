<template>
    <div class="fn__flex" style="max-height:100%">
        <div class="fn__flex-column fn__flex-1">
            <div class="fn__flex-column fn__flex-1">
                <div class="fn__flex-column fn__flex-1">
                    <div class="fn__flex-1 fn__flex">
                        <template v-for="(data, i) in columnDatas">
                            <assetsColumnBinary @scrollSyncNeed="handlerColumnScroll" :scrollTop="scrollTop"
                                :value="data" @assetsNeedMore="pushNewAsset(column1Data)"
                                @heightChange="handlerColumnHeightChange">
                            </assetsColumnBinary>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup>
import assetsColumnBinary from './assetsColumn.vue';
import { 获取tab附件数据 } from "../../data/siyuanAssets.js"
import { ref, onMounted, inject, computed, toRef, nextTick } from 'vue'
import { 创建思源附件预览页面内容 } from "../../previewers/previewerFactor.js"

let assetsMetas = ref([])
const appData = toRef(inject('appData'))
const size = ref(200)
let columnDatas = ref([ref([]), ref([]), ref([]), ref([])])
const scrollTop = ref(0)
const pushNewAsset = (columnData) => {
    //console.log(columnData)
    columnDatas.value.forEach(
        item => item.value.push(assetsMetas.value[100])
    )
}
const handlerColumnScroll = (_scrollTop) => {
    // console.log(_scrollTop)
    scrollTop.value = _scrollTop
}
const handlerColumnHeightChange = (height) => {
    //   console.log(height)
}

onMounted(async () => {
    // Fetch assets data
    let assets = await 获取tab附件数据(appData.value.tab, 102400);
    assetsMetas.value = assets.map((item, i) => ({
        ...item,
        index: i,
        height: parseInt(size.value),
        position: { x: 0, y: 0 },
        frameContent: 创建思源附件预览页面内容(item, true),
    }));
    assetsMetas.value=assetsMetas.value.concat(assetsMetas.value).concat(assetsMetas.value).concat(assetsMetas.value)
    columnDatas.value.forEach(item => {
        const totalLength = assetsMetas.value.length;
        const chunkSize = Math.ceil(totalLength / columnDatas.value.length); // 计算每个子数组的长度
        const startIndex = Math.floor(Math.random() * (totalLength - chunkSize + 1)); // 随机选择起始索引
        const endIndex = startIndex + chunkSize; // 计算结束索引

        item.value = JSON.parse(JSON.stringify(assetsMetas.value)).slice(startIndex, endIndex);
    });
}
)
</script>