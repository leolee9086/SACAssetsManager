<template>
    <div>
        <div v-if="displayMode === LAYOUT_COLUMN" :style="$计算扩展名标签样式">
            {{ 计算素材类型角标(cardData.data) }}
        </div>
        <div class="alt-text" v-if="!imageLoaded" :style="$计算素材缩略图样式"></div>
        <ImageComparison v-bind="$attrs" :key="cardData.id" class="thumbnail-card-lut ariaLabel" :aria-label="`${cardData.data.path}`"
            ref="lutPreview" :style="imageLoaded ? $计算素材缩略图样式 : placeholderStyle" :originalImage="imageSrc"
            :processedImage="processedImageSrc||imageSrc" @load="handleImageLoad" />
        <div class="control-item" @mousemove.stop @mousedown.stop @click.stop>
            <label>强度</label>
            <input type="range" v-model="intensity" min="0" max="1" step="0.1" />
            <button class="upload-btn" @click="handleFileUpload">
                更换示意图
            </button>
        </div>
    </div>
</template>

<script setup lang="jsx">
import { computed, toRef, ref, onMounted, watch } from 'vue';
import { 计算素材缩略图样式, 计算扩展名标签样式 } from '../assetStyles.js';
import { LAYOUT_COLUMN } from '../../../utils/threhold.js';
import { getAssetItemColor } from '../../../../data/attributies/getAsyncAttributes.js';
import { rgb数组转字符串 } from '../../../../utils/color/convert.js';
import { 获取素材属性值, 计算素材类型角标 } from '../../../../data/attributies/parseAttributies.js';
import ImageComparison from '../../../components/editors/ImageComparison.vue?';
import { processImageWithLUTFile } from '../../../../utils/Lut/lutProcessor.js';

async function handleFileUpload() {
    const { dialog } = window.require('@electron/remote');

    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
        ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        imageSrc.value = filePath;
      
    }
}

const props = defineProps(['cardData', 'displayMode', 'attributeName', 'showImage', 'showIframe', 'size', 'cellReady']);
const attributeName = toRef(props, 'attributeName');
const displayMode = toRef(props, 'displayMode');
const { cardData } = props;
const size = toRef(props, 'size');
const emit = defineEmits(['cell-ready']);

const imageLoaded = ref(false);
const imagePallet = ref([]);
const imageSrc = ref('/plugins/SACAssetsManager/assets/pexels-julius-silver-240301-753339_sac_80.jpg');
const processedImageSrc = ref('');
const lutPath = ref("")
const intensity = ref(0.1)
// 监听LUT路径变化，重新处理图片
watch([()=>imageSrc.value,() => lutPath.value, () => intensity.value], async () => {
    if (imageSrc.value && lutPath.value) {
        processedImageSrc.value=imageSrc.value
        await applyLUT();
    }
});
onMounted(
    () => {
        // 异步获取素材属性值
        获取素材属性值(cardData.data, attributeName.value).then((src) => {
            lutPath.value = src; // 更新图片的 src
        });
 
    }
)

async function applyLUT() {
    try {
        const result = await processImageWithLUTFile(

            imageSrc.value,
            lutPath.value,

            intensity.value || 0.618
        );
        console.log(result)
        if (result.success) {
            processedImageSrc.value = result.blobURL;
        }
    } catch (error) {
        console.error('LUT处理失败:', error);
    }
}


const handleImageLoad = (e) => {
    imageLoaded.value = true;
    emit('cell-ready', e);
};

const placeholderStyle = computed(() => ({
    width: size.value + 'px',
    height: size.value + 'px',
    minWidth: size.value + 'px',
    minHeight: size.value + 'px',
    maxWidth: size.value + 'px',
    maxHeight: size.value + 'px',
    backgroundColor: !imagePallet.value[0] ? "" : rgb数组转字符串(imagePallet.value[0].color),
}));

const $计算素材缩略图样式 = computed(() => 计算素材缩略图样式(size.value, cardData));
const $计算扩展名标签样式 = computed(() => 计算扩展名标签样式(displayMode.value, cardData, size.value));
</script>

<style scoped>
.thumbnail-card-lut {
    width: 100%;
    height: 100%;
    object-fit: contain;
}
</style>
