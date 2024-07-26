<template>
    <div class="thumbnail-card-content" :style="`width:100%;
    border:none;
    border-radius: ${cardData.width / 24}px;
    height:${cardHeight}px;
    background-color:var(--b3-theme-background-light);
    `">
    <div :style="`
    position:absolute;
    top: ${cardData.width / 24}px;
    left: ${cardData.width / 24}px;
    max-width: ${cardData.width / 2}px;
    max-height: 1.5em;
    border-radius: 5px;
    background-color:var(--b3-theme-background);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;height:36px;background-color:none`">
            {{ cardData.data.path.split('.').pop() }}
        </div>
        <img v-bind="$attrs" ref="image" v-if="showImage" :style="`width:100%;border:none; 
        border-radius: ${cardData.width / 24}px ${cardData.width / 24}px 0 0;height=${imageHeight}px;`"
        loading="lazy"
        draggable ='true'
        :onload="(e)=>更新图片尺寸(e, cardData)"
        :src="!cardData.data.type?`${serverHost}/thumbnail/?path=${encodeURIComponent(cardData.data.path)}`:`${serverHost}/thumbnail/?localPath=${encodeURIComponent(cardData.data.path)}`">
        <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;height:36px;background-color:none">
            {{ cleanAssetPath(cardData.data.path) }}
        </div>
    </div>
</template>
<script setup>
import { ref,toRef,onMounted, onBeforeUnmount  , defineEmits,watch } from 'vue';
import { cleanAssetPath } from '../../../data/utils/assetsName.js';
import {plugin} from 'runtime'
const props= defineProps(['cardData','size'])
const  { cardData } = props
const size= toRef(props,'size')
const emit = defineEmits()
const cardHeight = ref(cardData.width+0)
const imageHeight = ref(cardData.width+0)
const image= ref(null)
const showImage=ref('')
const serverHost=`${window.location.protocol}//${window.location.hostname}:${plugin.http服务端口号}`
let idleCallbackId;
let fn = () => showImage.value = true;

onMounted(() => {
    idleCallbackId = requestIdleCallback(fn, { timeout : 300 });
});

onBeforeUnmount(() => {
    cancelIdleCallback(idleCallbackId);
});
function 更新图片尺寸(e, cardData) {
    const previewer = e.target
    const dimensions = {
        width: previewer.naturalWidth,
        height: previewer.naturalHeight
    };
    const 缩放因子 = dimensions.width / size.value
    const 新高度 = dimensions.height / 缩放因子
    cardHeight.value = 新高度 + 36
    imageHeight.value=新高度
    emit('updateSize', { width: cardData.width, height: 新高度 + 36 })
}
</script>
<style scoped>

</style>