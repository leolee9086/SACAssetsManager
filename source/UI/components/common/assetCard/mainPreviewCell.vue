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
import videoCell from './videoCell.vue';
import audioCell from './audioCell.vue'
import gltfCell from './gltfCell.vue';
import LutCell from './LutCell.vue';

const props = defineProps(['cardData', 'displayMode', 'size']);

const currentComponent = shallowRef(null);
const currentAttributeName = ref(null);
function isLutFile(path){
    const textFileExtensions = ['cube']; // 根据需要添加更多扩展名
    const extension = path.split('.').pop().toLowerCase();

    return textFileExtensions.some(ext => extension.toLowerCase() === ext.toLowerCase());

}
// 判断文件是否为文本文件的辅助函数
function isTextFile(path) {
    const textFileExtensions = ['txt', 'md', 'json', 'js', 'vue', 'css']; // 根据需要添加更多扩展名
    const extension = path.split('.').pop().toLowerCase();

    return textFileExtensions.some(ext => extension.toLowerCase() === ext.toLowerCase());
}
function isVideoFile(path) {
    // 支持更多的视频文件扩展名
    const videoFileExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'];
    // 获取文件的扩展名
    const extension = path.split('.').pop().toLowerCase();
    // 检查扩展名是否在视频文件扩展名列表中
    return videoFileExtensions.some(ext => extension.toLowerCase() === ext.toLowerCase());
}
function isAudioFile(path) {
    // 支持更多的音频文件扩展名
    const audioFileExtensions = ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a'];
    // 获取文件的扩展名
    const extension = path.split('.').pop().toLowerCase();
    // 检查扩展名是否在音频文件扩展名列表中
    return audioFileExtensions.some(ext => extension.toLowerCase() === ext.toLowerCase());
}
function isGLTFFile(path) {
    // 支持的GLTF文件扩展名
    const gltfFileExtensions = ['gltf','glb','fbx','obj','dae','stl','ply'];
    // 获取文件的扩展名
    const extension = path.split('.').pop().toLowerCase();
    // 检查扩展名是否在GLTF文件扩展名列表中
    return gltfFileExtensions.includes(extension);
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
            else if(props.cardData.data.path && await isVideoFile(props.cardData.data.path)) {
                currentComponent.value = videoCell;
                currentAttributeName.value = 'path';
            } 
            else if(props.cardData.data.path && await isAudioFile(props.cardData.data.path)) {
                currentComponent.value = audioCell;
                currentAttributeName.value = 'path';
            }
            else if(props.cardData.data.path && await isLutFile(props.cardData.data.path)) {
                currentComponent.value = LutCell;
                currentAttributeName.value = 'path';
            }
            else if (await isGLTFFile(props.cardData.data.path)) {
                    currentComponent.value = gltfCell; // GLTF预览组件
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