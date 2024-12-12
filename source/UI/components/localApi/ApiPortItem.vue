<template>
    <li @click.right=" ()=>打开搜索面板(
    `http://${api.host}:${api.port}`
  )" class="api-list__subsubitem">
        <everythingPortInputter
        :host="api.host"
        v-model="api.port"
        v-if="api.type==='everything'">
        </everythingPortInputter>
        <input v-if="api.type!=='everything'" v-model="api.port" type="number" min="1" max="65535" :style="{color:isEnabled?'green':'red'}">
    </li>
  </template>
  <script setup>
  import everythingPortInputter from './everything/portInputter.vue';
  import { 打开everything搜索面板,打开anytxt搜索面板 } from '../../siyuanCommon/tabs/assetsTab.js';
  import { checkApiAvailability } from '../../../fromTirdParty/anytext/index.js'; 
  import { onMounted,ref,watch } from 'vue';
import { updateStatu } from '../../../globalStatus/index.js';
  const {api} = defineProps(['api']);
  const isEnabled= ref(null)
  onMounted(
    async()=>{
      if(api.type==='anytxt'){
        isEnabled.value=await checkApiAvailability(api.port)
      
      }
    }
  )
  watch(() => api.port, () => {
    updateStatu(状态注册表.本地文件搜索接口, (currentValue) => {
        return currentValue.map(item => {
            if (item.type === api.type) {
                return { ...item, port: api.port };
            }
            return item;
        });
    });
})
 const 打开搜索面板 = (apiLocation)=>{
    if(api.type==='everything'){
      打开everything搜索面板(apiLocation)
    }
    else{
      打开anytxt搜索面板(apiLocation)
    }
 }

  </script>