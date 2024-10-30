<template>
  <div class="image-compressor">
    <input type="file" @change="handleFileUpload" />
    <div v-if="originalImage && compressedImage" class="image-container">
      <img :src="originalImage" alt="Original Image" class="original-image" />
      <img :src="compressedImage" alt="Compressed Image" class="compressed-image" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import sharp from 'sharp';

const originalImage = ref(null);
const compressedImage = ref(null);

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // 读取文件
  const buffer = await file.arrayBuffer();
  const image = await sharp(buffer)
    .toBuffer()
    .then((data) => `data:image/jpeg;base64,${data.toString('base64')}`);

  originalImage.value = image;

  // 压缩图片
  const compressed = await sharp(buffer)
    .resize({ width: 800 }) // 假设我们压缩到800px宽
    .jpeg({ quality: 80 }) // 假设压缩质量为80
    .toBuffer()
    .then((data) => `data:image/jpeg;base64,${data.toString('base64')}`);

  compressedImage.value = compressed;
};
</script>

<style scoped>
.image-compressor {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.image-container {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
}

.original-image,
.compressed-image {
  width: 45%;
  border: 1px solid #ccc;
  margin: 0 10px;
}
</style>
