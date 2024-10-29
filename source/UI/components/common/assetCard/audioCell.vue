<template>
    <div>
        <div v-if="displayMode === LAYOUT_COLUMN" :style="$计算扩展名标签样式">
            {{ 计算素材类型角标(cardData.data) }}
        </div>
        <div class="alt-text" v-if="!audioLoaded" :style="$计算素材缩略图样式"></div>
        <audio v-bind="$attrs" class="thumbnail-card-audio ariaLabel" :aria-label="`${cardData.data.path}`" ref="audio"
            :style="audioLoaded ? {
                ...$计算素材缩略图样式, 
                height:''
                }: placeholderStyle" controls preload="metadata" draggable='true'
            @loadeddata="handleAudioLoad" :src="audioSrc"></audio>
    </div>
</template>

<script setup lang="jsx">
import { computed, toRef, defineEmits, ref, onMounted } from 'vue';
import { 计算素材缩略图样式, 计算扩展名标签样式 } from '../assetStyles.js';
import { LAYOUT_COLUMN } from '../../../utils/threhold.js';
import { getAssetItemColor } from '../../../../data/attributies/getAsyncAttributes.js';
import { rgb数组转字符串 } from '../../../../utils/color/convert.js';
import { 获取素材属性值, 计算素材类型角标 } from '../../../../data/attributies/parseAttributies.js';

const props = defineProps(['cardData', 'displayMode', 'attributeName', 'showAudio', 'showIframe', 'size', 'cellReady']);
const attributeName = toRef(props, 'attributeName');
const displayMode = toRef(props, 'displayMode');
const { cardData } = props;
const size = toRef(props, 'size');
const emit = defineEmits(['cell-ready']);
const audioLoaded = ref(false); // 新增状态变量
const audioPallet = ref([]);
const audioSrc = ref(''); // 初始音频源为空

onMounted(() => {
    // 异步获取素材属性值
    获取素材属性值(cardData.data, attributeName.value).then((src) => {
        audioSrc.value = src; // 更新音频的 src
    });

    getAssetItemColor(cardData.data).then(() => {
        audioPallet.value = cardData.data.colorPllet;
    });
});

const handleAudioLoad = (e) => {
    audioLoaded.value = true; // 音频加载后隐藏占位框
    emit('cell-ready', e);
};

const placeholderStyle = computed(() => ({
    width: size.value + 'px', // 设置占位框的宽度
    height: size.value + 'px', // 设置占位框的高度
    minWidth: size.value + 'px', // 设置占位框的宽度
    minHeight: size.value + 'px', // 设置占位框的高度
    maxWidth: size.value + 'px', // 设置占位框的宽度
    maxHeight: size.value + 'px', // 设置占位框的高度
    backgroundColor: !audioPallet.value[0] ? "" : rgb数组转字符串(audioPallet.value[0].color), // 设置占位框的背景色
}));

const $计算素材缩略图样式 = computed(() => 计算素材缩略图样式(size.value, cardData));
const $计算扩展名标签样式 = computed(() => 计算扩展名标签样式(displayMode.value, cardData, size.value));
</script>
