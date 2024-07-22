<template>
    <div class="fn__flex" style="max-height:100%;" ref="root">
        <div class="fn__flex-column fn__flex-1">
            <div class="fn__flex-column fn__flex-1">
                <div class="fn__flex-column fn__flex-1">
                    <div class="fn__flex-1 fn__flex" style="position: relative;">
                        <div class="fn__flex-column fn__flex-1" :style="`min-width:${gutterV}px`"></div>
                        <template v-for="(data, i) in columnDatas">
                            <div class="fn__flex-column fn__space" :style="`min-width:${gutterV}px`">
                            </div>
                            <assetsColumn v-if=(data[0]) :size="size" :scrollTop="scrollTop" :data="columnDatas[i]"
                                :dataFetcher="fetchNewData" :containerHeight="containerHeight"
                                @scrollSyncNeed="handlerColumnScroll" @assetsNeedMore="pushNewAsset(column1Data)"
                                @heightChange="handlerColumnHeightChange" :showScroll="i === columnDatas.length - 1"
                                :component="assetsThumbnailCard" :columnIndex="i">
                            </assetsColumn>
                        </template>
                        <div class="fn__flex-column fn__flex-1" :style="`min-width:${gutterV}px`"></div>
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
import assetsThumbnailCard from './common/assetsThumbnailCard.vue';
let assetsMetas = ref([])
const appData = toRef(inject('appData'))
const size = ref(100)
let columnDatas = ref([[], [], [], [], []])
const scrollTop = ref(0)
const containerHeight = ref(0)
const gutterV = ref(10)
const root = ref(null)
const fetchNewData = (index, force) => {
    const minHeight = Math.min(...columnHeights.value);
    const minIndex = columnHeights.value.indexOf(minHeight)
    //只允许当前非最长的列拉取数据
    if (index === minIndex || force) {
        //const randomIndex = Math.floor(Math.random() * assetsMetas.value.length);
        //return JSON.parse(JSON.stringify(assetsMetas.value[randomIndex]));
        return assetsMetas.value.shift()
    }
}



const pushNewAsset = (columnData) => {
    // console.log(columnData)
}
const handlerColumnScroll = (_scrollTop) => {
    const maxHeight = Math.max(...columnHeights.value);
    scrollTop.value = _scrollTop
    if (_scrollTop > maxHeight && maxHeight > 0&&assetsMetas.value.length) {
        scrollTop.value = maxHeight-root.value.clientHeight/2
    } else {
        scrollTop.value = _scrollTop;
    }
}

//用于实现瀑布流布局的插入定位
//每次将新的卡片插入最低的序列
const columnHeights = ref([])
const handlerColumnHeightChange = (data) => {
    const { height, index } = data
    columnHeights.value[index] = height
    const maxHeight = Math.max(...columnHeights.value);

    containerHeight.value=maxHeight+root.value.clientHeight/2
    return

    const totalHeight = columnHeights.value.reduce(
        (acc, item) => { return (acc || 0) + (item || 0) },0
    )
    let  _containerHeight = totalHeight / assetsMetas.value.length * Math.max(...columnDatas.value.map(column => column.length))
    containerHeight.value=_containerHeight===Infinity ?containerHeight.value:_containerHeight
}
onMounted(async () => {
    // Fetch assets data
    let assets = await 获取tab附件数据(appData.value.tab, 102400);
    assetsMetas.value = assets.map((item, i) => ({
        ...item,
        index: i,
        height: parseInt(size.value),
    }));
    // assetsMetas.value = assetsMetas.value.concat(assetsMetas.value).concat(assetsMetas.value).concat(assetsMetas.value)
    // 假设 columnDatas.value 和 assetsMetas.value 已经初始化且有相应的数据
    for (let i = 0; i < 100; i++) {
        // 计算分配给当前索引的列索引
        const columnIndex = i % columnDatas.value.length;
        // 计算当前索引对应的 assetsMetas.value 中的索引
            const asset = assetsMetas.value.shift();
            // 将 assetsMetas.value 中的数据分配到 columnDatas.value 中的相应列
            columnDatas.value[columnIndex].push({
                position: { x: 0, y: 0 },
                height: asset.height,
                width: parseInt(size.value),
                asset,
                index: i
            });
        
    }
   /* columnDatas.value.forEach(data => {
        const totalLength = assetsMetas.value.length;
        const chunkSize = Math.ceil(totalLength / columnDatas.value.length); // 计算每个子数组的长度
        const startIndex = Math.floor(Math.random() * (totalLength - chunkSize + 1)); // 随机选择起始索引
        const endIndex = startIndex + chunkSize; // 计算结束索引
        for (let i = startIndex; i < endIndex; i++) {
            let asset = assetsMetas.value[i]
            data.push({
                position: { x: 0, y: 0 },
                height: asset.height,
                width: parseInt(size.value),
                asset,
                index: asset.index
            })
        }
    });*/
}
)
</script>