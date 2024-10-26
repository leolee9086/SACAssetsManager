<template>
    <div class="thumbnail-card-content" :style="$计算卡片内容样式" ref="cardRoot">
        <div :style="$计算素材详情容器样式" ref="detailContainer" >
            <protyleCell :cardData="cardData" :displayMode="displayMode" :size="size" attributeName="thumbnailURL"></protyleCell>
            <imageCell :cardData="cardData" :displayMode="displayMode" :size="size" attributeName="thumbnailURL"
                @imageLoaded="(e) => handleImageLoad(e, cardData)" />
                <template v-for="prop in tableViewAttributes">
                    <div v-if="prop && tableViewAttributes.includes(prop)" :style="$计算卡片属性单元格样式" class="ariaLabel"
                        :aria-label="解析文件属性名标签(prop) + `(${prop})` + ':' + 解析文件内部属性显示(prop, cardData.data[prop])">
                        {{ 解析文件内部属性显示(prop, cardData.data[prop]) }}
                    </div>
                </template>
                <tagsCell :cardData="cardData" :width="attributeCellWidth()" :height="attributeCellHeight()"
                    :displayMode="displayMode">
                </tagsCell>
                <colorPalletCell :cardData="cardData" :width="attributeCellWidth()" :height="attributeCellHeight()">
                </colorPalletCell>
        </div>
    </div>
</template>
<script setup lang="jsx">
import { ref, computed, toRef, onMounted, onBeforeUnmount, defineEmits, nextTick } from 'vue';
import { thumbnail } from '../../../server/endPoints.js';
import { rgb数组转字符串 } from '../../../utils/color/convert.js';
import { diffColor } from '../../../utils/color/Kmeans.js';
import { LAYOUT_COLUMN, LAYOUT_ROW } from '../../utils/threhold.js';
import { 解析文件内部属性显示, 解析文件属性名标签 } from '../../../data/attributies/parseAttributies.js';
import { findTagsByFilePath } from '../../../data/tags.js';
import tagsCell from './assetCard/tagsCell.vue';
import colorPalletCell from './assetCard/paletteCell.vue'
import imageCell from './assetCard/imageCell.vue';
import protyleCell from './assetCard/protyleCell.vue'
const cardRoot = ref(null)

/**
 * 计算显示模式，当小于表格视图阈值时，切换为表格显示
 */
function handleImageLoad(e, cardData) {
 /*   更新图片尺寸(e, cardData, size.value, ({ width, height }) => {
        cardHeight.value = height;
        imageHeight.value = height;
        emit('updateSize', { width, height });
    });*/
}

const observerCallCount = ref(0);
const heightMap = new Map();
const observer = new MutationObserver(() => {
    observerCallCount.value += 1;
    const newHeight = cardRoot.value ? cardRoot.value.getBoundingClientRect().height : (size.value);
 
    if(!newHeight){
        return
    }
    if(cardData&&cardData.height!==newHeight){
        emit('updateSize', { width: size.value, height: newHeight });

    }
    // 检查新高度是否与上一个高度不同
    const lastHeight = heightMap.get(observerCallCount.value - 1)||size.value;
    if (newHeight !== lastHeight&&newHeight) {
        // 更新 Map
        heightMap.set(observerCallCount.value, newHeight);
        if (heightMap.size > 100) {
            const oldestKey = heightMap.keys().next().value;
            heightMap.delete(oldestKey);
        }

        // 检查是否有 100 个相同的高度
        const heightCounts = {};
        for (let height of heightMap.values()) {
            heightCounts[height] = (heightCounts[height] || 0) + 1;
            if (heightCounts[height] >= 10) {
                console.warn(`相同高度值触发次数超过 10 次 ,${cardData.data.id},${lastHeight},${newHeight},${height},${heightCounts[height]}`);
                return
            }
        }

        emit('updateSize', { width: size.value, height: newHeight });
    }
});
onBeforeUnmount(() => {
    observer.disconnect();
});
onMounted(
    () => {
        observer.observe(cardRoot.value, { childList: true, attributes: true, subtree: true });

    }
)

const props = defineProps(['cardData', 'size', 'filterColor', 'selected', 'tableViewAttributes', 'displayMode'])
const tableViewAttributes = toRef(props, 'tableViewAttributes')
const displayMode = toRef(props, 'displayMode')
const { cardData } = props
console.log(cardData)
const filterColor = toRef(props, 'filterColor')
const size = toRef(props, 'size')
const emit = defineEmits()
const cardHeight = ref(cardData.width + 0)
const imageHeight = ref(cardData.width + 0)
const showCells = ref(false)
const pallet = ref([])
const firstColorString = ref('var(--b3-theme-background)')
const similarColor = computed(() => {
    let item = pallet.value.find(item => item && filterColor.value && diffColor(filterColor.value, item.color))
    return item ? filterColor.value : ''
})

let idleCallbackId;
const tags = ref([])
let fn =  () => {
        showCells.value=true
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
    if (cardData.data && cardData.data.path) {
        tags.value = findTagsByFilePath(cardData.data.path)
    }
}
onMounted(() => {
    idleCallbackId = requestIdleCallback(fn, { timeout: 15})
});
onBeforeUnmount(() => {
    cancelIdleCallback(idleCallbackId);
  
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
    background-color:${(cardData.data.colorPllet&&cardData.data.colorPllet[0]&&rgb数组转字符串(cardData.data.colorPllet[0].color))||firstColorString.value||'white'};
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
                white-space:nowrap;
                background-color:var(--b3-theme-background)
                `
    }
)
</script>
<style scoped></style>