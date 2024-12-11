<template>
  <div>
    <input type="file" @change="handleFileChange" />
    <ul>
      <li v-for="file in files" :key="file.name">
        {{ file.name }}
      </li>
    </ul>
  </div>
</template>

<script>
import JSZip from 'jszip';

export default {
  data() {
    return {
      files: []
    };
  },
  methods: {
    async handleFileChange(event) {
      const file = event.target.files[0];
      if (file) {
        const zip = new JSZip();
        const content = await zip.loadAsync(file);
        this.files = Object.keys(content.files).map(fileName => ({
          name: fileName
        }));
      }
    }
  }
};
</script>

<style scoped>
/* 添加一些简单的样式 */
ul {
  list-style-type: none;
  padding: 0;
}

li {
  margin: 5px 0;
}
</style>
