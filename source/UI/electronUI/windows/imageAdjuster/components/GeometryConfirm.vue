<template>
    <div class="geometry-confirm" v-if="hasGeometryChanges || isResizeMode || isCropMode">
        <div class="geometry-options">
            <div class="option-group" v-if="isResizeMode">
                <label>调整大小:</label>
                <div class="size-inputs">
                    <input type="number" v-model="resizeOptions.width" @input="handleResizeInput('width')" />
                    <span>x</span>
                    <input type="number" v-model="resizeOptions.height" @input="handleResizeInput('height')" />
                    <label>
                        <input type="checkbox" v-model="resizeOptions.maintainAspectRatio" />
                        保持比例
                    </label>
                </div>
            </div>
            <div class="option-group">
                <label>输出格式:</label>
                <select v-model="outputFormat">
                    <option value="jpeg">JPEG</option>
                    <option value="png">PNG</option>
                    <option value="webp">WebP</option>
                </select>
            </div>
            <div class="option-group" v-if="isCropMode">
                <label>裁剪尺寸:</label>
                <div class="size-inputs">
                    <input type="number" v-model="cropBox.width" @input="handleCropInput('width')" />
                    <span>x</span>
                    <input type="number" v-model="cropBox.height" @input="handleCropInput('height')" />
                    <label>
                        <input type="checkbox" v-model="cropBox.maintainAspectRatio" />
                        保持比例
                    </label>
                </div>
            </div>
        </div>
        <div class="button-group">
            <button class="confirm-button" @click="confirmChanges">确认</button>
            <button class="cancel-button" @click="cancelChanges">取消</button>
        </div>
    </div>
</template>

<script setup>
// 定义 props
const props = defineProps({
    hasGeometryChanges: Boolean,
    isResizeMode: Boolean,
    isCropMode: Boolean,
    resizeOptions: Object,
    cropBox: Object,
    outputFormat: String
})

// 定义 emits
const emit = defineEmits([
    'resize-input',
    'crop-input',
    'confirm-changes',
    'cancel-changes'
])

// 方法定义
const handleResizeInput = (dimension) => {
    emit('resize-input', dimension)
}

const handleCropInput = (dimension) => {
    emit('crop-input', dimension)
}

const confirmChanges = () => {
    emit('confirm-changes')
}

const cancelChanges = () => {
    emit('cancel-changes')
}
</script>

<style scoped>
/* 将原有的样式复制到这里 */
/* 添加确认按钮样式 */
.geometry-confirm {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
    z-index: 1000;
}

.confirm-button,
.cancel-button {
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
}

.confirm-button {
    background: #dd6515;
    color: white;
}

.confirm-button:hover {
    background: #c55a13;
}

.cancel-button {
    background: #3a3a3a;
    color: white;
}

.cancel-button:hover {
    background: #4a4a4a;
}

/* 添加几何变换选项样式 */
.geometry-confirm {
    background: #2a2a2a;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.geometry-options {
    margin-bottom: 16px;
}

.option-group {
    margin-bottom: 12px;
}

.option-group label {
    display: block;
    color: #fff;
    margin-bottom: 4px;
}

.size-inputs {
    display: flex;
    align-items: center;
    gap: 8px;
}

.size-inputs input[type="number"] {
    width: 80px;
    padding: 4px 8px;
    background: #3a3a3a;
    border: 1px solid #4a4a4a;
    border-radius: 4px;
    color: #fff;
}

.size-inputs span {
    color: #fff;
}

.size-inputs label {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: 12px;
}

select {
    padding: 4px 8px;
    background: #3a3a3a;
    border: 1px solid #4a4a4a;
    border-radius: 4px;
    color: #fff;
    width: 100%;
}

.button-group {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

</style>
