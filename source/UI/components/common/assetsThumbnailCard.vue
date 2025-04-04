<template>
    <div class="thumbnail-card-content" :style="$计算卡片内容样式" ref="cardRoot">
        <div :style="$计算素材详情容器样式" ref="detailContainer">
            <mainPreviewCell :cardData="cardData" :displayMode="displayMode" :size="size" />
            <tagsCell :cardData="cardData" :width="attributeCellWidth()" :height="attributeCellHeight()"
                :displayMode="displayMode">
            </tagsCell>
            <colorPalletCell :cardData="cardData" :width="attributeCellWidth()" :height="attributeCellHeight()">
            </colorPalletCell>

            <template v-for="prop in tableViewAttributes">
                <div v-if="prop && tableViewAttributes.includes(prop)" :style="$计算卡片属性单元格样式" class="ariaLabel"
                    :aria-label="解析文件属性名标签(prop) + `(${prop})` + ':' + 解析文件内部属性显示(prop, cardData.data[prop])">
                    <span><strong>{{ 解析文件属性名标签(prop) }}:</strong></span>
                    <template v-if="resolvedValues[prop] !== UNDEFINED_MARKER">
                        <span v-if="cardData.data[prop] !== undefined && resolvedValues[prop] !== undefined">
                            {{ 解析文件内部属性显示(prop, resolvedValues[prop]) }}
                        </span>
                        <span v-else="cardData.data[prop] !== undefined">
                            加载中...
                        </span>
                    </template>
                    <span v-else style="color: var(--b3-card-warning-background);">
                        无
                    </span>
                </div>
            </template>
        </div>
    </div>
</template>
<script setup lang="jsx">
import { ref, computed, toRef, onMounted, onBeforeUnmount, defineEmits, nextTick, watch } from 'vue';
import { thumbnail } from '../../../server/endPoints.js';
import { rgb数组转字符串 } from '../../../../src/utils/color/convert.js';
import { LAYOUT_COLUMN, LAYOUT_ROW } from '../../utils/threhold.js';
import { 获取素材属性值, UNDEFINED_MARKER, 解析文件内部属性显示, 解析文件属性名标签 } from '../../../data/attributies/parseAttributies.js';
import { findTagsByFilePath } from '../../../data/tags.js';
import tagsCell from './assetCard/tagsCell.vue';
import colorPalletCell from './assetCard/paletteCell.vue'
import mainPreviewCell from './assetCard/mainPreviewCell.vue';
const props = defineProps(['cardData', 'size',  'tableViewAttributes', 'displayMode'])
const tableViewAttributes = toRef(props, 'tableViewAttributes')
const displayMode = toRef(props, 'displayMode')
const { cardData } = props
const size = toRef(props, 'size')
const emit = defineEmits()
const showImage = ref('')
const pallet = ref([])
const firstColorString = ref('var(--b3-theme-background-light)')

const cardRoot = ref(null)


// 计算需要获取值的属性
const resolvedValues = ref({});

const attributesToFetch = computed(() => {
    return tableViewAttributes.value.filter(prop => cardData.data[prop] !== undefined && resolvedValues.value[prop] === undefined);
});

// 监听需要获取值的属性变化
watch(attributesToFetch, async (newProps) => {
    for (const prop of newProps) {
        resolvedValues.value[prop] = await 获取素材属性值(cardData.data, prop);
    }
}, { immediate: true });



const observerCallCount = ref(0);
let heightCounts = {};
let consecutiveSuccessCount = 0;
let newHeight
let sizeidleCallbackId
const observer = new ResizeObserver(entries => {
    for (let entry of entries) {
        observerCallCount.value += 1;
        newHeight = entry.contentRect.height;
        // 更新 heightCounts
        heightCounts[newHeight] = (heightCounts[newHeight] || 0) + 1;

        // 检查 newHeight 是否触发超过 100 次
        if (heightCounts[newHeight] >= 100) {
            console.warn('相同高度值触发次数超过 100 次', cardData.data.id);
            return;
        }
        // 如果成功更新大小，增加连续成功计数
        consecutiveSuccessCount += 1;
        // 检查连续成功次数是否超过三次
        if (consecutiveSuccessCount > 3) {
            console.log('连续成功触发超过三次，清空触发记录');
            heightCounts = {}; // 清空触发记录
            consecutiveSuccessCount = 0; // 重置连续成功计数
        }
        // 使用闲时回调循环更新大小
        let interval = 15; // 初始间隔时间
        const updateSize = () => {
            if (cardData.height !== newHeight && Math.abs(cardData.height - newHeight) >= 1) {

                        emit('updateSize', {
                            width: size.value, height: newHeight
                        })
                    }
                interval *= 2; // 指数级增长间隔时间
                sizeidleCallbackId = requestIdleCallback(updateSize, { timeout: interval });
        };
        updateSize()}
    });

onBeforeUnmount(() => {
    observer.disconnect();
    sizeidleCallbackId && cancelIdleCallback(sizeidleCallbackId);

});

onMounted(() => {
    observer.observe(cardRoot.value);
});


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
                    white-space:nowrap;
                    background-color:var(--b3-theme-background)
                    `
    }
)
</script>
<style scoped></style>