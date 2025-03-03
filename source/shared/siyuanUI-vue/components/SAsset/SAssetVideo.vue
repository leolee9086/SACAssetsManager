<template>
  <div :data-node-id="nodeId" data-type="NodeVideo" class="iframe" :updated="updatedTime">
    <div class="iframe-content">
      {{ zwsp }}
      <video controls="controls" :src="src" :data-src="src"></video>
      <span class="protyle-action__drag" contenteditable="false"></span>
    </div>
    <div class="protyle-attr" contenteditable="false">{{ zwsp }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import * as dayjs from 'dayjs';

const props = defineProps({
  src: {
    type: String,
    required: true
  }
});

const nodeId = ref('');
const updatedTime = ref('');
const zwsp = '\u200b'; // 零宽空格

onMounted(() => {
  // 生成唯一ID
  nodeId.value = Math.random().toString(36).substr(2, 9);
  // 更新时间戳
  updatedTime.value = dayjs().format('YYYYMMDDHHmmss');
});
</script> 