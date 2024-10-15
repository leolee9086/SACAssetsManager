<template>
    <div>
        <div class="image-preview fn__flex">
            <div class="fn__space fn__flex-1"></div>
            <multiSrcImage :multiple="true" :src="imageSrc" alt="Image Preview"
                style="width: 256px;height:256px;object-fit: contain" />
            <div class="fn__space fn__flex-1"></div>
        </div>
        <div class="fn__flex">
            <div class="image-name">{{ name }}</div>
        </div>
        <div class="fn__flex">
            <button @click="previousImage">←</button>
            <button @click="nextImage">→</button>
        </div>
    </div>
</template>
<script setup>
import { ref } from 'vue'
import { watchStatu, 状态注册表 } from '../../../globalStatus/index.js';
import { getCommonThumbnailsFromAssets } from '../../utils/tumbnail.js';
import multiSrcImage from '../common/multiSrcImage.vue';
import { plugin } from '../../../pluginSymbolRegistry.js';

const imageSrc = ref([`/plugins/${plugin.name}/assets/wechatDonate.jpg`]);
const lastAssetPaths = ref([]);
const name = ref('无选择');
const currentIndex = ref(0);
const assetsData = ref([]);

const getNames = (asset) => {
  return asset.path.split('/').pop()
}

const getLabel = (assets) => {
  if (assets.length > 0) {
    if (assets.length <= 3) {
      name.value = assets.map(item => getNames(item)).join(', ');
    } else {
      name.value = `${getNames(assets[0])} 等 ${assets.length} 个文件`;
    }
  }
}

const updateImageSrc = () => {
  if (assetsData.value.length > 0) {
    imageSrc.value = getCommonThumbnailsFromAssets([assetsData.value[currentIndex.value]]);
  } else {
    imageSrc.value = [`/plugins/${plugin.name}/assets/wechatDonate.jpg`];
  }
}

const previousImage = () => {
  if (assetsData.value.length > 0) {
    currentIndex.value = (currentIndex.value - 1 + assetsData.value.length) % assetsData.value.length;
    updateImageSrc();
  }
}

const nextImage = () => {
  if (assetsData.value.length > 0) {
    currentIndex.value = (currentIndex.value + 1) % assetsData.value.length;
    updateImageSrc();
  }
}

watchStatu(状态注册表.选中的资源, async (newVal) => {
    const assets = Array.from(new Set(newVal))
    const assetPaths = assets.map(asset => asset.data.path);
    if (JSON.stringify(assetPaths) === JSON.stringify(lastAssetPaths.value)) {
        console.log('路径列表未变化，跳过查询');
        return
    }
    lastAssetPaths.value = assetPaths;
    assetsData.value = assets.map(item => item.data);
    currentIndex.value = 0;
    updateImageSrc();
    getLabel(assetsData.value);
})
</script>