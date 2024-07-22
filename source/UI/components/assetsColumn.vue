<template>
    <div :class="{ 'fn__flex': 1, 'fn__flex-column': 1, 'scroll-column': 1, show_scroll: showScroll }"
        ref="columnContainer" :style="`max-height: 100%;overflow-y:scroll;width:${parseInt(size)}px;`" @scroll="handlerScroll">
        <div class=""
            :style="`transform:translate(0,${0 - columnContainer ? columnContainer.scrollTop : 0}px);min-height:${Math.max(总高度, containerHeight)}px`">
            <template v-for="(cardData, i) in 可见素材" :key="cardData.indexInColumn">
                <div v-if="cardData&&cardData.asset" class="assetCard" 
                :data-height="cardData.height" 
                :data-y="cardData.position.y"
                :data-bottom="cardData.height+cardData.position.y"
                    :style="`position:absolute;width:100%;min-height:${cardData.height}px;max-height:${cardData.height}px;height:${cardData.height}px;transform:translate(0,${cardData.position.y}px)`">
                    <div style="position:absolute;height:10ox;top:15px">{{ cardData.indexInColumn }}</div>
                    <!--                    <iframe :data-path="`${cardData.asset.path}`" loding="eager"
                        style="width:100%;height:100%;border:none" seamless="true"
                        :onload="(e) => 初始化素材页面(e, data[cardData.indexInColumn])">
                    </iframe>
                        -->
                    <component @updateSize="(data) => 更新卡片尺寸(data, cardData)" :cardData="cardData" v-if="component"
                        :is="component"></component>
                    <!--  <img :style="`width:100%;height:100%;border:none; 
                    border-radius: ${size / 12}px;`" :onload="(e) => 更新图片尺寸(e, cardData)"
                        :src="`http://127.0.0.1/thumbnail/?path=${encodeURIComponent(cardData.asset.path)}`">
                        -->

                </div>
            </template>
        </div>
    </div>
</template>
<script setup>
import { ref, watch, toRef, defineEmits, nextTick } from 'vue'
import { 创建思源附件预览页面内容 } from "../../previewers/previewerFactor.js"
import { 二分查找可见素材 } from '../utils/layoutComputer/masonry/layout.js'
const props = defineProps([
    'size',
    'data',
    'scrollTop',
    'dataFetcher',
    'containerHeight',
    'showScroll',
    'render',
    'component',
    'columnIndex'
])
const render = toRef(props, 'render')
const columnIndex = toRef(props, 'columnIndex')
const component = toRef(props, 'component')
const showScroll = toRef(props, 'showScroll')
const size = toRef(props, 'size')
const data = toRef(props, 'data')
const scrollTop = toRef(props, 'scrollTop')
const containerHeight = toRef(props, 'containerHeight')
const { dataFetcher } = props
const columnContainer = ref(null)
const 待渲染素材 = ref([])
const emit = defineEmits()
const 总高度 = ref(0)
const 平均高度 = ref(size.value)
const 可见素材 = ref([])
初始化布局高度()
watch(
    data, (newVal, oldval) => {
        if (oldval !== newVal) { 初始化布局高度() }
    }, {}
)
function 更新卡片尺寸(dimensions, cardData) {
    更新素材高度(cardData, dimensions.height)
}
function 初始化布局高度() {
    for (let i = 0; i < data.value.length; i++) {
        let cardData = data.value[i]
        初始化卡片位置(cardData, i)
        待渲染素材.value.push(cardData)
        if (i <= 10) {
            可见素材.value.push(cardData)
        }
        总高度.value += cardData.height
    }
}
function 请求更多素材(force) {
    let 新素材数据 = dataFetcher(columnIndex.value, force)
    if (新素材数据) {
        let 卡片数据 = 创建卡片(新素材数据)
        初始化卡片位置(卡片数据, data.value.length)
        data.value.push(卡片数据)
        总高度.value += 卡片数据.height
        emit('assetsNeedMore', 111);
        return 新素材数据
    } // Emit an event when assets are loaded
}
function 创建卡片(asset) {
    return {
        position: { x: 0, y: 0 },
        height: asset.height,
        width: parseInt(size.value),
        asset
    }
}
function 初始化卡片位置(cardData, i) {
    cardData.indexInColumn = i
    cardData.ready = false
    let pre = data.value[i - 1]
    pre && (cardData.position.y = (pre.height + pre.position.y))
}
watch(
    总高度, () => {
        emit('heightChange', { height: 总高度.value, index: columnIndex.value })
    }
)
watch(
    scrollTop, (newVal, oldval) => {
        if (newVal !== oldval) {
            columnContainer.value.scrollTop = newVal
        }
    }
)
const startIndex = ref(0)
const endIndex = ref(100)
// 更新队列，记录源卡片的索引和高度差以及更新时间
let updateQueue = [];
// 处理更新的函数
 function processUpdates() {
    // 按源卡片索引升序排序
    updateQueue.sort((a, b) => a.index - b.index);
    // 计算每个分段的高度变化
    let segmentHeightChanges = [];
    let currentHeightChange = 0;
    for (let i = 0; i < updateQueue.length; i++) {
        const heightChange = updateQueue[i].heightChange;
        currentHeightChange += heightChange;
        segmentHeightChanges.push({ index: updateQueue[i].index, heightChange: currentHeightChange });
    }
    // 分段更新受影响的卡片
    for (let i = 0; i < segmentHeightChanges.length; i++) {
        const segment = segmentHeightChanges[i];
        updateCardsFromIndex(segment.index, segment.heightChange, i === segmentHeightChanges.length - 1 ? null : segmentHeightChanges[i + 1].index);
    }
    更新可见区域()
    nextTick(
        () => {
            timeStep = 30
        }
    )
    // 清空队列
    updateQueue = [];
}

// 更新从指定索引开始的所有卡片的高度，直到下一个更新分片的索引
function updateCardsFromIndex(startIndex, heightChange, nextIndex) {
    for (let i = startIndex + 1; i < data.value.length; i++) {
        if (nextIndex !== null && i > nextIndex) {
            break; // 停止更新，因为我们已经到达了下一个更新分片
        }
        if (i >= startIndex.value && i < endIndex.value) {
            data.value[i].position.y += heightChange;
        } else {
            let item = data.value[i]
            item.position.y += heightChange;
        }
    }
}

// 设置定时器来处理更新
let updateTimer = null;
let timeStep = 30
// 更新卡片高度的函数
 function 更新素材高度(cardData, height) {
    const oldHeight = cardData.height;
    const heightChange = parseInt(height) - oldHeight;
    // 检查是否需要更新
    // if (Math.abs(heightChange) >= oldHeight * 0.1 && !cardData.ready) {
    if (!cardData.ready) {
        cardData.ready = true;
        cardData.height = parseInt(height);
        // 更新总高度
        总高度.value += heightChange;
        // 添加到更新队列
        updateQueue.push({
            index: cardData.indexInColumn,
            heightChange: heightChange,
            timestamp: Date.now() // 记录更新的时间戳
        });
        processUpdates();

         //如果定时器未设置，设置一个定时器来处理更新
        //if (!updateTimer) {
          // updateTimer = setTimeout(() => {
          //      processUpdates();
          //      updateTimer = null; // 处理完毕后重置定时器
         // }, timeStep); // 假设处理间隔为100毫秒
        //}
    }
}
let isUpdating
function handlerScroll() {
    timeStep += 5
 
    const scrollTop = columnContainer.value.scrollTop;
    const clientHeight = columnContainer.value.clientHeight;
    let cardElements = columnContainer.value.querySelectorAll('.assetCard')
    let firstCard =cardElements[0]
    let lastCard = cardElements[cardElements.length-1]
    if(parseInt(lastCard.dataset.bottom) <= scrollTop + clientHeight||parseInt(firstCard.dataset.y)>=scrollTop+10){
        总高度.value=parseInt(lastCard.dataset.bottom)
        console.log(1)
        更新可见区域()
    }
    emit('scrollSyncNeed', scrollTop)
}
function 更新可见区域(){

    const scrollTop = columnContainer.value.scrollTop;
    const clientHeight = columnContainer.value.clientHeight;

    const { start, end } = 二分查找可见素材(props.data, scrollTop, clientHeight);
    if (start !== -1 && end !== -1) {
        startIndex.value = start
        endIndex.value = end 
        // 使用 splice 方法删除 visibleMaterials 数组中的所有元素
        可见素材.value = data.value.slice(start, end + 1);
        if (end >= props.data.length - 10) {
            // 触发加载事件，直到最后一个元素
            for (let i = 0; i < end - props.data.length ; i++) {
             (async()=>   请求更多素材())();
            }
        }
    } else {
        endIndex.value = data.value.length;
        (async()=>   请求更多素材())();
    }
    let i = 0
    while (总高度.value < scrollTop + clientHeight && i <= 2) {

        (async()=>   请求更多素材(true))();

        i+=1
   }

}
</script>
<style scope>
.scroll-column:not(.show_scroll)::-webkit-scrollbar {
    display: none;
}
</style>