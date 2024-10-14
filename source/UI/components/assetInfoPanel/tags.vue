<template>
    <div class=" fn__flex-column" @mouseleave="showTagsByFile = false">
        <div class="fn__flex">
            <div class="fn__space fn__flex-1"></div>
            <button @click="toggleShowTagsByFile" style="height:15px;background-color: transparent;max-width: 180px;width: 100%;"
                class="b3-button b3-button--small ariaLabel" aria-label="展开">
                ...
            </button>
            <div class="fn__space fn__flex-1"></div>
        </div>
        <template v-if="fileTags.length > 0">
            <template v-if="showTagsByFile">
                <template v-for="(file, index) in fileTags" :key="index">
                    <div class="b3-chip b3-chip--header">
                        {{ file.fileName }}:
                    </div>
                    <div class="b3-chips fn__flex">

                        <template v-for="tagLabel in file.tags" :key="tagLabel">
                            <div @click="打开标签资源视图(tagLabel)"
                                class="b3-chip b3-chip--middle b3-chip--pointer b3-chip--secondary"
                                data-type="open-search">
                                {{ tagLabel }}
                                <svg class="b3-chip__close" data-type="remove-tag"
                                    @click.stop="从标签移除文件路径数组并刷新([file.asset.path], tagLabel)">
                                    <use xlink:href="#iconCloseRound"></use>
                                </svg>
                            </div>
                            <span class="fn__space"></span>
                        </template>
                        <div class="fn__flex-center">
                            <button class="b3-button b3-button--small" @click="addTagToFile([file.asset.path])"
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
                        @click="编辑选中文件标签(fileTags.map(file => file.asset.path))">
                        <svg>
                            <use xlink:href="#iconAdd"></use>
                        </svg>
                        编辑标签 ({{ fileTags.length }})
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
import { findTagsByFilePath, removeFilesFromTag } from '../../../data/tags.js';
import { 打开标签资源视图 } from '../../siyuanCommon/tabs/assetsTab.js';
import { 选择标签 } from '../../siyuanCommon/dialog/tagPicker.js';
import { watchStatu, 状态注册表 } from '../../../globalStatus/index.js';
const fileTags = ref([])
const showTagsByFile = ref(false)
let assets = []
function toggleShowTagsByFile() {
    showTagsByFile.value = !showTagsByFile.value;
}
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
async function 从标签移除文件路径数组并刷新(文件路径数组, tagLabel) {
    await removeFilesFromTag(文件路径数组, tagLabel)
    refresh(assets)
    plugin.eventBus.emit('need-refresh-gallery-panel', {
        type: 'tag',
        data: {
            label: tagLabel
        }
    })
}
function 编辑选中文件标签(fileNames) {
    // 在这里实现为所有文件添加标签的逻辑
    选择标签(`为${fileNames.length}个文件选择标签`)
    console.log('Adding tags to files:', fileNames);
}

function refresh(assets) {
    if (assets.length === 0) {
        fileTags.value = [];
        return;
    }
    const assetPaths = assets.map(asset => asset.data.path);
    // 获取每个文件的标签
    Promise.all(assetPaths.map(path => findTagsByFilePath(path)))
        .then(allTags => {
            fileTags.value = allTags.map((tags, index) => ({
                asset: assets[index].data, // 包含整个资产对象
                fileName: assets[index].data.name, // 假设 asset.data.name 是文件名
                tags: tags.map(tag => tag.label),
            }));
        })
        .catch(error => {
            console.error("Error refreshing tags:", error);
        });
}
watchStatu(状态注册表.选中的资源, (newVal) => {
    assets = Array.from(new Set(newVal));
    refresh(assets);

})

</script>
<style scoped>
.b3-button--small {
    font-size: 0.8em;
    padding: 0.5em;
}
</style>