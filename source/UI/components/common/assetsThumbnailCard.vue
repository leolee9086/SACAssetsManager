<template>
    <div class="thumbnail-card-content" :style="`width:100%;
    border:none;
    border-radius: ${cardData.width / 24}px;
    height:${displayMode === LAYOUT_ROW ? size : cardHeight}px;
    background-color:${firstColorString};
    display:flex;
    flex-direction:${displayMode}
    `"
    ref="cardRoot"
    >
        <div v-if="displayMode === LAYOUT_COLUMN" :style="`
    position:${displayMode === LAYOUT_COLUMN ? 'absolute' : 'relative'};
    top: ${cardData.width / 24}px;
    left: ${cardData.width / 24}px;
    max-width: ${根据阈值计算最大宽度(size)};
    max-height: 1.5em;
    border-radius: 5px;
background-color:var(--b3-theme-background);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;height:36px;
        flex:1;
        `">
            {{ 计算扩展名(cardData.data) }}

        </div>
        <div v-show="showIframe" ref="protyleContainer">
            <div></div>
        </div>
        <div class="alt-text" v-if="!showImage" :style="$计算素材缩略图样式">

        </div>
        <img v-bind="$attrs" class="thumbnail-card-image ariaLabel" :aria-label="`${cardData.data.path}`" ref="image"
            v-if="showImage" :style="$计算素材缩略图样式" loading="lazy" draggable='true'
            :onload="(e) => handleImageLoad(e, cardData)"
            :src="thumbnail.genHref(cardData.data.type, cardData.data.path, size, cardData.data)" />
        <div :style="$计算素材详情容器样式" ref="detailContainer">
            {{ displayMode === LAYOUT_COLUMN ? cleanAssetPath(cardData.data) : '' }}
            <div v-if="displayMode === LAYOUT_ROW" :style="`
                color:${similarColor ? rgb数组转字符串(similarColor) : ''};
                height:${size}px;
                display:flex;
                flex:1;
                max-width:100%;
                width:100%
                `
                ">
                <template v-for="prop in tableViewAttributes">
                    <div v-if="prop && tableViewAttributes.includes(prop)" :style="`border:1px solid var(--b3-theme-background-light);
                    padding:0px;
                    margin:0px;
                    overflow:hidden;
                    width:${100 / (tableViewAttributes.length + 2)}%;
                    text-overflow:ellipsis;
                    white-space:nowrap;`
                        " class="ariaLabel"
                        :aria-label="解析文件属性名标签(prop) + `(${prop})` + ':' + 解析文件内部属性显示(prop, cardData.data[prop])">
                        {{ 解析文件内部属性显示(prop, cardData.data[prop]) }}
                    </div>
                </template>
                <tagsCell :cardData="cardData" :width="`${100 / (tableViewAttributes.length + 2)}%`"></tagsCell>
                <colorPalletCell :cardData="cardData" :width="`${100 / (tableViewAttributes.length + 2)}%`">
                </colorPalletCell>
            </div>
            <colorPalletCell v-if="displayMode === LAYOUT_COLUMN" :cardData="cardData" width="100%"></colorPalletCell>
        </div>
    </div>
</template>
<script setup>
import { ref, computed, toRef, onMounted, onBeforeUnmount, defineEmits, nextTick } from 'vue';
import { thumbnail } from '../../../server/endPoints.js';
import { cleanAssetPath } from '../../../data/utils/assetsName.js';
import { rgb数组转字符串 } from '../../../utils/color/convert.js';
import { diffColor } from '../../../utils/color/Kmeans.js';
import {  根据阈值计算最大宽度,LAYOUT_COLUMN,LAYOUT_ROW } from '../../utils/threhold.js';
import { 解析文件内部属性显示, 解析文件属性名标签 } from '../../../data/attributies/parseAttributies.js';
import { 块类型语言对照表 } from '../../../utils/siyuanData/block.js';
import { findTagsByFilePath } from '../../../data/tags.js';
import { 根据块ID创建protyle } from '../../../utils/siyuanUI/protyle/build.js';
import tagsCell from './assetCard/tagsCell.vue';
import colorPalletCell from '../common/assetCard/paletteCell.vue'
const cardRoot = ref(null)

/**
 * 计算显示模式，当小于表格视图阈值时，切换为表格显示
 */
function handleImageLoad(e, cardData) {
    更新图片尺寸(e, cardData, size.value, ({ width, height }) => {
        cardHeight.value = height;
        imageHeight.value = height;
        emit('updateSize', { width, height });
    });
}
function 更新图片尺寸(e, 卡片数据, 目标宽度, 更新尺寸回调) {
    const 预览器 = e.target;
    const { naturalWidth, naturalHeight } = 预览器;
    const 缩放因子 = naturalWidth / 目标宽度;
    let 新高度 = naturalHeight / 缩放因子;
    displayMode.value===LAYOUT_ROW?新高度=size.value:null
    // 使用回调函数来更新 Vue 的状态
    更新尺寸回调({ width: 卡片数据.width, height: 新高度 });
}

const props = defineProps(['cardData', 'size', 'filterColor', 'selected', 'tableViewAttributes','displayMode'])
const tableViewAttributes = toRef(props, 'tableViewAttributes')
const displayMode = toRef(props, 'displayMode')
const { cardData } = props
const filterColor = toRef(props, 'filterColor')
const size = toRef(props, 'size')
const emit = defineEmits()
const cardHeight = ref(cardData.width + 0)
const imageHeight = ref(cardData.width + 0)
const image = ref(null)
const showIframe = ref(false)
const showImage = ref('')
const protyleContainer = ref(null)
const pallet = ref([])
const firstColorString = ref('var(--b3-theme-background-light)')
const similarColor = computed(() => {
    let item = pallet.value.find(item => item && filterColor.value && diffColor(filterColor.value, item.color))
    return item ? filterColor.value : ''
})

function 计算扩展名(data) {
    if (data.type === 'note') {
        return `笔记:${块类型语言对照表[data.$meta.type] || data.$meta.type}`
    }
    return displayMode===LAYOUT_COLUMN ? data.path.split('.').pop() : ''
}
let idleCallbackId;
let protyle
const tags = ref([])
let fn = async () => {
    fetch(thumbnail.getColor(cardData.data.type, cardData.data.path)).then(
        res => {
            return res.json()
        }
    ).then(
        data => {
            if (!data.error) {
                pallet.value = data.sort((a, b) => b.count - a.count)
                firstColorString.value = rgb数组转字符串(pallet.value[0].color)
                emit('palletAdded', pallet.value)
            }
        }
    )
    if (cardData.data.type === 'note' && cardData.width > 300) {
        showIframe.value = true
        nextTick(() => {
            protyle = 根据块ID创建protyle(protyleContainer.value.firstElementChild, cardData.data.id)
            showImage.value = false
            const resizeObserver = new ResizeObserver((entries) => {
                cardHeight.value = protyle.protyle.contentElement.scrollHeight + 36 + 18
                if (displayMode===LAYOUT_ROW) {
                    cardHeight.value = protyle.protyle.contentElement.scrollHeight
                }
                emit('updateSize', { width: cardData.width, height: cardHeight.value })
            });
            resizeObserver.observe(protyleContainer.value);
        })
    }
    if (cardData.data && cardData.data.path) {
        tags.value = findTagsByFilePath(cardData.data.path)
    }
}
onMounted(() => {
    showImage.value = true
    idleCallbackId = requestIdleCallback(fn, { timeout: 300 })
});
onBeforeUnmount(() => {
    cancelIdleCallback(idleCallbackId);
    nextTick(
        () => {
            protyle && protyle.destroy()

        }
    )
});

import { 计算素材缩略图样式, 计算素材详情容器样式 } from './assetStyles.js';
const $计算素材缩略图样式 = computed(() => 计算素材缩略图样式(
    size.value, imageHeight.value, cardData
))
const $计算素材详情容器样式 = computed(() => 计算素材详情容器样式(
    size.value, cardData
))
</script>
<style scoped></style>