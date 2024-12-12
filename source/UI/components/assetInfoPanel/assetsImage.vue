<template>
    <div>
        <div class="image-preview fn__flex" @wheel="handleWheel">
            <button class="arrow left" @click="previousImage"><svg>
                    <use xlink:href="#iconLeft"></use>
                </svg></button>
            <div class="fn__space fn__flex-1"></div>
            <multiSrcImage :multiple="true" :src="imageSrc" alt="Image Preview"
                style="width: 256px;height:256px;object-fit: contain" />
            <div class="fn__space fn__flex-1"></div>
            <button class="arrow right" @click="nextImage"><svg>
                    <use xlink:href="#iconRight"></use>
                </svg></button>
        </div>
        <div class="dots">
            <span v-for="(asset, index) in assetsData" :key="index" :class="{ active: index === currentIndex }"
                class="dot"></span>
        </div>
        <div class="fn__flex">
            <div class="image-name">{{ name }}</div>
        </div>
    </div>
</template>
<script setup>
import { ref } from 'vue'
import { watchStatu, 状态注册表 } from '../../../globalStatus/index.js';
import { plugin } from '../../../pluginSymbolRegistry.js';
import multiSrcImage from '../common/multiSrcImage.vue';
import { 函数工具 } from '../componentUtils.js';
import { getAssetsLabel, updateImageSource } from '../refactor.js';

const { debounce } = 函数工具
const handleWheel = debounce((event) => {
    if (event.deltaY < 0) {
        previousImage();
    } else {
        nextImage();
    }
}, 200);

const imageSrc = ref([`/plugins/${plugin.name}/assets/wechatDonate.jpg`]);
const lastAssetPaths = ref([]);
const name = ref('无选择');
const currentIndex = ref(0);
const assetsData = ref([]);

const updateImageSrc = () => {
    imageSrc.value = updateImageSource(assetsData.value, currentIndex.value, plugin.name);
}

const previousImage = () => {
    if (assetsData.value.length > 0) {
        currentIndex.value = (currentIndex.value - 1 + assetsData.value.length) % (assetsData.value.length);
        updateImageSrc();
    }
}
const nextImage = () => {
    if (assetsData.value.length > 0) {
        currentIndex.value = (currentIndex.value + 1) % (assetsData.value.length);
        updateImageSrc();
    }
}
watchStatu(状态注册表.选中的资源, async (newVal) => {
    const assets = Array.from(new Set(newVal))
    const assetPaths = assets.map(asset => asset?.data?.path);
    if(!assetPaths[0]){
        console.log('未获取到选中列表,跳过查询');
        return
    }
    if (JSON.stringify(assetPaths) === JSON.stringify(lastAssetPaths.value)) {
        console.log('路径列表未变化，跳过查询');
        return
    }
    lastAssetPaths.value = assetPaths;
    assetsData.value = assets.map(item => item.data);
    name.value = getAssetsLabel(assetsData.value);
    assetsData.value = [assetsData.value].concat(assetsData.value)
    currentIndex.value = 0;
    updateImageSrc();
})
</script>
<style scoped>
.image-preview {
    position: relative;
}

.arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
}

.arrow.left {
    left: 0;
    background-color: var(--b3-theme-primary-lightest);
    /* 浅灰色背景 */
    color: #fff;
    /* 白色箭头 */
    border-radius: 50%;
    /* 使背景成为圆形 */
    width: 40px;
    /* 圆圈的宽度 */
    height: 40px;
    /* 圆圈的高度 */
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
    /* 添加阴影效果 */
}

.arrow.right {
    right: 0;
    background-color: var(--b3-theme-primary-lightest);
    /* 浅灰色背景 */
    color: #fff;
    /* 白色箭头 */
    border-radius: 50%;
    /* 使背景成为圆形 */
    width: 40px;
    /* 圆圈的宽度 */
    height: 40px;
    /* 圆圈的高度 */
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
    /* 添加阴影效果 */
}

.dots {
    display: flex;
    justify-content: center;
    margin-top: 10px;
}

.dot {
    height: 10px;
    width: 10px;
    margin: 0 5px;
    background-color: #bbb;
    border-radius: 50%;
    display: inline-block;
}

.dot.active {
    background-color: #717171;
}
</style>