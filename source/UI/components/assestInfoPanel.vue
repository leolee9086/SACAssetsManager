<template>
  <div class="fn__flex-column fn__flex-1">
    <div class="image-details fn__flex-column fn__flex-1">
      <div class="image-preview fn__flex">
        <div class="fn__space fn__flex-1"></div>
        <multiSrcImage
          :src="['http://127.0.0.1/thumbnail/?path=assets%2F42-20240129031127-2sioyhf.jpg', '/stage/icon.png']"
          alt="Image Preview" style="width: 256px;height:256px;object-fit: contain" />
        <div class="fn__space fn__flex-1"></div>

      </div>
      <div class="image-info">
        <div class="fn__flex">
          <div class="image-name">{{ name }}</div>
        </div>
        <label>注释</label>
        <input v-model="note" placeholder="添加注释,可以引用思源的块" />
        <label>来源</label>
        <input v-model="link" placeholder="http://" />
        <div class="tags">
          <label>标签</label>
          <input v-model="tags" placeholder="添加标签" />
        </div>
        <div class="folder-info">
          <label>文件夹</label>
          <input v-model="folder" placeholder="文件夹" />
        </div>
        <div class="basic-info">
          <div>评分: <span>{{ rating }}</span></div>
          <div>尺寸: <span>{{ dimensions }}</span></div>
          <div>文件大小: <span>{{ fileSize }}</span></div>
          <div>格式: <span>{{ format }}</span></div>
          <div>添加日期: <span>{{ addedDate }}</span></div>
          <div>创建日期: <span>{{ createdDate }}</span></div>
          <div>修改日期: <span>{{ modifiedDate }}</span></div>
        </div>
        <button @click="exportImage">导出</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import multiSrcImage from './common/multiSrcImage.vue';
const imageSrc = ref(['http://127.0.0.1/thumbnail/?path=assets%2F42-20240129031127-2sioyhf.jpg']);
const format = ref('JPG');
const name = ref('浮雕灰度图 (11)');
const note = ref('');
const link = ref('');
const tags = ref('');
const folder = ref('浮雕');
const rating = ref('★★★★★');
const dimensions = ref('1021 x 1024');
const fileSize = ref('180.60 KB');
const addedDate = ref('2023/10/11 21:00');
const createdDate = ref('2023/01/16 18:25');
const modifiedDate = ref('2017/04/18 19:37');

const exportImage = () => {
  console.log('导出图片');
};
</script>

<style scoped>
.image-details {
  display: flex;
  flex-direction: column;
  background-color: #2c2c2c;
  color: #fff;
  padding: 10px;
  border-radius: 8px;
}

.image-preview img {
  width: 100%;
  border-radius: 8px;
}

.image-info {
  margin-top: 10px;
}

.image-format {
  font-size: 12px;
  color: #ccc;
}

.image-name {
  font-size: 16px;
  margin: 5px 0;
}

input {
  width: 100%;
  padding: 5px;
  margin: 5px 0;
  border: none;
  border-radius: 4px;
  box-sizing: border-box;
}

.tags,
.folder-info,
.basic-info {
  margin: 10px 0;
}

.basic-info div {
  margin: 5px 0;
}

button {
  width: 100%;
  padding: 10px;
  background-color: #4caf50;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #45a049;
}
</style>