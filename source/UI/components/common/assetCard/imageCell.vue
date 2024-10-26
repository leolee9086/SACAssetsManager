<template>
    <div>
        <div v-if="displayMode === LAYOUT_COLUMN" :style="$计算扩展名标签样式">
            {{ 计算扩展名(cardData.data) }}
        </div>
        <div v-show="showIframe" ref="protyleContainer">
            <div></div>
        </div>
        <div class="alt-text" v-if="!showImage" :style="$计算素材缩略图样式"></div>
        <img v-bind="$attrs" class="thumbnail-card-image ariaLabel" :aria-label="`${cardData.data.path}`" ref="image"
            v-if="showImage" :style="$计算素材缩略图样式" loading="lazy" draggable='true'
            :onload="(e) => handleImageLoad(e)"
            :src="thumbnail.genHref(cardData.data.type, cardData.data.path, size, cardData.data)" />
    </div>
</template>

<script setup lang="jsx">
import { computed, toRef,defineEmits } from 'vue';
import { thumbnail } from '../../../../server/endPoints.js';
import { 计算素材缩略图样式, 计算扩展名标签样式 } from '../assetStyles.js';
import { LAYOUT_COLUMN } from '../../../utils/threhold.js';
import { 块类型语言对照表 } from '../../../../utils/siyuanData/block.js';
const props = defineProps(['cardData', 'displayMode', 'showImage', 'showIframe', 'size']);
const displayMode = toRef(props, 'displayMode');
const {cardData} = props
const size = toRef(props, 'size');
const emit = defineEmits(['image-loaded'])
function 计算扩展名(data) {
    if (data.type === 'note') {
        return `笔记:${块类型语言对照表[data.$meta.type] || data.$meta.type}`;
    }
    return displayMode.value === LAYOUT_COLUMN ? data.path.split('.').pop() : '';
}
const handleImageLoad=(e)=>{
    emit('image-loaded',e)
}
const $计算素材缩略图样式 = computed(() => 计算素材缩略图样式(size.value, cardData));
const $计算扩展名标签样式 = computed(() => 计算扩展名标签样式(displayMode.value, cardData, size.value));
</script>