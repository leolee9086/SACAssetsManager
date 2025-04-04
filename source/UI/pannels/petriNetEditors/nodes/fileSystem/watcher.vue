<template>
    <div class="folder-watcher">
        <div class="input-group">
            <input 
                type="text" 
                v-model="localFolderPath" 
                placeholder="输入文件夹路径或点击选择" 
                class="path-input" 
            />
            <button class="browse-btn" @click="handleFolderSelect">
                浏览
            </button>
        </div>

        <div v-if="watchStatus" class="status-container">
            <span :class="['status-indicator', watchStatus.type]">
                {{ watchStatus.message }}
            </span>
        </div>
    </div>
</template>

<script nodeDefine>
import { ref, watch } from 'vue';
import * as watcher from '@parcel/watcher';
import { watch as fsWatch } from 'fs';
import { join } from 'path';
import { existsSync } from 'fs';

const localFolderPath = ref('');
const watchStatus = ref(null);
let subscription = null;
let fallbackWatcher = null;

// 停止所有监听
const stopWatching = async () => {
    try {
        if (subscription) {
            await subscription.unsubscribe();
            subscription = null;
        }
        if (fallbackWatcher) {
            fallbackWatcher.close();
            fallbackWatcher = null;
        }
    } catch (error) {
        console.error('停止监听时发生错误:', error);
    }
};

// 验证路径
const validatePath = (path) => {
    if (!path) return false;
    try {
        return existsSync(path);
    } catch (error) {
        console.error('路径验证失败:', error);
        return false;
    }
};

// 创建回退监听器
const createFallbackWatcher = (path, runtime) => {
    if (!validatePath(path)) return null;

    try {
        return fsWatch(path, { recursive: true }, (eventType, filename) => {
            if (!filename) return;

            const fullPath = join(path, filename);
            const event = {
                type: eventType === 'rename' ? 'create' : 'update',
                path: fullPath,
                timestamp: Date.now()
            };
            
            nodeDefine.process(event, runtime);
        });
    } catch (error) {
        console.error('回退监听器创建失败:', error);
        return null;
    }
};

// 启动文件夹监听
const startWatching = async (path, runtime) => {
    if (!validatePath(path)) {
        watchStatus.value = {
            type: 'error',
            message: '无效的文件夹路径'
        };
        return false;
    }

    await stopWatching();

    try {
        subscription = await watcher.subscribe(path, (err, events) => {
            if (err) throw err;

            events.forEach(event => {
                nodeDefine.process({
                    type: event.type,
                    path: event.path,
                    timestamp: Date.now()
                }, runtime);
            });
        });

        watchStatus.value = {
            type: 'success',
            message: '正在监听文件夹变更'
        };
        return true;
    } catch (error) {
        console.warn('@parcel/watcher 失败,使用回退方案:', error);
        
        fallbackWatcher = createFallbackWatcher(path, runtime);
        
        if (fallbackWatcher) {
            watchStatus.value = {
                type: 'warning',
                message: '使用备用监听方案'
            };
            return true;
        } else {
            watchStatus.value = {
                type: 'error',
                message: '监听失败'
            };
            return false;
        }
    }
};

export let nodeDefine = {
    flowType: "start",
    inputs: {
        folderPath: {
            type: String,
            label: '文件夹路径',
            description: '要监听的文件夹路径'
        }
    },
    events: {
        fileChange: {
            type: Object,
            label: '文件变更事件',
            description: '当监听的文件夹中发生变化时触发',
            schema: {
                type: {
                    type: String,
                    description: '变更类型: create/update/delete'
                },
                path: {
                    type: String,
                    description: '发生变更的文件完整路径'
                },
                timestamp: {
                    type: Number,
                    description: '事件发生的时间戳'
                }
            }
        }
    },
    async process(event, runtime) {
        // 处理输入变化
        if (!event) {
            const path = runtime?.inputs?.folderPath;
            if (path && path !== localFolderPath.value) {
                localFolderPath.value = path;
                await startWatching(path, runtime);
            }
            return;
        }

        // 触发文件变更事件
        if (runtime?.events) {
            runtime.events.fileChange(event);
        }
    },
    async onDestroy() {
        await stopWatching();
        watchStatus.value = null;
        localFolderPath.value = '';
    }
};

// 监听本地路径变化
watch(localFolderPath, async (newPath, oldPath) => {
    if (newPath !== oldPath) {
        await startWatching(newPath);
    }
});

export const getDefaultInput = () => ({
    folderPath: localFolderPath.value || undefined
});
</script>

<script setup>
const { dialog } = window.require('@electron/remote');

async function handleFolderSelect() {
    try {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: '选择要监听的文件夹'
        });

        if (!result.canceled && result.filePaths.length > 0) {
            localFolderPath.value = result.filePaths[0];
        }
    } catch (error) {
        console.error('选择文件夹失败:', error);
        watchStatus.value = {
            type: 'error',
            message: '选择文件夹失败'
        };
    }
}
</script>

<style scoped>
.folder-watcher {
    padding: 12px;
}

.input-group {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
}

.path-input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    font-size: 14px;
    background: #fff;
    transition: border-color 0.2s;
}

.path-input:focus {
    border-color: #409eff;
    outline: none;
}

.path-input:hover {
    border-color: #c0c4cc;
}

.browse-btn {
    background: #409eff;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
    font-size: 14px;
}

.browse-btn:hover {
    background: #66b1ff;
}

.browse-btn:active {
    background: #3a8ee6;
}

.status-container {
    margin-top: 8px;
}

.status-indicator {
    display: inline-block;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 13px;
    line-height: 1.4;
}

.status-indicator.success {
    background: #f0f9eb;
    color: #67c23a;
    border: 1px solid #c2e7b0;
}

.status-indicator.warning {
    background: #fdf6ec;
    color: #e6a23c;
    border: 1px solid #f5dab1;
}

.status-indicator.error {
    background: #fef0f0;
    color: #f56c6c;
    border: 1px solid #fbc4c4;
}
</style>
