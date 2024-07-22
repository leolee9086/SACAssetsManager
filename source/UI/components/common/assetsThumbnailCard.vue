<template>
    <div :style="`width:100%;
    border:none;
    border-radius: ${cardData.width / 24}px;
    height:${cardHeight - 10}px;
    background-color:var(--b3-theme-background-light);
    margin-bottom:5px
    `">
        <img v-bind="$attrs" :style="`width:100%;border:none; 
        border-radius: ${cardData.width / 24}px ${cardData.width / 24}px 0 0;px;`"
        loading="eager"
        :onload="(e) => 更新图片尺寸(e, cardData)"
            :src="`http://127.0.0.1/thumbnail/?path=${encodeURIComponent(cardData.asset.path)}`">
        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">

            {{ cardData.asset.path }}
        </div>
    </div>
</template>
<script setup>
import { ref, computed, defineEmits } from 'vue';
const { cardData } = defineProps(['cardData'])
const emit = defineEmits()
const cardHeight = ref(cardData.width)
function 更新图片尺寸(e, cardData) {
    const previewer = e.target
    const dimensions = {
        width: previewer.naturalWidth,
        height: previewer.naturalHeight
    };
    const 缩放因子 = dimensions.width / cardData.width
    const 新高度 = dimensions.height / 缩放因子
    cardHeight.value = 新高度 + 36
    emit('updateSize', { width: cardData.width, height: 新高度 + 36 })
}
</script>