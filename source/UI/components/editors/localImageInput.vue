<template>
    <div class="input-group">
        <input type="text" v-model="localFilePath" placeholder="输入文件路径或点击选择文件" class="path-input" />
        <div class="file-input-wrapper">
            <button class="upload-btn">
                浏览
                <input type="file" @change="handleFileUpload" accept="image/*" />
            </button>
        </div>
    </div>
    <button class="load-btn" @click="loadFromPath" :disabled="!localFilePath">
        加载图片
    </button>
</template>

<script nodeDefine>
export const nodeDefine = {
  flowType:"start",
 
  outputs: {
    file:{
        type:File,
        lebel:'文件对象',
    },
    filePath:{
        type:String,
        lebel:'文件路径',
    }
  },
  async process(inputs) {
    console.log(inputs)
    let filePath = inputs.filePath?.value;
    console.log(inputs.meta.path)
    if(inputs.meta?.filePath||inputs.meta?.path){
        filePath = inputs.meta.filePath||inputs.meta.path
    }
    if (!filePath) {
      console.error("File path is missing.");
      return {
        filePath:'',
        file:undefined
      }
    }

    try {
      const response = await fetch(filePath);
      const blob = await response.blob();
      const file = new File([blob], 'image.jpg', { type: blob.type });
      return {
        file,
        filePath
      }
    } catch (error) {
      console.error('加载图片失败:', error);
      return   {
        filePath,
        file:undefined
      }
    }
  },
 
};
</script>

<script setup>
import { ref, watch, onMounted, inject, onUnmounted, defineExpose } from 'vue';

defineExpose(
  {nodeDefine}
)

const props = defineProps(nodeDefine.inputs);

const emit = defineEmits({
    "update:filePath":(value)=>value instanceof nodeDefine.outputs.filePath.type,
    "update:file":(value)=>value  instanceof nodeDefine.outputs.file.type
}
);

const localFilePath = ref(props.filePath);

watch(() => props.filePath, (newVal) => {
    localFilePath.value = newVal;
});

const handleFileUpload = (e) => {
    if (!e || !e.target || !e.target.files || !e.target.files.length) {
        return;
    }

    const file = e.target.files[0];
    localFilePath.value = file.name;
    emit('update:filePath', file.name);
    emit('fileSelected', file);

    e.target.value = '';
};

const loadFromPath = async () => {
    try {
        const response = await fetch(localFilePath.value);
        const blob = await response.blob();
        const file = new File([blob], 'image.jpg', { type: blob.type });
        emit('fileSelected', file);
    } catch (error) {
        console.error('加载图片失败:', error);
    }
};

const nodeInterface = {
    outputs: {
        image: {
            type: 'output',
            side: 'right',
            position: 0.5,
            label: '选择的图片',
            dataType: 'image'
        }
    }
}

const { register = () => [], unregister = () => {} } = inject('nodeInterface', {}) || {};
const registeredAnchors = ref([]);

onMounted(() => {
    if (register) {
        registeredAnchors.value = register(props.componentId, nodeInterface)
    }
})

onUnmounted(() => {
    if (unregister && registeredAnchors.value.length) {
        unregister(registeredAnchors.value)
    }
})
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