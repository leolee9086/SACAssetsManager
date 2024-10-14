<template>
  <div class="fn__flex-column fn__flex-1">
    <div class="image-details fn__flex-column fn__flex-1">
      <div class="image-preview fn__flex">
        <div class="fn__space fn__flex-1"></div>
        <multiSrcImage :multiple="true" :src="imageSrc" alt="Image Preview"
          style="width: 256px;height:256px;object-fit: contain" />
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
          <tagsGrid></tagsGrid>
        </div>
        <div class="folder-info">
          <label>本地文件夹</label>
          <input v-model="folder" disabled placeholder="文件夹" />
        </div>
        <div class="folder-info">
          <label>所在笔记</label>
          <input v-model="doc" disabled placeholder="文件夹" />
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
        <button @click="importEagleMetas" v-if="eagleMetas[0]">导入{{ eagleMetas.length }}个eagle元数据</button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue';
import multiSrcImage from './common/multiSrcImage.vue';
import { plugin } from 'runtime'
import { getCommonThumbnailsFromAssets } from '../utils/tumbnail.js'
import _path from '../../polyfills/path.js'
import { kernelApi } from '../../asyncModules.js';
import tagsGrid from './assetInfoPanel/tags.vue';
import { watchStatu,状态注册表 } from '../../globalStatus/index.js';
const path = _path.default
const imageSrc = ref(['http://127.0.0.1/thumbnail/?path=assets%2F42-20240129031127-2sioyhf.jpg']);
const format = ref('JPG');
const name = ref('无选择');
const note = ref('');
const link = ref('');
const folder = ref('浮雕');
const rating = ref('★★★★★');
const dimensions = ref('多种');
const fileSize = ref('多种');
const addedDate = ref('多种');
const createdDate = ref('多种');
const modifiedDate = ref('多种');

const exportImage = () => {
  console.log('导出图片');
};
const eagleMetas = ref([])
const doc = ref('')
const lastAssetPaths = ref([]);

watchStatu(状态注册表.选中的资源, async (newVal) => {
  const assets = Array.from(new Set(newVal))
  const assetPaths = assets.map(asset => asset.data.path);
  // 检查是否与上次的路径列表相同
  if (JSON.stringify(assetPaths) === JSON.stringify(lastAssetPaths.value)) {
    console.log('路径列表未变化，跳过查询');
    return
  }
  lastAssetPaths.value = assetPaths;

  assets && (imageSrc.value = getCommonThumbnailsFromAssets(assets.map(item => item.data)))

  getLabel(assets.map(item => item.data))
  format.value = 获取文件格式(assets.map(item => item.data))
  folder.value = 获取本地文件夹(assets.map(item => item.data))
  eagleMetas.value = await 搜集eagle元数据(assets.map(item => item.data))
  doc.value = (await 获取所在笔记(lastAssetPaths.value)).map(item => item.root_id).join(',')
})

const 获取所在笔记 = async (assetPaths) => {

  // 更新最后处理的路径列表

  const sql = `select * from assets where path in ('${assetPaths.join("','")}')`
  const result = await kernelApi.sql({ stmt: sql })
  console.log(result)
  return result
}

const 搜集eagle元数据 = async (assets) => {
  const results = [];
  for (const asset of assets) {
    const assetDir = path.dirname(asset.path);
    const metadataPath = path.join(assetDir, 'metadata.json').replace(/\\/g, '/')
    try {
      // 检查 metadata.json 文件是否存在
      if (window.require('fs').existsSync(metadataPath)) {
        results.push({
          path: asset.path,
          metaPath: metadataPath
        });
      }

    } catch (error) {
      console.log(`未找到 ${asset.path} 的元数据文件`);
    }
  }

  return results;
}

const getNames = (asset) => {
  return asset.path.split('/').pop()
}
const 获取文件格式 = (assets) => {
  if (assets.length === 0) return '';
  const formats = new Set(assets.map(asset => asset.path.split('.').pop().toUpperCase()));
  if (formats.size === 1) {
    return Array.from(formats)[0];
  } else {
    return '多种';
  }
}

const 获取本地文件夹 = (assets) => {
  if (assets.length === 0) return '';
  const paths = new Set(assets.map(asset => {
    console.log(asset.path)
    if (asset.path.startsWith('assets/')) {
      const parts = path.dirname(siyuan.config.system.workspaceDir + '/data/' + asset.path).replace(/\\/g, '/')
      return parts
    } else {
      const parts = path.dirname(asset.path).replace(/\\/g, '/')
      return parts
    }
  }));

  if (paths.size === 1) {
    return Array.from(paths)[0];
  } else {
    return '多个目录';
  }
}
const getLabel = (assets) => {
  if (assets.length > 0) {
    if (assets.length <= 3) {
      name.value = assets.map(item => getNames(item)).join(', ');
    } else {
      name.value = `${getNames(assets[0])} 等 ${assets.length} 个文件`;
    }
  }
}
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

input[disabled] {
  background-color: #333;
  color: #ccc;
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