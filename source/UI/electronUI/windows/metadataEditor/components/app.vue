<template>

    <LayoutRoot :fullscreen="false">
        <LayoutColumn class="cc-left-dock dock" id="dockLeft">
            <div class="dock__items"><span data-height="0" data-width="349" data-type="file" data-index="0"
                    data-hotkey="⌥1" data-hotkeylangid="fileTree" data-title="文档树"
                    class="dock__item ariaLabel dock__item--active" aria-label="<span style='white-space:pre'>文档树 Alt+1
单击 <span class='ft__on-surface ft__nowrap'>展开/最小化</span>
右键/拖拽 <span class='ft__on-surface ft__nowrap'>调整位置</span></span>" data-id="60b77fc3-d825-4df8-9170-94a003beaa8c">
                    <svg>
                        <use xlink:href="#iconFiles"></use>
                    </svg>
                </span></div>
            <div class="fn__flex-1 dock__item--space"></div>
            <div class="dock__items"><span data-height="0" data-width="232" data-type="bookmark" data-index="1"
                    data-hotkey="⌥3" data-hotkeylangid="bookmark" data-title="书签" class="dock__item ariaLabel"
                    aria-label="<span style='white-space:pre'>书签 Alt+3
单击 <span class='ft__on-surface ft__nowrap'>展开/最小化</span>
右键/拖拽 <span class='ft__on-surface ft__nowrap'>调整位置</span></span>">
                    <svg>
                        <use xlink:href="#iconBookmark"></use>
                    </svg>
                </span></div>
        </LayoutColumn>
        <LayoutRow class="cc-content-viewer">
            <!-- 左侧面板 -->
            <LayoutColumn class="cc-left-panel" gap="var(--cc-space-md)">
                <!-- 简化的数据源选择面板 -->
                <LayoutColumn class="cc-source-panel" gap="var(--cc-space-md)">
                    <LayoutColumn class="cc-button-group" gap="var(--cc-space-sm)">
                        <button class="cc-button" @click="showFileInput">导入文件</button>
                        <button class="cc-button" @click="loadFromClipboard">从剪贴板导入</button>
                        <button class="cc-button" @click="openFolder">打开文件夹</button>
                    </LayoutColumn>

                    <!-- 文件拖放区域 -->
                    <FileDropZone variant="dashed" :accepted-types="['.xbel', '.xml', '.html', '.csv', '*']"
                        :message="'拖放XBEL、Edge书签、历史记录或文件夹'" @files-dropped="handleFilesDropped" @error="handleError">
                        <template #icon>
                            <CCIcon name="upload" :size="24" />
                        </template>
                    </FileDropZone>
                </LayoutColumn>

                <!-- 状态显示 -->
                <div v-if="loading" class="cc-loading">加载中...</div>
                <LayoutRow v-if="error" class="cc-alert cc-alert--error" align="center">
                    {{ error }}
                    <button class="cc-copy-button" @click="copyError">复制错误信息</button>
                </LayoutRow>
            </LayoutColumn>

            <!-- 右侧内容区 -->
            <LayoutColumn class="cc-right-panel">
                <LayoutRow>
                    <LayoutColumn>

                        <LayoutColumn v-if="urtRoot" class="cc-content-tree">
                            <h3 class="cc-content__title">{{ urtRoot.name }}</h3>
                            <URTNode v-for="node in urtRoot.children" :key="node.meta?.id || node.url || node.path"
                                :node="node" @node-click="handleNodeClick" />
                        </LayoutColumn>
                    </LayoutColumn>
                </LayoutRow>
            </LayoutColumn>
        </LayoutRow>
    </LayoutRoot>
</template>

<script setup>
import { ref } from 'vue';
import LayoutRow from '../../../../components/common/layout/layoutRow.vue';
import LayoutColumn from '../../../../components/common/layout/layoutColumn.vue';
import { fromXBEL, fromEdgeBookMarkHTML } from '../../../../../URT/fromBookMarks.js';
import { fromEdgeHistoryCSVStream } from '../../../../../URT/fromHistory/fromEdgeHistoryCSVStream.js';
import { fromFolder } from '../../../../../URT/fromLocalFileSystem/fromFolder.js';
import { createCollection } from '../../../../../URT/builder.js';
import URTNode from './URTNode.vue';
import FileDropZone from '../../../../components/common/inputters/fileDropZone.vue';
import CCIcon from '../../../../components/common/baseComponents/icons.vue';
import { 选择文件夹, 选择文件 } from '../../../../../utils/useRemote/dialog.js';
import LayoutRoot from '../../../../components/common/layout/layoutRoot.vue';
const fs = window.require('fs').promises;
const path = window.require('path');

// 核心状态
const urtRoot = ref(null);
const loading = ref(false);
const error = ref(null);

// 统一的加载处理
const handleLoad = async (loadPromise) => {
    try {
        loading.value = true;
        error.value = null;
        // 创建一个集合作为根节点
        const collection = createCollection('导入的内容', {
            format: 'imported',
            source: 'file'
        });

        // 加载并转换数据
        const data = await loadPromise;
        collection.children = Array.isArray(data) ? data : [data];
        urtRoot.value = collection;
    } catch (err) {
        error.value = err.message;
    } finally {
        loading.value = false;
    }
};

// 添加统一的文件处理函数
const processFile = async (file, format) => {
    try {
        loading.value = true;
        error.value = null;

        const fileName = file.name || path.basename(file.path || file);
        const collection = createCollection(fileName, {
            format: format || 'unknown',
            source: 'file'
        });

        let content;
        if (typeof file === 'string') {
            content = await fs.readFile(file, 'utf-8');
        } else {
            content = await file.text();
        }

        switch (format) {
            case 'edge-html':
                collection.children = await fromEdgeBookMarkHTML(content);
                break;
            case 'edge-history':
                const stream = fromEdgeHistoryCSVStream(content);
                collection.children = [];
                for await (const item of stream) {
                    collection.children.push(item);
                }
                break;
            case 'xbel':
                collection.children = await fromXBEL(content);
                break;
            default:
                throw new Error('不支持的文件格式');
        }

        urtRoot.value = collection;
    } catch (err) {
        error.value = `处理文件失败: ${err.message}`;
        console.error('处理文件错误:', err);
    } finally {
        loading.value = false;
    }
};

// 简化后的文件选择处理
const showFileInput = async () => {
    try {
        const result = await 选择文件({
            title: '选择要导入的文件',
            buttonLabel: '导入',
            filters: [
                { name: 'XBEL文件', extensions: ['xbel', 'xml'] },
                { name: 'Edge书签', extensions: ['html'] },
                { name: 'Edge历史记录', extensions: ['csv'] },
                { name: '所有文件', extensions: ['*'] }
            ]
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            const fileExt = path.extname(filePath).toLowerCase().slice(1);
            const format = fileExt === 'html' ? 'edge-html' :
                fileExt === 'csv' ? 'edge-history' :
                    (fileExt === 'xbel' || fileExt === 'xml') ? 'xbel' : null;

            await processFile(filePath, format);
        }
    } catch (err) {
        error.value = `选择文件失败: ${err.message}`;
        console.error('选择文件错误:', err);
    }
};

// 简化后的文件拖放处理
const handleFilesDropped = async (files) => {
    const file = Array.isArray(files) ? files[0] : files;

    try {
        if (file.isDirectory) {
            const folderStream = fromFolder(file.path);
            const itemsMap = new Map();
            const topLevelItems = [];

            for await (const item of folderStream) {
                itemsMap.set(item.meta.id, item);
                if (!item.relations?.parent) {
                    topLevelItems.push(item);
                }
            }

            const collection = createCollection(file.name, {
                format: 'folder',
                source: 'local'
            });

            collection.children = topLevelItems;
            urtRoot.value = collection;
        } else {
            const fileExt = path.extname(file.name).toLowerCase().slice(1);
            const format = fileExt === 'html' ? 'edge-html' :
                fileExt === 'csv' ? 'edge-history' :
                    (fileExt === 'xbel' || fileExt === 'xml') ? 'xbel' : null;

            await processFile(file, format);
        }
    } catch (err) {
        error.value = `文件处理失败: ${err.message}`;
    }
};

const handleError = (err) => {
    error.value = err.message;
};

const openFolder = async () => {
    try {
        const result = await 选择文件夹({
            title: '选择要导入的文件夹',
            buttonLabel: '导入'
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const folderPath = result.filePaths[0];
            loading.value = true;
            error.value = null;

            try {
                const folderStream = fromFolder(folderPath);
                const itemsMap = new Map();
                const topLevelItems = [];

                for await (const item of folderStream) {
                    itemsMap.set(item.meta.id, item);
                    if (!item.relations?.parent) {
                        topLevelItems.push(item);
                    }
                }

                const collection = createCollection(path.basename(folderPath), {
                    format: 'folder',
                    source: 'local'
                });

                collection.children = topLevelItems;
                urtRoot.value = collection;
            } catch (err) {
                error.value = `处理文件夹失败: ${err.message}`;
                console.error('处理文件夹错误:', err);
            } finally {
                loading.value = false;
            }
        }
    } catch (err) {
        error.value = `打开文件夹失败: ${err.message}`;
        console.error('打开文件夹错误:', err);
    }
};

const handleNodeClick = (node) => {
    // 根据节点类型处理点击事件
    if (node.type === 'file') {
        window.electron.openExternal(node.path);
    } else if (node.type === 'bookmark') {
        window.electron.openExternal(node.url);
    }
};

const loadFromClipboard = () => handleLoad(fromClipboard());

const copyError = () => {
    if (error.value) {
        navigator.clipboard.writeText(error.value).then(() => {
            alert('错误信息已复制到剪贴板');
        }).catch(err => {
            console.error('复制失败:', err);
        });
    }
};
</script>

<style>
.cc-content-viewer {
    overflow: hidden;
}

.cc-left-panel {
    padding: var(--cc-space-md);
    border-right: 1px solid var(--cc-border-color);
    background: var(--cc-background-secondary);
}

.cc-right-panel {
    flex: 1;
    padding: var(--cc-space-md);
    overflow-y: auto;
}

/* 移除不再需要的flex相关样式 */
.cc-button-group,
.cc-source-panel {
    width: 100%;
}

/* 其他样式保持不变 */
.cc-loading {
    padding: var(--cc-space-sm);
    text-align: center;
    color: var(--cc-theme-primary);
}

.cc-alert {
    padding: var(--cc-space-sm);
    border-radius: var(--cc-radius-sm);
}

.cc-alert--error {
    background-color: var(--cc-theme-error-light);
    color: var(--cc-theme-error);
    border: 1px solid var(--cc-theme-error);
}

.cc-button {
    padding: var(--cc-space-sm) var(--cc-space-md);
    border-radius: var(--cc-radius-sm);
    background-color: var(--cc-theme-primary);
    color: var(--cc-theme-on-primary);
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
}

.cc-button:hover {
    background-color: var(--cc-theme-primary-dark);
}

.cc-copy-button {
    margin-left: var(--cc-space-sm);
    padding: var(--cc-space-xs) var(--cc-space-sm);
    background-color: var(--cc-theme-secondary);
    color: var(--cc-theme-on-secondary);
    border: none;
    cursor: pointer;
    border-radius: var(--cc-radius-sm);
}

.cc-copy-button:hover {
    background-color: var(--cc-theme-secondary-dark);
}
</style>