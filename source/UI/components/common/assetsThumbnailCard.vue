<template>
    <div class="thumbnail-card-content" :style="$计算卡片内容样式" ref="cardRoot">
        <div v-show="showIframe" ref="protyleContainer">
            <div></div>
        </div>
        <div :style="$计算素材详情容器样式" ref="detailContainer">
            <imageCell :cardData="cardData" :displayMode="displayMode" :showImage="showImage" :showIframe="showIframe"
                :size="size" @imageLoaded="(e) => handleImageLoad(e, cardData)" />
            {{ displayMode === LAYOUT_COLUMN ? cleanAssetPath(cardData.data) : '' }}
            <template v-if="true || displayMode === LAYOUT_ROW" :style="$计算卡片属性容器样式">
                <template v-for="prop in tableViewAttributes">
                    <div v-if="prop && tableViewAttributes.includes(prop)" :style="$计算卡片属性单元格样式" class="ariaLabel"
                        :aria-label="解析文件属性名标签(prop) + `(${prop})` + ':' + 解析文件内部属性显示(prop, cardData.data[prop])">
                        {{ 解析文件内部属性显示(prop, cardData.data[prop]) }}
                    </div>
                </template>
                <tagsCell :cardData="cardData" :width="attributeCellWidth()" :height="attributeCellHeight()" :displayMode="displayMode"></tagsCell>
                <colorPalletCell :cardData="cardData" :width="attributeCellWidth()" :height="attributeCellHeight()">
                </colorPalletCell>
            </template>
        </div>
    </div>
</template>
<script setup lang="jsx">
import { ref, computed, toRef, onMounted, onBeforeUnmount, defineEmits, nextTick } from 'vue';
import { thumbnail } from '../../../server/endPoints.js';
import { cleanAssetPath } from '../../../data/utils/assetsName.js';
import { rgb数组转字符串 } from '../../../utils/color/convert.js';
import { diffColor } from '../../../utils/color/Kmeans.js';
import { LAYOUT_COLUMN, LAYOUT_ROW } from '../../utils/threhold.js';
import { 解析文件内部属性显示, 解析文件属性名标签 } from '../../../data/attributies/parseAttributies.js';
import { findTagsByFilePath } from '../../../data/tags.js';
import { 根据块ID创建protyle } from '../../../utils/siyuanUI/protyle/build.js';
import tagsCell from './assetCard/tagsCell.vue';
import colorPalletCell from './assetCard/paletteCell.vue'
import imageCell from './assetCard/imageCell.vue';
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
    displayMode.value === LAYOUT_ROW ? 新高度 = size.value : null
    // 使用回调函数来更新 Vue 的状态
    更新尺寸回调({ width: 卡片数据.width, height: cardRoot.value ? cardRoot.value.getBoundingClientRect().height : size.value })
}
const observer = new MutationObserver(() => {
    const newHeight = cardRoot.value ? cardRoot.value.getBoundingClientRect().height : size.value;
    emit('updateSize',{ width: size.value, height: newHeight });
});
onBeforeUnmount(() => {
        observer.disconnect();
    });
onMounted(
    ()=>{
        observer.observe(cardRoot.value, { childList: true, attributes: true, subtree: true });

    }
)

const props = defineProps(['cardData', 'size', 'filterColor', 'selected', 'tableViewAttributes', 'displayMode'])
const tableViewAttributes = toRef(props, 'tableViewAttributes')
const displayMode = toRef(props, 'displayMode')
const { cardData } = props
const filterColor = toRef(props, 'filterColor')
const size = toRef(props, 'size')
const emit = defineEmits()
const cardHeight = ref(cardData.width + 0)
const imageHeight = ref(cardData.width + 0)
const showIframe = ref(false)
const showImage = ref('')
const protyleContainer = ref(null)
const pallet = ref([])
const firstColorString = ref('var(--b3-theme-background-light)')
const similarColor = computed(() => {
    let item = pallet.value.find(item => item && filterColor.value && diffColor(filterColor.value, item.color))
    return item ? filterColor.value : ''
})

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
                if (displayMode === LAYOUT_ROW) {
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

import { 计算素材详情容器样式 } from './assetStyles.js';

const $计算素材详情容器样式 = computed(() => 计算素材详情容器样式(
    size.value, cardData
))


const $计算卡片内容样式 = computed(
    () => {
        return `width:100%;
    border:none;
    border-radius: ${cardData.width / 24}px;
    background-color:${firstColorString.value};
    display:flex;
    flex-direction:${displayMode.value}
    `
    }
)
const attributeCellWidth = () => {
    return displayMode.value === LAYOUT_ROW ? `${100 / (tableViewAttributes.value.length + 2)}%` : '100%'
}
const attributeCellHeight =
    () => {
        return displayMode.value === LAYOUT_ROW ? '' : '18px'
    }

const $计算卡片属性单元格样式 = computed(
    () => {
        return `border:1px solid var(--b3-theme-background-light);
                    padding:0px;
                    margin:0px;
                    overflow:hidden;
                    width:${attributeCellWidth()};
                    height:${attributeCellHeight()};
                    text-overflow:ellipsis;
                    white-space:nowrap;`
    }
)
</script>
<style scoped></style>