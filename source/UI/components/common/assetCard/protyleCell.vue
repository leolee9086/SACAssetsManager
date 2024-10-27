<template>
    <div  ref="protyleContainer">
        <div></div>
    </div>
</template>
<script setup lang="jsx">
import { ref, onMounted, toRef } from 'vue';
import { 根据块ID创建protyle } from '../../../../utils/siyuanUI/protyle/build.js';
import { onUnmounted } from '../../../../../static/vue.esm-browser.js';
import { 获取素材属性值 } from '../../../../data/attributies/parseAttributies.js';

const protyleContainer = ref(null);
const props = defineProps(['cardData', 'displayMode', 'attributeName', 'showImage', 'showIframe', 'size']);
const attributeName = toRef(props, 'attributeName');
const { cardData } = props;
let protyle;
let isUnmounted = false; // 新增标志

onMounted(async () => {
    if (cardData.data.type === 'note') {
        if (isUnmounted) return; // 检查组件是否已销毁
            let blockID = await 获取素材属性值(cardData.data, attributeName.value);

        requestIdleCallback(() => {
            blockID && (protyle = 根据块ID创建protyle(protyleContainer.value.firstElementChild, blockID));
        }, {timeout:15});
    }
});

onUnmounted(() => {
    isUnmounted = true; // 设置标志为已销毁
    protyle && protyle.destroy();
});
</script>