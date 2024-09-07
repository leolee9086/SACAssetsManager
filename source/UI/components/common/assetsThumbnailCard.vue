<template>
    <div 
    
    class="thumbnail-card-content" :style="`width:100%;
    border:none;
    border-radius: ${cardData.width / 24}px;
    height:${size < 200 ? size : cardHeight}px;
    background-color:${firstColorString};
    display:${size < 200 ? 'flex' : 'inline-block'};
    `">
        <div v-if="size > 200" :style="`
    position:${size > 200 ? 'absolute' : 'relative'};
    top: ${cardData.width / 24}px;
    left: ${cardData.width / 24}px;
    max-width: ${genMaxWidth()};
    max-height: 1.5em;
    border-radius: 5px;
        background-color:var(--b3-theme-background);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;height:36px;`">
            {{ size > 200 ? cardData.data.path.split('.').pop() : '' }}

        </div>
        <div v-show="showIframe" ref="protyleContainer">
            <div></div>
        </div>
        <div class="alt-text" v-if="!showImage" :style="$计算素材缩略图样式">

        </div>
        <img v-bind="$attrs" 
        class="thumbnail-card-image ariaLabel"
        :aria-label="`${cardData.data.path}`"
        ref="image" 
        v-if="showImage" 
        :style="$计算素材缩略图样式" 
        loading="lazy" 
        draggable='true'
            :onload="(e) => 更新图片尺寸(e, cardData)"
            :src="thumbnail.genHref(cardData.data.type, cardData.data.path, size)" />
        <div :style="$计算素材详情容器样式">
            {{ size > 200 ? cleanAssetPath(cardData.data.path) : '' }}
            <div v-if="size < 200" :style="`background-color:var(--b3-theme-background);
                color:${similarColor ? rgb数组转字符串(similarColor) : ''};
                height:${size}px;
                display:flex;
                `
                ">
                <template v-for="prop in getProps(cardData.data)">
                    <div v-if="prop&&(文件系统内部属性表[prop]?文件系统内部属性表[prop].show:true)" 
                    style="border:1px solid var(--b3-theme-background-light);
                    padding:0px;
                    margin:0px;
                    width:150px;
                    overflow:hidden;
                    text-overflow:ellipsis;
                    white-space:nowrap;
                    "
                    class="ariaLabel"
                    :aria-label="`${文件系统内部属性表[prop]&&文件系统内部属性表[prop].label?文件系统内部属性表[prop].label:prop}(${prop}):${文件系统内部属性表[prop]&&文件系统内部属性表[prop].parser?文件系统内部属性表[prop].parser(cardData.data[prop]):cardData.data[prop]}`"
                    >
                        {{ 解析文件内部属性显示(prop,cardData.data[prop])}}
                    </div>
                </template>
            </div>
            <div>
                <template v-for="colorItem in pallet">
                    <div @click="() => 打开颜色查找面板(colorItem.color)"
                        :style="计算素材颜色按钮样式(colorItem.color)">
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
import { clientApi } from '../../../asyncModules.js';
import { rgb数组转字符串 } from '../../../utils/color/convert.js';
import { diffColor } from '../../../server/processors/color/Kmeans.js';
import { plugin } from 'runtime'
import { 文件系统内部属性表,解析文件内部属性显示 } from '../../../data/attributies/parseAttributies.js';
const props = defineProps(['cardData', 'size', 'filterColor'])
const { cardData } = props
const filterColor = toRef(props, 'filterColor')
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
const similarColor = computed(() => {
    let item = pallet.value.find(item => item && filterColor.value && diffColor(filterColor.value, item.color))
    return item ? filterColor.value : ''
})

function getProps(data) {
    return Object.keys(data).filter(key => key !== 'id'  && key !== 'type' && key !== 'index' && key !== 'indexInColumn' && key !== 'width' && key !== 'height')
}
const genMaxWidth = () => {
    if (size.value < 200) {
        return `100%`
    } else {
        return `${size.value}px`
    }
}
function 打开颜色查找面板(color) {
    plugin.eventBus.emit('click-galleryColor', color)
}
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
                if (size.value < 200) {
                    cardHeight.value = protyle.protyle.contentElement.scrollHeight

                }
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
    if (size.value < 200) {
        cardHeight.value = size.value
    } else {
        cardHeight.value = 新高度 + 36
    }
    imageHeight.value = 新高度
    emit('updateSize', { width: cardData.width, height: cardHeight.value })
}

import { 计算素材缩略图样式, 计算素材详情容器样式, 计算素材颜色按钮样式 } from './assetStyles.js';
const $计算素材缩略图样式 = computed(() => 计算素材缩略图样式(
    size.value, imageHeight.value, cardData
))
const $计算素材详情容器样式 = computed(() => 计算素材详情容器样式(
    size.value, cardHeight.value
))
</script>
<style scoped></style>