<template>
    <div class="thumbnail-card-content" :style="`width:100%;
    border:none;
    border-radius: ${cardData.width / 24}px;
    height:${size < 表格视图阈值 ? size : cardHeight}px;
    background-color:${firstColorString};
    display:${size < 表格视图阈值 ? 'flex' : 'inline-block'};
    `">
        <div v-if="size > 表格视图阈值" :style="`
    position:${size > 表格视图阈值 ? 'absolute' : 'relative'};
    top: ${cardData.width / 24}px;
    left: ${cardData.width / 24}px;
    max-width: ${genMaxWidth()};
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
            v-if="showImage" :style="$计算素材缩略图样式" loading="lazy" draggable='true' :onload="(e) => 更新图片尺寸(e, cardData)"
            :src="thumbnail.genHref(cardData.data.type, cardData.data.path, size, cardData.data)" />
        <div :style="$计算素材详情容器样式" ref="detailContainer">
            {{ size > 表格视图阈值 ? cleanAssetPath(cardData.data) : '' }}
            <div v-if="size < 表格视图阈值" :style="`
                color:${similarColor ? rgb数组转字符串(similarColor) : ''};
                height:${size}px;
                display:flex;
                flex:1;
                max-width:100%;
                width:100%
                `
                ">
                <template v-for="prop in getProps(cardData.data)">
                    <div v-if="prop && (文件系统内部属性表[prop] ? 文件系统内部属性表[prop].show : true)" :style="`border:1px solid var(--b3-theme-background-light);
                    padding:0px;
                    margin:0px;
                    overflow:hidden;
                    width:${100 / (getProps(cardData.data).length + 1)}%;
                    text-overflow:ellipsis;
                    white-space:nowrap;`
                        " class="ariaLabel"
                        :aria-label="解析文件属性名标签(prop) + ':' + 解析文件内部属性显示(prop, cardData.data[prop])">
                        {{ 解析文件内部属性显示(prop, cardData.data[prop]) }}
                    </div>
                </template>
                <div :style="`
                display: grid;
                width:${100 / (getProps(cardData.data).length + 1)}%;
                max-width:${100 / (getProps(cardData.data).length + 1)}%;
                grid-template-columns: repeat(auto-fill, minmax(16px, 1fr));`">
                    <template v-for="colorItem in pallet">
                        <colorPalletButton :colorItem="colorItem"></colorPalletButton>
                    </template>
                </div>
            </div>
            <div v-if="size >= 表格视图阈值">
                <template v-for="colorItem in pallet">
                    <colorPalletButton :colorItem="colorItem"></colorPalletButton>
                </template>
            </div>
        </div>
    </div>
</template>
<script setup>
import { ref, computed, toRef, onMounted, onBeforeUnmount, defineEmits, nextTick } from 'vue';
import { thumbnail } from '../../../server/endPoints.js';
import { cleanAssetPath } from '../../../data/utils/assetsName.js';
import { clientApi } from '../../../asyncModules.js';
import { rgb数组转字符串 } from '../../../utils/color/convert.js';
import { diffColor } from '../../../server/processors/color/Kmeans.js';
import { plugin } from 'runtime'
import { 表格视图阈值 } from '../../utils/threhold.js';
import { 文件系统内部属性表, 解析文件内部属性显示, 解析文件属性名标签 } from '../../../data/attributies/parseAttributies.js';
import colorPalletButton from './pallets/colorPalletButton.vue';
const props = defineProps(['cardData', 'size', 'filterColor', 'selected'])
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



import { 块类型语言对照表 } from '../../../utils/siyuanData/block.js';
function 计算扩展名(data){
    if(data.type==='note'){
        return `笔记:${ 块类型语言对照表[data.$meta.type]  ||data.$meta.type}`
    }
    return size.value > 表格视图阈值 ? data.path.split('.').pop() : '' 
}
function getProps(data) {
    return Object.keys(data).filter(key => key !== 'id' && key !== 'type' && key !== 'index' && key !== 'indexInColumn' && key !== 'width' && key !== 'height' && (文件系统内部属性表[key] ? 文件系统内部属性表[key].show : true))
}
const genMaxWidth = () => {
    if (size.value < 表格视图阈值) {
        return `100%`
    } else {
        return `${size.value}px`
    }
}

let idleCallbackId;
let protyle
let fn = async() => {
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
            protyle = buildCardProtyle(protyleContainer.value.firstElementChild)
            showImage.value = false
            const resizeObserver = new ResizeObserver((entries) => {
                cardHeight.value = protyle.protyle.contentElement.scrollHeight + 36 + 18
                if (size.value < 表格视图阈值) {
                    cardHeight.value = protyle.protyle.contentElement.scrollHeight

                }
                emit('updateSize', { width: cardData.width, height: cardHeight.value })

            });
            resizeObserver.observe(protyleContainer.value);
        })
    }

}
onMounted(() => {
    showImage.value = true

    idleCallbackId = requestIdleCallback(fn,{timeout:300})

//    idleCallbackId = setTimeout(fn, 300);
});
onBeforeUnmount(() => {
    cancelIdleCallback(idleCallbackId);
    nextTick(
        () => {
            protyle && protyle.destroy()

        }
    )
});
const buildCardProtyle = (element) => {
    return new clientApi.Protyle(
        plugin.app,
        element,
        {
            blockId: cardData.data.id,
            render: {
                breadcrumb: true,
                background: true,
                title: true
            }
        }
    )
}

function 更新图片尺寸(e, cardData) {
    const previewer = e.target
    const dimensions = {
        width: previewer.naturalWidth,
        height: previewer.naturalHeight
    };
    const 缩放因子 = dimensions.width / size.value
    const 新高度 = dimensions.height / 缩放因子
    if (size.value < 表格视图阈值) {
        cardHeight.value = size.value
    } else {
        cardHeight.value = 新高度 + 36
    }
    imageHeight.value = 新高度
    emit('updateSize', { width: cardData.width, height: cardHeight.value })
}

import { 计算素材缩略图样式, 计算素材详情容器样式, 计算素材颜色按钮样式 } from './assetStyles.js';
const $计算素材缩略图样式 = computed(() => 计算素材缩略图样式(
    size.value, imageHeight.value, cardData
))
const $计算素材详情容器样式 = computed(() => 计算素材详情容器样式(
    size.value, cardData
))
</script>
<style scoped></style>