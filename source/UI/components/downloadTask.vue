<template>
    <div class="download-task">
      <h2>下载任务管理</h2>
      <ul>
        <li v-for="task in tasks" :key="task.id">
          <span>{{ task.name }}</span>
          <span>{{ task.status }}</span>
          <button @click="pauseTask(task.id)">暂停</button>
          <button @click="resumeTask(task.id)">继续</button>
          <button @click="cancelTask(task.id)">取消</button>
        </li>
      </ul>
    </div>
  </template>
  <script setup>
  import {ref} from 'vue'
  </script>
  
  <style scoped>
  .download-task {
    padding: 20px;
  }
  
  .download-task h2 {
    margin-bottom: 10px;
  }
  
  .download-task ul {
    list-style-type: none;
    padding: 0;
  }
  
  .download-task li {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  
  .download-task button {
    margin-left: 5px;
  }
  </style>