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
             :style="imageLoaded?$计算素材缩略图样式:placeholderStyle" loading="lazy" draggable='true'
            :onload="(e) => handleImageLoad(e)"
            :src="thumbnail.genHref(cardData.data.type, cardData.data.path, size, cardData.data)" />
    </div>
</template>

<script setup lang="jsx">
import { computed, toRef,defineEmits,ref,onMounted } from 'vue';
import { thumbnail } from '../../../../server/endPoints.js';
import { 计算素材缩略图样式, 计算扩展名标签样式 } from '../assetStyles.js';
import { LAYOUT_COLUMN } from '../../../utils/threhold.js';
import { 块类型语言对照表 } from '../../../../utils/siyuanData/block.js';
import { getAssetItemColor } from '../../../../data/attributies/getAsyncAttributes.js';
import { rgb数组转字符串 } from '../../../../utils/color/convert.js';
const props = defineProps(['cardData', 'displayMode', 'showImage', 'showIframe', 'size']);
const displayMode = toRef(props, 'displayMode');
const {cardData} = props
const size = toRef(props, 'size');
const emit = defineEmits(['image-loaded'])
const imageLoaded = ref(false); // 新增状态变量
const imagePallet = ref([])
onMounted(
    () => {
       getAssetItemColor(cardData.data).then(
            ()=>{
                imagePallet.value=cardData.data.colorPllet
            })
    }
)
function 计算扩展名(data) {
    if (data.type === 'note') {
        return `笔记:${块类型语言对照表[data.$meta.type] || data.$meta.type}`;
    }
    return displayMode.value === LAYOUT_COLUMN ? data.path.split('.').pop() : '';
}
const handleImageLoad = (e) => {
    imageLoaded.value = true; // 图片加载后隐藏占位框
    emit('image-loaded', e);
}
const placeholderStyle = computed(() => ({
    width: size.value+'px', // 设置占位框的宽度
    height: size.value+'px', // 设置占位框的高度
    backgroundColor: !imagePallet.value[0]?"":rgb数组转字符串(imagePallet.value[0].color), // 设置占位框的背景色
    display: imageLoaded.value ? 'none' : 'block' // 根据图片加载状态显示或隐藏
}));
const $计算素材缩略图样式 = computed(() => 计算素材缩略图样式(size.value, cardData));
const $计算扩展名标签样式 = computed(() => 计算扩展名标签样式(displayMode.value, cardData, size.value));
</script>