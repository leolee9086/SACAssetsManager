<template>
    <div class="fn__flex-column fn__flex-1" style="max-height:100%;height: 100%;" ref="root">
        <div class="fn__flex-1 fn__flex gallery_container" ref="scrollContainer" @scroll="更新可见区域"
            style="position: relative;">

            <div class="fn__flex-column fn__flex-1" :style="`min-height: ${containerHeight}px;
                        height:${containerHeight}px;
                        padding-left:${paddingLR}px;
                        padding-right:${paddingLR}px`
            ">

                <template v-for="(卡片数据, i) in 可见卡片组" :key="(卡片数据&&卡片数据.data?卡片数据.data.id+卡片数据.data.index:Date.now())">

                    <div :class="['thumbnail-card', 卡片数据.selected ? 'asset-selected' : '']" :style="计算卡片样式(卡片数据)"
                        v-if="卡片数据 && 卡片数据.data && showCard" :data-indexInColumn="卡片数据 && 卡片数据.indexInColumn"
                        :data-id="卡片数据.data.id">

                        <!--<img :data-columnIndex="卡片数据.columnIndex" :data-indexInColumn="卡片数据.indexInColumn"
                                        :style="`width:100%;height:100%;border:none; `" :onload="(e) => 更新图片尺寸(e, 卡片数据)"
                                        loading="eager"
                                        :src="`http://127.0.0.1/thumbnail/?path=${encodeURIComponent(卡片数据.data.path)}`">-->
                        <assetsThumbnailCard :size="size" @updateSize="(data) => 更新图片尺寸(data, 可见卡片组[i])"
                            :cardData="卡片数据">
                        </assetsThumbnailCard>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>
<script setup>
import { 获取tab附件数据, 获取本地文件夹数据 } from "../../data/siyuanAssets.js"
import { ref, onMounted, inject, reactive, toRef, watch, defineProps, nextTick, defineEmits, shallowRef } from 'vue'
import { 创建瀑布流布局 } from "../utils/layoutComputer/masonry/layout.js";
import assetsThumbnailCard from "./common/assetsThumbnailCard.vue";
/*监听尺寸变化重新布局*/
const props = defineProps(['size'])
const size = toRef(props, 'size')
const root = ref(null)
const scrollContainer = ref(null)
const appData = toRef(inject('appData'))
let 布局对象 = shallowRef(null)
const columnCount = ref(1)
const paddingLR = ref(100)
const containerHeight = ref(102400)
const showCard = ref(true)
const 计算卡片样式 = (卡片数据) => {
    return {
        transform: `translate(${卡片数据.x}px,${卡片数据.y}px)`,
        height: 卡片数据.height + 'px',
        width: 卡片数据.width + 'px',
        position: 'absolute',
    }
}

const 可见卡片组 = ref([])
function 更新图片尺寸(dimensions, cardData) {
    更新素材高度(cardData, dimensions.height)
}
function 更新素材高度(cardData, height) {
    const oldHeight = cardData.height
    if (Math.abs(height + 0 - oldHeight + 0) >= oldHeight * 0.1 && !cardData.ready) {
        布局对象.value.update(cardData.index, height + 0)
        更新可见区域(true)
    }
}
let oldScrollTop
let isUpdating
const 更新可见区域 = (flag) => {
    let { scrollTop, clientWidth, clientHeight } = scrollContainer.value
    emit('scrollTopChange', scrollTop)
    clientHeight = Math.min(clientHeight, window.innerHeight)
    clientWidth = Math.min(clientWidth, window.innerWidth)
    if (oldScrollTop === scrollTop && scrollTop !== 0 && !flag) {
        return
    }
    if (isUpdating && !flag) {
        return
    }
    布局对象.value.timeStep += 5

    try {
        containerHeight.value = Math.max(...布局对象.value.columns.map(column => column.y))
    } catch (e) {
        console.warn(e)
    }
    try {
        oldScrollTop = scrollTop
        let 可见框 = {
            minX: 0,
            minY: scrollTop - clientHeight - clientHeight,
            maxY: scrollTop + clientHeight + clientHeight,
            maxX: clientWidth
        }
        let result = Array.from(new Set(布局对象.value.search(可见框)))
        可见卡片组.value.length = 0
        可见卡片组.value.splice(0, 可见卡片组.value.length, ...result);
        let _flag = true
        while (_flag) {
            try {
                let { columns } = 布局对象.value
                let shortestColumn = columns[0];
                let shortestColumnIndex = 0
                for (let i = 1; i < columns.length; i++) {
                    if (columns[i].y < shortestColumn.y) {
                        shortestColumn = columns[i];
                        shortestColumnIndex = i; // 更新索引
                    }
                }
                if (shortestColumn.y < scrollTop + clientHeight + clientHeight + clientHeight && 附件数据组.length) {
                    let data = 附件数据组.shift && 附件数据组.shift()
                    data.id ? 布局对象.value.add(data) : _flag = false

                } else {
                    _flag = false
                }
            } catch (e) {
                _flag = false
            }
        }
    } catch (e) {
        console.warn(e)
    }
    isUpdating = false
}

let 附件数据组
let oldWith
const resizeObserver = new ResizeObserver(entries => {
    if (scrollContainer.value && scrollContainer.value.clientWidth !== oldWith) {
        oldWith = scrollContainer.value.clientWidth
        columnCount.value = Math.max(Math.floor(scrollContainer.value.clientWidth / size.value) - 1, 1)
        paddingLR.value = (scrollContainer.value.clientWidth - (size.value / 6 * (columnCount.value - 1) + size.value * columnCount.value)) / 2
    }
});

watch(
    [columnCount, size], async() => {

        if (!scrollContainer.value) {
            return
        }
        if (!scrollContainer.value.clientWidth) {
            return
        }
        if (!columnCount.value) {
            return
        }
        columnCount.value = Math.max(Math.floor(scrollContainer.value.clientWidth / size.value) - 1, 1)
        paddingLR.value = (scrollContainer.value.clientWidth - (size.value / 6 * (columnCount.value - 1) + size.value * columnCount.value)) / 2
        columnCount.value && 布局对象.value && (布局对象.value = 布局对象.value.rebuild(columnCount.value, size.value, size.value / 6, [], reactive))
        emit('layoutChange', {
            layout: 布局对象.value,
            element: scrollContainer.value
        })
        paddingLR.value = (scrollContainer.value.clientWidth - (size.value / 6 * (columnCount.value - 1) + size.value * columnCount.value)) / 2
        可见卡片组.value = []
        nextTick(
           ()=> 更新可见区域(true)

        )
    }
)
const emit = defineEmits()

watch(
    [布局对象, columnCount, size], () => {
        布局对象.value&&emit('layoutChange', {
            layout: 布局对象.value,
            element: scrollContainer.value
        })
    }
)
const mounted=ref(null)
watch(
    mounted,(newVal,oldVal)=>{
        if(newVal===oldVal){
            return
        }
        布局对象.value = 创建瀑布流布局(columnCount.value, size.value, size.value / 6, [], reactive)
        nextTick(() => {
            resizeObserver.observe(scrollContainer.value)
            resizeObserver.observe(
                root.value
            )
            for (let i = 0; i < 100; i++) {

                let data = 附件数据组.shift && 附件数据组.shift()
                data && data.id ? 布局对象.value.add(data) : null
                更新可见区域(true)
            }
            /**
             * 内容是流式更新的所以需要这样
             */


        })

    }
)
onMounted(async () => {
    if (appData.value.tab.data.localPath) {
        附件数据组 = []
        await 获取本地文件夹数据(appData.value.tab, 附件数据组,async()=>{mounted.value=true}, 1)

    } else {
        附件数据组 = await 获取tab附件数据(appData.value.tab, 102400);
        附件数据组.map(
            (item, index) => {
                return ref({
                    ...item,
                    index
                })
            }
        )
        nextTick(
            () => {
                布局对象.value = 创建瀑布流布局(columnCount.value, size.value, size.value / 6, [], reactive)
                resizeObserver.observe(scrollContainer.value)
                resizeObserver.observe(
                    root.value
                )
                for (let i = 0; i < 100; i++) {
                    let data = 附件数据组.shift && 附件数据组.shift()
                    data && data.id ? 布局对象.value.add(data) : null

                }
                更新可见区域(true)
            }
        )
    }
})
</script>