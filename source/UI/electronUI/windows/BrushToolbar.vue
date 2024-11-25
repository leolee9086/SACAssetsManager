<template>

    <div class="brush-toolbar">
        <div class="tools-container">
            <div v-for="(tool, index) in tools" :key="index" class="tool-item"
                :class="{ 'active': selectedTool === tool.type }" @click="selectTool(tool.type)">
                <div class="tool-wrapper">
                    <img v-if="tool.isImage" 
                         :src="tool.icon" 
                         :alt="tool.type"
                         class="tool-icon"
                         :style="{ color: tool.color }" />
                    <div v-else 
                                v-html="tool.icon" 
                                class="tool-icon"
                                :style="{ color: tool.color }" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import BrushIcon from '/plugins/SACAssetsManager/assets/brush1.svg'
import MarkerSmallIcon from '/plugins/SACAssetsManager/assets/marker_small.svg'
import MarkerIcon from '/plugins/SACAssetsManager/assets/marker.svg'
import Pencil from '/plugins/SACAssetsManager/assets/pencil.svg'
import Eraser from '/plugins/SACAssetsManager/assets/eraser.svg'

const selectedTool = ref('brush')

const tools = [
    {
        type: 'Pencil',
        color: '#E24A4A',
        icon: Pencil,
        isImage: false
    },
    {
        type: 'marker',
        color: '#E24A4A',
        icon: BrushIcon,
        isImage: false
    },
    {
        type: 'highlighter',
        color: '#F7D147',
        icon: MarkerIcon,
        isImage: false
    },
    {
        type: 'brush',
        color: '#4A90E2',
        icon: MarkerSmallIcon,
        isImage: false
    },
    {
        type: 'eraser',
        color: '#4A90E2',
        icon: "/plugins/SACAssetsManager/assets/eraser.webp",
        isImage: true
    },
]

const selectTool = (toolType) => {
    selectedTool.value = toolType
    emit('tool-selected', toolType)
}

const emit = defineEmits(['tool-selected'])
</script>

<style scoped>
.brush-toolbar {
    position: fixed;
    left: 20px;
    transform: translateY(-50%);
    padding: 0;
    display: flex;
    flex-direction: column;
    width: 100px;
    overflow: hidden;
}

.tools-container {
    background: #2a2a2a;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 60px;
    overflow: visible;
    position: relative;
    border: 3px solid var(--cc-scroll-color) ;
    border-style: groove;
}

.tool-item {
    position: relative;
    height: 48px;
    cursor: pointer;
}

.tool-wrapper {
    position: absolute;
    right: 0;
    transform: translateY(-50%);
    width: 200px;
    height: 48px;
    left: -300%;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    transition: transform 0.3s ease;
    transform: translateX(136px);
}

.tool-icon {
    width: 200px;
    height: 48px;
    object-fit: contain;
}

.fil3 .fil4 {
    fill: #F6F7F9
}

.tool-wrapper {
    transform: translateX(10px);
}

.tool-item.active .tool-wrapper {
    transform: translateX(60px);
}

.tool-item:hover:not(.active) .tool-wrapper {
    transform: translateX(40px);
}

.tool-wrapper {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.brush-toolbar {
    transition: transform 0.3s ease, opacity 0.3s ease;
}

@keyframes slideIn {
    from {
        transform: translateX(-100%);
        opacity: 0;
    }

    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.brush-toolbar {
    animation: slideIn 0.3s ease forwards;
}

:deep(.tool-icon svg) {
    max-height: 100% !important;
    max-width: 100% !important;
    min-height: 100% !important;
}


</style>
