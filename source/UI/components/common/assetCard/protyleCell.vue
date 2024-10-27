<template>
    <div  ref="protyleContainer">
        <div></div>
    </div>
</template>
<script setup lang="jsx">
import { ref ,onMounted,nextTick,toRef} from 'vue';
import { 根据块ID创建protyle } from '../../../../utils/siyuanUI/protyle/build.js';
import { onUnmounted } from '../../../../../static/vue.esm-browser.js';
import { 获取素材属性值 } from '../../../../data/attributies/parseAttributies.js';
const protyleContainer = ref(null)
const props = defineProps(['cardData', 'displayMode','attributeName', 'showImage', 'showIframe', 'size']);
const attributeName =toRef(props,'attributeName')
const displayMode = toRef(props, 'displayMode');
const {cardData} = props
const size = toRef(props, 'size');
let protyle 
onMounted(
    () => {
        if (cardData.data.type === 'note' && cardData.width > 300) {
            nextTick(() => {
                let blockID= 获取素材属性值(cardData.data,attributeName.value)
                blockID&&(protyle = 根据块ID创建protyle(protyleContainer.value.firstElementChild, blockID))
            })
        }
    }
)
onUnmounted(
    ()=>{
        protyle&&protyle.destroy()
    }
)
</script>