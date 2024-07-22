<template>
    <div class="thumbnail-card" :style="`width:100%;
    border:none;
    border-radius: ${cardData.width / 24}px;
    height:${cardHeight}px;
    background-color:var(--b3-theme-background-light);
    `">
        <img v-bind="$attrs" :style="`width:100%;border:none; 
        border-radius: ${cardData.width / 24}px ${cardData.width / 24}px 0 0;height=${imageHeight}px;`"
        loading="lazy"
        :onload="(e)=>更新图片尺寸(e, cardData)"
            :src="`http://127.0.0.1/thumbnail/?path=${encodeURIComponent(cardData.data.path)}`">
        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;height:36px;">
            {{ cardData.data.path }}
        </div>
    </div>
</template>
<script setup>
import { ref, computed, defineEmits, } from 'vue';
const { cardData,size } = defineProps(['cardData'])
const emit = defineEmits()
const cardHeight = ref(cardData.width+0)
const imageHeight = ref(cardData.width+0)
function 更新图片尺寸(e, cardData) {
    const previewer = e.target
    const dimensions = {
        width: previewer.naturalWidth,
        height: previewer.naturalHeight
    };
    const 缩放因子 = dimensions.width / cardData.width
    const 新高度 = dimensions.height / 缩放因子
    cardHeight.value = 新高度 + 36
    imageHeight.value=新高度
    emit('updateSize', { width: cardData.width, height: 新高度 + 36 })
}
</script>
<style scoped>

</style>