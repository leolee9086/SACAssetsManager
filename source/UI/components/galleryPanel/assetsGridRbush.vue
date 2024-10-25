<template>
    <div class="fn__flex-column fn__flex-1" style="max-height:100%;height: 100%;" ref="root">
        <div class="fn__flex-1 fn__flex gallery_container" ref="scrollContainer" @scroll="更新可见区域"
            style="position: relative;">
            <div class="fn__flex-column fn__flex-1" :style="`height:${containerHeight}px`">
                <template v-for="(卡片数据, i) in 可见卡片组" :key="(卡片数据&&卡片数据.data?卡片数据.data.id+卡片数据.data.index:Date.now())">
                    <div @click="handleClick" :tabindex="卡片数据.index" @keydown.stop="handleKeyDown"
                    :class="['thumbnail-card', 卡片数据.selected ? 'asset-selected' : '']" :style="计算卡片样式(卡片数据)"
                        v-if="卡片数据 && 卡片数据.data" :data-indexInColumn="卡片数据 && 卡片数据.indexInColumn"
                        :data-index="卡片数据.index" :data-id="卡片数据.data.id">
                        <assetsThumbnailCard 
                        :displayMode="cardDisplayMode"    

                        :selected="卡片数据.selected" :size="size"
                        :tableViewAttributes="tableViewAttributes"
                            @updateSize="(data) => 更新图片尺寸(data, 可见卡片组[i])" :cardData="卡片数据" @palletAdded="palletAdded"
                            :filterColor="filterColor">
                        </assetsThumbnailCard>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>
<script setup>
import { 表格视图阈值 } from "../../utils/threhold.js";
import {
    ref,
    onMounted,
    reactive,
    toRef,
    watch,
    defineProps,
    nextTick,
    defineEmits,
    shallowRef,
    onUnmounted,
    defineExpose
} from 'vue'
import { 从数据源定量加载数据, 创建瀑布流布局 } from "../../utils/layoutComputer/masonry/layout.js";
import assetsThumbnailCard from "../common/assetsThumbnailCard.vue";
/**
 * 计算样式的部分
 */
const 计算卡片样式 = (卡片数据) => {
    return `
        transform: none;
        top: ${卡片数据.y}px;
        left: ${卡片数据.x + paddingLR.value}px;
        height: ${卡片数据.height}px;
        width: ${size.value > 表格视图阈值 ? 卡片数据.width + 'px' : `100%`};
        position: absolute;
    `
}
//let 附件数据源数组 =shallowRef([])

/*监听尺寸变化重新布局*/
const props = defineProps(['size', 'sorter', 'globSetting', 'maxCount', 'filterColor', 'assetsSource','tableViewAttributes','cardDisplayMode'])
const tableViewAttributes=toRef(props,'tableViewAttributes')
const 附件数据源数组 = props.assetsSource
const size = toRef(props, 'size')
const sorter = toRef(props, 'sorter')
const filterColor = toRef(props, 'filterColor')
const cardDisplayMode = toRef(props,'cardDisplayMode')
const root = ref(null)
const scrollContainer = ref(null)
let 布局对象 = shallowRef(null)
const columnCount = ref(1)
const paddingLR = ref(100)
const containerHeight = ref(102400)


const emit = defineEmits()

const palletAdded = (data) => {
    emit('palletAdded', data)
}
/**
 * 
 * 处理聚焦和切换等逻辑
 */
import { handlerKeyDownWithLayout, setFocus } from "../../utils/selection.js";

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
function 上报统计数据(total) {
    if (total) {
        emit("layoutCountTotal", total)
        return
    }
    emit("layoutCount", 附件数据源数组.data.length)
    emit("layoutCount", 附件数据源数组.data.length)
    if (scrollContainer.value) {
        let { scrollTop } = scrollContainer.value

        emit('scrollTopChange', scrollTop)
    }
    布局对象.value && emit("layoutLoadedCount", 布局对象.value.layout.length)
}

let isUpdating
let oldScrollTop
const 是否更新 = (flag) => {
    if (!scrollContainer.value) {
        return
    }
    if (!布局对象.value) {
        return false
    }
    if (oldScrollTop === scrollContainer.value.scrollTop && scrollContainer.value.scrollTop !== 0 && !flag) {
        return false;
    }
    if (isUpdating && !flag) {
        return false;
    }

    return true;
}
const 更新布局容器高度 = () => {
    try {
        containerHeight.value = Math.min(
            Math.max(
                布局对象.value.getTotalHeight(),
                (附件数据源数组.data.length + 布局对象.value.layout.length) * size.value / columnCount.value
            ),
            1024000
        )
    } catch (e) {
        console.warn(e)
    }
}

import { 获取布局最短列, 从数据源添加新数据 } from "../../utils/layoutComputer/masonry/layout.js";
const 加载更多卡片 = (scrollContainer, 布局对象, 附件数据组) => {
    let { scrollTop, clientWidth, clientHeight } = scrollContainer
    clientHeight = Math.min(clientHeight, window.innerHeight)
    clientWidth = Math.min(clientWidth, window.innerWidth)
    let _flag = true
    let max = 0
    while (_flag && max < 1024) {
        try {
            let shortestColumn = 获取布局最短列(布局对象)
            if (shortestColumn.y < scrollTop + clientHeight + clientHeight + clientHeight && 附件数据组.length) {
                _flag = 从数据源添加新数据(布局对象, 附件数据组, data => data && data.id)
            } else {
                _flag = false
            }
        } catch (e) {
            _flag = false
        } finally {
            max++
        }
    }
}
const 计算可见框 = (scrollTop, clientHeight, clientWidth) => {
    return {
        minX: 0,
        minY: scrollTop - clientHeight * 2,
        maxY: scrollTop + clientHeight * 2,
        maxX: clientWidth
    }
}

const 获取可见区域尺寸 = () => {
    let { scrollTop, clientWidth, clientHeight } = scrollContainer.value
    return {
        scrollTop,
        clientWidth: Math.min(clientWidth, window.innerWidth),
        clientHeight: Math.min(clientHeight, window.innerHeight)
    }
}
const 更新可见卡片 = (可见框) => {
    let result = Array.from(new Set(布局对象.value.search(可见框)))
    可见卡片组.value.length = 0
    可见卡片组.value.splice(0, 可见卡片组.value.length, ...result)
}
const 更新可见区域 = (flag) => {
    const { scrollTop, clientWidth, clientHeight } = 获取可见区域尺寸()
    上报统计数据()
    if (!是否更新(flag)) {
        return
    }
    更新布局容器高度()
    布局对象.value && (布局对象.value.timeStep += 5);
    try {
        oldScrollTop = scrollTop
        const 可见框 = 计算可见框(scrollTop, clientHeight, clientWidth)
        更新可见卡片(可见框)
        加载更多卡片(scrollContainer.value, 布局对象.value, 附件数据源数组.data)
        更新布局容器高度()
        上报统计数据()
    } catch (e) {
        console.warn(e)
    }
    isUpdating = false
}


import { 以函数创建尺寸监听 } from "../../utils/observers/resize.js"
let lastWidth = 0
const 监听尺寸函数 = 以函数创建尺寸监听((stat) => {
    if (stat.width === lastWidth) {
        return
    }
    列数和边距监听器(stat.width)
    lastWidth = stat.width
}, true)
const 列数和边距监听器 = async () => {
    if (!scrollContainer.value) {
        return
    }
    if (!scrollContainer.value.clientWidth) {
        return
    }
    if (!columnCount.value) {
        return
    }
    计算列数和边距(scrollContainer.value.clientWidth)
    columnCount.value && 布局对象.value && (布局对象.value = 布局对象.value.rebuild(columnCount.value, size.value, gutter(), [], reactive))
    emitLayoutChange()
    可见卡片组.value = []
    nextTick(
        () => 更新可见区域(true)
    )
}
watch(() => size.value, 列数和边距监听器)
watch(() => scrollContainer.value && scrollContainer.value.clientWidth, 列数和边距监听器)

const emitLayoutChange = () => {
    emit('layoutChange', {
        layout: 布局对象.value,
        element: scrollContainer.value
    })
    上报统计数据()
}
watch(
    [布局对象, columnCount, size], () => {
        if (布局对象.value) {
            if (size.value >= 表格视图阈值) {

                emitLayoutChange()
            }
        }
    }
)




const mounted = ref(null)
const gutter = ()=>{
    return columnCount.value===1?10 :size.value/6
}
//排序函数
let oldsize
let lastSort = Date.now()
async function 确认初始化界面并排序(total) {
    if (!scrollContainer.value) {
        return
    }
    上报统计数据(total)
    mounted.value = true
    布局对象.value = 布局对象.value || 创建瀑布流布局(columnCount.value, size.value, gutter(), [], reactive)
    if (布局对象.value && 布局对象.value.layout.length !== oldsize && Date.now() - lastSort >= 10) {
        oldsize = 布局对象.value.layout.length
        布局对象.value = 布局对象.value.sort(sorter.value.fn)
        更新可见区域(true)
    }
    emitLayoutChange()
    nextTick(() => {
        监听尺寸函数(scrollContainer.value)
    })
}
defineExpose({
    dataCallBack: 确认初始化界面并排序,
    getColumnCount:()=>columnCount.value,
    getContainerWidth:()=>scrollContainer.value.clientWidth
})

onMounted(async () => {
    nextTick(
        () => {
            emit('ready')

        }
    )
})
/**
 * 计算布局使用的列宽和边距
 */
import { 根据宽度和尺寸计算列数和边距 } from "../../utils/layoutComputer/masonry/columnAndPadding.js";
const 计算列数和边距 = (width) => {
    const result = 根据宽度和尺寸计算列数和边距(width, size.value, 表格视图阈值);
    columnCount.value = result.columnCount;
    paddingLR.value = result.paddingLR;
    emit('paddingChange', paddingLR.value);
    emit('columnCountChange', columnCount.value);
}
</script>
<style scoped>
.thumbnail-card:focus {
    border-color: var(--b3-theme-primary) !important;
    border-width: 1px;
    border-style: solid;
}
</style>