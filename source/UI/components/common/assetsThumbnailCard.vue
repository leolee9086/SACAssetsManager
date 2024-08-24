<template>
    <div class="thumbnail-card-content" :style="`width:100%;
    border:none;
    border-radius: ${cardData.width / 24}px;
    height:${cardHeight}px;
    background-color:${firstColorString};
    `">
        <div :style="`
    position:absolute;
    top: ${cardData.width / 24}px;
    left: ${cardData.width / 24}px;
    max-width: ${cardData.width}px;
    max-height: 1.5em;
    border-radius: 5px;
        background-color:var(--b3-theme-background);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;height:36px;`">
            {{ cardData.data.path.split('.').pop() }}

        </div>
        <div v-show="showIframe" ref="protyleContainer">
            <div></div>
        </div>
        <img v-bind="$attrs" ref="image" v-if="showImage" :style="`width:100%;border:none; 
        border-radius: ${cardData.width / 24}px ${cardData.width / 24}px 0 0;height=${imageHeight}px;`" loading="lazy"
            draggable='true' :onload="(e) => 更新图片尺寸(e, cardData)"
            :src="thumbnail.genHref(cardData.data.type, cardData.data.path)" />
        <div style="position:absolute;bottom:0;white-space: nowrap; overflow: hidden;width: 100%; text-overflow: ellipsis;height:36px;background-color:var(--b3-theme-background)">
            {{ cleanAssetPath(cardData.data.path) }}
            <div>
                <template v-for="colorItem in pallet">
                    <div
                        :style="{ backgroundColor: `rgb(${colorItem.color[0]},${colorItem.color[1]},${colorItem.color[2]})`, height: '0.8em', width: '0.8em', display: 'inline-block', margin: '0 2px' }">
                    </div>
                </template>
            </div>

        </div>
    </div>
</template>
<script setup>
import { ref, computed, toRef, onMounted, onBeforeUnmount, defineEmits, nextTick } from 'vue';
import { thumbnail } from '../../../server/endPoints.js';
import { cleanAssetPath } from '../../../data/utils/assetsName.js';
import { plugin } from 'runtime'
import { clientApi } from '../../../asyncModules.js';
import { rgba数组转字符串, rgb数组转字符串 } from '../../../utils/color/convert.js';
const props = defineProps(['cardData', 'size'])
const { cardData } = props
const size = toRef(props, 'size')
const emit = defineEmits()
const cardHeight = ref(cardData.width + 0)
const imageHeight = ref(cardData.width + 0)
const image = ref(null)
const showIframe = ref(false)
const showImage = ref('')
const protyleContainer = ref(null)
const pallet = ref([])
const firstColorString = ref('var(--b3-theme-background-light)')
let idleCallbackId;
let fn = () => {
    showImage.value = true
    if (cardData.data.type === 'note' && cardData.width > 300) {
        showIframe.value = true
        nextTick(() => {
            const protyle = buildCardProtyle(protyleContainer.value.firstElementChild)
            showImage.value = false
            const resizeObserver = new ResizeObserver((entries) => {
                cardHeight.value = protyle.protyle.contentElement.scrollHeight + 36 + 18
                emit('updateSize', { width: cardData.width, height: cardHeight.value })
            });
            resizeObserver.observe(protyleContainer.value);
        })
    }
}
onMounted(() => {
    fetch(thumbnail.getColor(cardData.data.type, cardData.data.path)).then(
        res => {
            return res.json()
        }
    ).then(
        data => {
            pallet.value = data.sort((a, b) => b.count - a.count)
            firstColorString.value = rgb数组转字符串(pallet.value[0].color)
            emit('palletAdded', pallet.value)
        }
    )
    idleCallbackId = requestIdleCallback(fn, { timeout: 300 });
});
onBeforeUnmount(() => {
    cancelIdleCallback(idleCallbackId);
});
const buildCardProtyle = (element) => {
    return new clientApi.Protyle(
        plugin.app,
        element,
        {
            blockId: cardData.data.id,
            render: {
                breadcrumb: true,
                background: true,
                title: true
            }
        }
    )
}

function 更新图片尺寸(e, cardData) {
    const previewer = e.target
    const dimensions = {
        width: previewer.naturalWidth,
        height: previewer.naturalHeight
    };
    const 缩放因子 = dimensions.width / size.value
    const 新高度 = dimensions.height / 缩放因子
    cardHeight.value = 新高度 + 36
    imageHeight.value = 新高度
    emit('updateSize', { width: cardData.width, height: 新高度 + 36 })
}
</script>
<style scoped></style>