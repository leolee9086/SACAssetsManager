<template>
    <div class="file-system-test">
      <h2>文件系统API测试</h2>
      
      <div v-if="!isSupported" class="error">
        当前浏览器不支持文件系统访问API
      </div>
      
      <div v-else>
        <button @click="requestRootPermission">请求目录权限</button>
        
        <div v-if="vfs">
          <h3>当前目录: {{ rootName }}</h3>
          
          <div class="operations">
            <div>
              <input v-model="fileName" placeholder="文件名">
              <input v-model="fileContent" placeholder="文件内容">
              <button @click="writeTestFile">写入文件</button>
              <button @click="readTestFile">读取文件</button>
            </div>
            
            <div>
              <input v-model="dirName" placeholder="目录名">
              <button @click="createDirectory">创建目录</button>
            </div>
            
            <button @click="listDirectory">列出目录内容</button>
          </div>
          
          <div v-if="directoryContents.length" class="contents">
            <h4>目录内容:</h4>
            <ul>
              <li v-for="item in directoryContents" :key="item.name">
                {{ item.name }} ({{ item.kind }})
              </li>
            </ul>
          </div>
          
          <div v-if="fileData" class="file-data">
            <h4>文件内容:</h4>
            <pre>{{ fileData }}</pre>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  import {
    isFileSystemAccessSupported,
    requestPermission,
  } from '../../../../src/toolBox/base/useBrowser/useFileAccessApi/useSandboxFS.js';
  import {buildVFSRoot} from '../../../../src/toolBox/base/useBrowser/useFileAccessApi/useVfsRoot.js';
  const isSupported = isFileSystemAccessSupported();
  const vfs = ref(null);
  const rootName = ref('');
  const fileName = ref('test.txt');
  const fileContent = ref('测试内容');
  const fileData = ref('');
  const dirName = ref('test-dir');
  const directoryContents = ref([]);
  
  const requestRootPermission = async () => {
    try {
      const dirHandle = await requestPermission();
      vfs.value = buildVFSRoot(dirHandle);
      rootName.value = dirHandle.name;
    } catch (error) {
      console.error('获取权限失败:', error);
      alert('获取目录权限失败');
    }
  };
  
  const writeTestFile = async () => {
    if (!vfs.value) {
      alert('请先获取目录权限');
      return;
    }
    
    try {
      await vfs.value.writeFile(fileName.value, fileContent.value);
      alert('文件写入成功');
    } catch (error) {
      console.error('写入文件失败:', error);
      alert('写入文件失败');
    }
  };
  
  const readTestFile = async () => {
    if (!vfs.value) {
      alert('请先获取目录权限');
      return;
    }
    
    try {
      const exists = await vfs.value.existsFile(fileName.value);
      if (!exists) {
        alert('文件不存在');
        return;
      }
      
      fileData.value = await vfs.value.readFile(fileName.value);
    } catch (error) {
      console.error('读取文件失败:', error);
      alert('读取文件失败');
    }
  };
  
  const createDirectory = async () => {
    if (!vfs.value) {
      alert('请先获取目录权限');
      return;
    }
    
    try {
      await vfs.value.mkdir(dirName.value);
      alert('目录创建成功');
    } catch (error) {
      console.error('创建目录失败:', error);
      alert('创建目录失败');
    }
  };
  
  const listDirectory = async () => {
    if (!vfs.value) {
      alert('请先获取目录权限');
      return;
    }
    
    try {
      directoryContents.value = await vfs.value.readdir();
    } catch (error) {
      console.error('列出目录失败:', error);
      alert('列出目录失败');
    }
  };
  </script>
  
  <style scoped>
  .file-system-test {
    padding: 20px;
    max-width: 600px;
    margin: 0 auto;
  }
  
  .operations {
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .operations > div {
    display: flex;
    gap: 10px;
  }
  
  input {
    padding: 5px;
    flex-grow: 1;
  }
  
  button {
    padding: 5px 10px;
    cursor: pointer;
  }
  
  .error {
    color: red;
    font-weight: bold;
  }
  
  .contents, .file-data {
    margin-top: 20px;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  pre {
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  </style>