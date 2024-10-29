<template>
    <div style="position: relative; width: 100%; height: 100%;" class="ariaLabel" :aria-label="ariaLabel">

        <iframe ref="contentFrame" style="width: 100%; height: 100%; border: none;"></iframe>
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; "></div>
    </div>
</template>

<script setup>
import { ref, toRef, onMounted, nextTick } from 'vue';
import { 获取素材属性值 } from '../../../../data/attributies/parseAttributies.js';
import { getTextEditorWebview, writeHljsIframe } from '../../../../utils/DOM/iframe.js';
const props = defineProps(['cardData', 'attributeName','ariaLabel']);
const attributeName = toRef(props, 'attributeName');
const displayMode = toRef(props, 'displayMode');
const label = toRef(props, 'ariaLabel');

const { cardData } = props;


const contentFrame = ref(null);
const webviewHTML = ref('');

// 使用 window.require 引入 fs 模块
const fs = window.require('fs');

const readFirstNBytes = (filePath, bytesToRead, callback) => {
    fs.open(filePath, 'r', (err, fd) => {
        if (err) {
            callback(err, null);
            return;
        }
        const buffer = Buffer.alloc(bytesToRead);
        fs.read(fd, buffer, 0, bytesToRead, 0, (err, bytesRead, buffer) => {
            if (err) {
                callback(err, null);
                return;
            }
            callback(null, buffer.toString('utf8', 0, bytesRead));
            fs.close(fd, (err) => {
                if (err) console.error(err);
            });
        });
    });
};

const loadAndHighlightFile = async () => {
    const path = await 获取素材属性值(cardData.data, attributeName.value);
    // 读取前1000个字符
    readFirstNBytes(path, 1000, (err, data) => {
        if (err) {
            console.error(err);
            return;
        }
        nextTick(() => {
            writeHljsIframe(contentFrame.value, data)
        });
        // 这里可以继续处理 data，比如进行语法高亮
    });
    // webviewHTML.value = getTextEditorWebview(path);
}

onMounted(() => {
    loadAndHighlightFile();
});
</script>