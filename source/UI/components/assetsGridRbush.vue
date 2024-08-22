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
                    <div @click="handleClick" :tabindex="卡片数据.index" @keydown.stop="handleKeyDown"
                        :class="['thumbnail-card', 卡片数据.selected ? 'asset-selected' : '']" :style="计算卡片样式(卡片数据)"
                        v-if="卡片数据 && 卡片数据.data && showCard" :data-indexInColumn="卡片数据 && 卡片数据.indexInColumn"
                        :data-index="卡片数据.index" :data-id="卡片数据.data.id">
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
import { 获取tab附件数据, 获取本地文件夹数据, 获取标签列表数据 } from "../../data/siyuanAssets.js"
import { ref, onMounted, inject, reactive, toRef, watch, defineProps, nextTick, defineEmits, shallowRef, onUnmounted } from 'vue'
import { 创建瀑布流布局 } from "../utils/layoutComputer/masonry/layout.js";
import assetsThumbnailCard from "./common/assetsThumbnailCard.vue";
/*监听尺寸变化重新布局*/
const props = defineProps(['size', 'sorter', 'globSetting', 'maxCount'])
const size = toRef(props, 'size')
const maxCount = toRef(props, 'maxCount')
const sorter = toRef(props, 'sorter')
const globSetting = toRef(props, 'globSetting')
const root = ref(null)
const scrollContainer = ref(null)
const appData = toRef(inject('appData'))
let 布局对象 = shallowRef(null)
const columnCount = ref(1)
const paddingLR = ref(100)
const containerHeight = ref(102400)
const showCard = ref(true)
/**
 * 
 * 处理聚焦和切换等逻辑
 */
import { handlerKeyDownWithLayout, setFocus } from "../utils/selection.js";

const handleClick = (e) => {
    setFocus(e.currentTarget)
}
/**
 * 
 * @param e 
 * 使用方向键来确定聚焦的元素
 * 需要处理循环的情况
 * 上下元素可以根据index和column来确定
 * 左右元素可以根据index来确定
 */
const handleKeyDown = (e) => {
    handlerKeyDownWithLayout(e, 布局对象.value, columnCount.value, scrollContainer.value)
    return

}
const 计算卡片样式 = (卡片数据) => {
    return {
        transform: 'none',
        top: `${卡片数据.y}px`,
        left: `${卡片数据.x + paddingLR.value}px`,
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
    emit("layoutCount", 附件数据组.length)

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
                    emit("layoutLoadedCount", 布局对象.value.layout.length)

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

import { 监听尺寸,以函数创建尺寸监听 } from "../utils/observers/resize.js"
const 监听尺寸函数 = 以函数创建尺寸监听((stat)=>{
    columnCount.value = Math.max(Math.floor(stat.width / size.value) - 1, 1)
    paddingLR.value = (stat.width - (size.value / 6 * (columnCount.value - 1) + size.value * columnCount.value)) / 2
},true)
watch(
    [columnCount, size], async () => {
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
            () => 更新可见区域(true)

        )
    }
)
const emit = defineEmits()

watch(
    [布局对象, columnCount, size], () => {
        if (布局对象.value) {
            emit('layoutChange', {
                layout: 布局对象.value,
                element: scrollContainer.value
            })
            emit("layoutLoadedCount", 布局对象.value.layout.length)

        }
    }
)


import {定长执行} from "../../utils/functions/Iteration.js"
const 定长加载 = (阈值)=>{
    let 生成函数 =async ()=>{
        return 附件数据组.shift && 附件数据组.shift()
    }
    let 迭代函数 =async (data)=>{
        if(data && data.id){
            布局对象.value.add(data)
            更新可见区域(true)
        }
    }
    let 忽略空值 = false
    let 忽略迭代错误 = false
    let 忽略执行错误 = false
    定长执行(生成函数,迭代函数,阈值,忽略空值,忽略迭代错误,忽略执行错误)
}

const mounted = ref(null)
watch(
    mounted, (newVal, oldVal) => {
        if (newVal === oldVal) {
            return
        }
        布局对象.value = 创建瀑布流布局(columnCount.value, size.value, size.value / 6, [], reactive)
        nextTick(() => {
            监听尺寸函数(scrollContainer.value)
            定长加载(100)
        })
    }
)
let oldsize
let lastSort = Date.now()
//排序函数
function sortLocalStream() {
    emit("layoutCount", 附件数据组.length)
    布局对象.value && emit("layoutLoadedCount", 布局对象.value.layout.length)
    mounted.value = true
    if (布局对象.value && 布局对象.value.layout.length !== oldsize && Date.now() - lastSort >= 100) {
        oldsize = 布局对象.value.layout.length
        布局对象.value = 布局对象.value.sort(sorter.value.fn)
        更新可见区域(true)
    }
}
const controller = new AbortController();
const signal = controller.signal;

onUnmounted(
    () => {
        try {
            emit("layoutCount", 0)
            emit("layoutLoadedCount", 0)
            controller.abort('unmounted');
        } catch (e) {
            console.warn(e)
        }
    }
)

onMounted(async () => {
    appData.value.tab.controllers = appData.value.tab.controllers || []
    appData.value.tab.controllers.push(controller)

    if (appData.value.tab.data.localPath) {
        附件数据组 = []
        try {
            await 获取本地文件夹数据(globSetting.value, 附件数据组, sortLocalStream, 10, signal)
        } catch (e) {
            console.warn(e)
        }
    }
    else if (appData.value.tab.data.tagLabel) {
        附件数据组 = []
        
        await 获取标签列表数据(appData.value.tab.data.tagLabel, 附件数据组, sortLocalStream, 1, signal,globSetting.value)
    }
    else if (appData.value.tab.data.type === 'sql') {
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
                监听尺寸函数(scrollContainer.value)
                定长加载(100)
            }
        )

    }
    else {
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
                监听尺寸函数(scrollContainer.value)
                定长加载(100)
            }
        )
    }
})
</script>
<style scoped>
.thumbnail-card:focus {
    border-color: var(--b3-theme-primary) !important;
    border-width: 1px;
    border-style: solid;

}
</style>