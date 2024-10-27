<template>
    <div class="thumbnail-card-content" :style="$计算卡片内容样式" ref="cardRoot">
        <div :style="$计算素材详情容器样式" ref="detailContainer">
            <protyleCell :cardData="cardData" :displayMode="displayMode" :size="size" attributeName="noteID">
            </protyleCell>
            <imageCell :cardData="cardData" :displayMode="displayMode" :size="size" attributeName="thumbnailURL"
                @cellReady="(e) => handleImageLoad(e, cardData)" />
            <tagsCell :cardData="cardData" :width="attributeCellWidth()" :height="attributeCellHeight()"
                :displayMode="displayMode">
            </tagsCell>
            <colorPalletCell :cardData="cardData" :width="attributeCellWidth()" :height="attributeCellHeight()">
            </colorPalletCell>

            <template v-for="prop in tableViewAttributes">
                <div v-if="prop && tableViewAttributes.includes(prop)" :style="$计算卡片属性单元格样式" class="ariaLabel"
                    :aria-label="解析文件属性名标签(prop) + `(${prop})` + ':' + 解析文件内部属性显示(prop, cardData.data[prop])">
                    <span><strong>{{ 解析文件属性名标签(prop) }}:</strong></span>
                    <span v-if="cardData.data[prop] !== undefined">
                        {{ 解析文件内部属性显示(prop, cardData.data[prop]) }}
                    </span>
                    <span v-else style="color: yellow;">
                        无
                    </span>
                </div>
            </template>
        </div>
    </div>
</template>
<script setup lang="jsx">
import { ref, computed, toRef, onMounted, onBeforeUnmount, defineEmits, nextTick } from 'vue';
import { thumbnail } from '../../../server/endPoints.js';
import { rgb数组转字符串 } from '../../../utils/color/convert.js';
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

}

const observerCallCount = ref(0);
const heightMap = new Map();

const observer = new MutationObserver(() => {
    observerCallCount.value += 1;
    const newHeight = cardRoot.value ? cardRoot.value.getBoundingClientRect().height : size.value;

    // 更新 Map
    heightMap.set(observerCallCount.value, newHeight);
    if (heightMap.size > 1000) {
        const oldestKey = heightMap.keys().next().value;
        heightMap.delete(oldestKey);
    }

    // 检查是否有 100 个相同的高度
    const heightCounts = {};
    for (let height of heightMap.values()) {
        heightCounts[height] = (heightCounts[height] || 0) + 1;
        if (heightCounts[height] >= 100) {
            throw new Error('相同高度值触发次数超过 100 次', cardData.data.id);
        }
    }

    emit('updateSize', { width: size.value, height: newHeight });
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
const size = toRef(props, 'size')
const emit = defineEmits()
const showImage = ref('')
const pallet = ref([])
const firstColorString = ref('var(--b3-theme-background-light)')

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