<template>
    <div>
        <template v-if="currentComponent && currentAttributeName">
            <component :is="currentComponent" :cardData="cardData" :displayMode="displayMode" :size="size"
                :ariaLabel="props.cardData.data.path" :attributeName="currentAttributeName" />
        </template>
    </div>
</template>

<script setup lang="jsx">
import { computed, ref, shallowRef, onMounted } from 'vue';
import protyleCell from './protyleCell.vue';
import imageCell from './imageCell.vue';
import hljsTextCell from './hljsTextCell.vue';
const props = defineProps(['cardData', 'displayMode', 'size']);

const currentComponent = shallowRef(null);
const currentAttributeName = ref(null);

// 判断文件是否为文本文件的辅助函数
function isTextFile(path) {
    const textFileExtensions = ['.txt', '.md', '.json', '.js', '.vue', '.css']; // 根据需要添加更多扩展名
    return textFileExtensions.some(ext => path.endsWith(ext));
}

// 异步函数同时判定展示组件和所使用的属性
async function determineComponentAndAttribute() {
    if (props.size > 300) {
        if (props.cardData.data.type === 'note') {
            currentComponent.value = protyleCell;
            currentAttributeName.value = 'noteID';
        } else if (props.cardData.data.type === 'local') {
            if (props.cardData.data.path && await isTextFile(props.cardData.data.path)) {
                currentComponent.value = hljsTextCell;
                currentAttributeName.value = 'path';
            }
            else {
                currentComponent.value = imageCell;
                currentAttributeName.value = 'thumbnailURL';
            }
        }
    } else {
        currentComponent.value = imageCell;
        currentAttributeName.value = 'thumbnailURL';
    }
}

onMounted(
    () => {
        determineComponentAndAttribute()
    }
)
</script>