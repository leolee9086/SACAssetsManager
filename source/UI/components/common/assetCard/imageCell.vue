<template>
    <div>
        <div v-if="displayMode === LAYOUT_COLUMN" :style="$计算扩展名标签样式">
            {{ 计算素材类型角标(cardData.data) }}
        </div>
        <div class="alt-text" v-if="!imageLoaded" :style="$计算素材缩略图样式"></div>
        <img v-bind="$attrs" class="thumbnail-card-image ariaLabel" :aria-label="`${cardData.data.path}`" ref="image"
             :style="imageLoaded?$计算素材缩略图样式:placeholderStyle" loading="lazy" draggable='true'
            :onload="(e) => handleImageLoad(e)"
            :src="获取素材属性值(cardData.data,attributeName)" />
    </div>
</template>

<script setup lang="jsx">
import { computed, toRef,defineEmits,ref,onMounted } from 'vue';
import { 计算素材缩略图样式, 计算扩展名标签样式 } from '../assetStyles.js';
import { LAYOUT_COLUMN } from '../../../utils/threhold.js';
import { getAssetItemColor } from '../../../../data/attributies/getAsyncAttributes.js';
import { rgb数组转字符串 } from '../../../../utils/color/convert.js';
import { 获取素材属性值, 计算素材类型角标 } from '../../../../data/attributies/parseAttributies.js';
const props = defineProps(['cardData', 'displayMode','attributeName', 'showImage', 'showIframe', 'size']);
const attributeName =toRef(props,'attributeName')
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

const handleImageLoad = (e) => {
    imageLoaded.value = true; // 图片加载后隐藏占位框
    emit('image-loaded', e);
}
const placeholderStyle = computed(() => ({
    width: size.value+'px', // 设置占位框的宽度
    height: size.value+'px', // 设置占位框的高度
    minWidth: size.value+'px', // 设置占位框的宽度
    minHeight: size.value+'px', // 设置占位框的高度
    maxWidth: size.value+'px', // 设置占位框的宽度
    maxHeight: size.value+'px', // 设置占位框的高度
    backgroundColor: !imagePallet.value[0]?"":rgb数组转字符串(imagePallet.value[0].color), // 设置占位框的背景色
}));
const $计算素材缩略图样式 = computed(() => 计算素材缩略图样式(size.value, cardData));
const $计算扩展名标签样式 = computed(() => 计算扩展名标签样式(displayMode.value, cardData, size.value));
</script>