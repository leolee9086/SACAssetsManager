<template>
    <div  ref="protyleContainer">
        <div></div>
    </div>
</template>
<script setup lang="jsx">
import { ref ,onMounted,nextTick} from 'vue';
import { 根据块ID创建protyle } from '../../../../utils/siyuanUI/protyle/build.js';
import { onUnmounted } from '../../../../../static/vue.esm-browser.js';
const protyleContainer = ref(null)
const props = defineProps(['cardData'])
const {cardData}=props
let protyle 
onMounted(
    () => {
        if (cardData.data.type === 'note' && cardData.width > 300) {
            nextTick(() => {
                protyle = 根据块ID创建protyle(protyleContainer.value.firstElementChild, cardData.data.id)
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