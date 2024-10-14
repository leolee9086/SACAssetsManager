<template>
    <div class=" fn__flex-column" @mouseover="showTagsByFile = true" @mouseleave="showTagsByFile = false">
        <template v-if="fileTags.length > 0">
            <template v-if="showTagsByFile">
                <template v-for="(file, index) in fileTags" :key="index">
                    <div class="b3-chip b3-chip--header">
                        {{ file.fileName }}:
                    </div>
                    <div class="b3-chips fn__flex">

                        <template v-for="tagLabel in file.tags" :key="tagLabel">
                            <div class="b3-chip b3-chip--middle b3-chip--pointer b3-chip--secondary"
                                data-type="open-search">
                                {{ tagLabel }}<svg class="b3-chip__close" data-type="remove-tag">
                                    <use xlink:href="#iconCloseRound"></use>
                                </svg>
                            </div>
                            <span class="fn__space"></span>
                        </template>
                        <div class="fn__flex-center">
                            <button class="b3-button b3-button--small" @click="addTagToFile([file.fileName])"
                                style="margin-top: 0" data-menu="true" data-type="tag">
                                <svg>
                                    <use xlink:href="#iconAdd"></use>
                                </svg>
                            </button>
                        </div>
                    </div>

                </template>
                <div class="fn__flex-center">
                    <button class="b3-button b3-button--small" style="margin-top: 0" data-menu="true" data-type="tag"
                        @click="addTagToFile(fileTags.map(file => file.fileName))">
                        <svg>
                            <use xlink:href="#iconAdd"></use>
                        </svg>
                        添加标签 ({{ fileTags.length }})
                    </button>
                </div>
            </template>
            <template v-else>
                <div class="b3-chips fn__flex">
                    <template v-for="(count, tag) in tagCounts" :key="tag">
                        <div class="b3-chip b3-chip--middle b3-chip--pointer b3-chip--secondary"
                            data-type="open-search">
                            {{ tag }} ({{ count }})
                        </div>
                    </template>
                </div>
            </template>
        </template>
        <template v-else>
            <div class="b3-chip b3-chip--middle b3-chip--secondary">
                {{ plugin.翻译`当前没有文件被选中` }}
            </div>
        </template>
    </div>
</template>
<script setup>
import { plugin } from 'runtime'
import { ref, computed } from 'vue'
import { findTagsByFilePath } from '../../../data/tags.js';

const fileTags = ref([])
const showTagsByFile = ref(false)

// 计算每个标签的文件数量
const tagCounts = computed(() => {
    const counts = {}
    fileTags.value.forEach(file => {
        file.tags.forEach(tag => {
            counts[tag] = (counts[tag] || 0) + 1
        })
    })
    return counts
})
function addTagToFile(fileNames) {
    // 在这里实现为所有文件添加标签的逻辑
    console.log('Adding tags to files:', fileNames);
}
plugin.eventBus.on('assets-select', async (e) => {
    const assets = Array.from(new Set(e.detail))
    if (assets.length === 0) {
        fileTags.value = [];
        return;
    }
    const assetPaths = assets.map(asset => asset.data.path);
    const assetNames = assets.map(asset => asset.data.name); // 假设 asset.data.name 是文件名
    // 获取每个文件的标签
    const allTags = await Promise.all(assetPaths.map(path => findTagsByFilePath(path)));
    fileTags.value = allTags.map((tags, index) => ({
        fileName: assetNames[index],
        tags: tags.map(tag => tag.label)
    }));
})
</script>
<style scoped>
.b3-button--small {
    font-size: 0.8em;
    padding: 0.5em;
}
</style>