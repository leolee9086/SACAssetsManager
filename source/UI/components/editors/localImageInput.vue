<template>
    <div class="input-group">
        <input type="text" v-model="localFilePath" placeholder="输入文件路径或点击选择文件" class="path-input" />
        <div class="file-input-wrapper">
            <button class="upload-btn" @click="handleFileUpload">
                浏览
            </button>
        </div>
    </div>

    <div v-if="previewUrl" class="preview-container">
        <img :src="previewUrl" class="preview-image" />
    </div>
</template>
<script nodeDefine>
import { ref } from 'vue';

let file;
const localFilePath = ref('');
const previewUrl = ref('');
const fileInfo = ref(null);

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export let nodeDefine = {
    flowType: "start",
    outputs: {
        file: {
            type: File,
            label: '文件对象',
        },
        filePath: {
            type: String,
            label: '文件路径',
        },
        fileSize: {
            type: Number,
            label: '文件大小(B)',
        },
        formattedSize: {
            type: String,
            label: '格式化大小',
        },
        fileType: {
            type: String,
            label: '文件类型',
        },
        fileName: {
            type: String,
            label: '文件名',
        },
        lastModified: {
            type: Number,
            label: '最后修改时间',
        }
    },
    async process(filePath) {
        if (!filePath) {
            previewUrl.value = '';
            fileInfo.value = null;
            return {
                filePath: '',
                file: undefined,
                fileSize: 0,
                formattedSize: '0 B',
                fileType: '',
                fileName: '',
                lastModified: 0
            }
        }
      
        try {
            const response = await fetch(filePath);
            const blob = await response.blob();
            file = new File([blob], filePath.split('/').pop(), { type: blob.type });
            localFilePath.value = filePath;
            
            if (previewUrl.value) {
                URL.revokeObjectURL(previewUrl.value);
            }
            previewUrl.value = URL.createObjectURL(file);
            
            const fileSize = file.size;
            const formattedSize = formatFileSize(fileSize);
            const fileType = file.type;
            const fileName = file.name;
            const lastModified = file.lastModified;

            fileInfo.value = {
                size: fileSize,
                formattedSize,
                type: fileType,
                name: fileName,
                lastModified
            };
            
            return {
                file,
                filePath,
                fileSize,
                formattedSize,
                fileType,
                fileName,
                lastModified
            }
        } catch (error) {
            console.error('加载图片失败:', error);
            previewUrl.value = '';
            fileInfo.value = null;
            return {
                filePath,
                file: undefined,
                fileSize: 0,
                formattedSize: '0 B',
                fileType: '',
                fileName: '',
                lastModified: 0
            }
        }
    },
};

export const getDefaultInput = () => {
    return localFilePath.value || undefined;
}
</script>
<script setup>
const { dialog } = window.require('@electron/remote');
async function handleFileUpload() {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
        ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        localFilePath.value = filePath;
        nodeDefine.process(filePath);
    }
}


</script>
<style scoped>
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
}

.path-input:focus {
    border-color: #409eff;
    outline: none;
}

.upload-btn {
    background: #409eff;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
}

.upload-btn:hover {
    background: #66b1ff;
}

.file-input-wrapper input[type="file"] {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
}

.load-btn {
    width: 100%;
    padding: 8px;
    background: #67c23a;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.load-btn:hover {
    background: #85ce61;
}

.load-btn:disabled {
    background: #c0c4cc;
    cursor: not-allowed;
}
</style>