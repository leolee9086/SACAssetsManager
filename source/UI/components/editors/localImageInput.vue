<template>
    <div class="input-group">
        <input type="text" v-model="localFilePath" placeholder="输入文件路径或点击选择文件" class="path-input" />
        <div class="file-input-wrapper">
            <button class="upload-btn" @click="handleFileUpload">
                浏览
            </button>
        </div>
    </div>
    <button class="load-btn" @click="loadFromPath" :disabled="!localFilePath">
        加载图片
    </button>
</template>
<script nodeDefine>
import { ref, watch } from 'vue';
let file 
const localFilePath = ref('');
export const getDefaultInput=()=>{
    return localFilePath.value||undefined
}
export let nodeDefine = {
    flowType: "start",
    outputs: {
        file: {
            type: File,
            lebel: '文件对象',
        },
        filePath: {
            type: String,
            lebel: '文件路径',
        }
    },
    //当在编辑器运行的时候这个函数会自动通知锚点
    async process(filePath) {
        if (!filePath) {
            console.error("File path is missing.");
            return {
                filePath: '',
                file: undefined
            }
        }
        if(localFilePath.value===filePath){
            return {
                file,
                filePath
            }
        }
        try {
            const response = await fetch(filePath);
            const blob = await response.blob();
             file = new File([blob], 'image.jpg', { type: blob.type });
            localFilePath.value= filePath
            return {
                file,
                filePath
            }
        } catch (error) {
            console.error('加载图片失败:', error);
            return {
                filePath,
                file: undefined
            }
        }
    },

};

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