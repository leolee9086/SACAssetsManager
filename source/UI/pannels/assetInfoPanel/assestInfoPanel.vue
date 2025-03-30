<template>
  <div class="fn__flex-column fn__flex-1">
    <div class="image-details fn__flex-column fn__flex-1">
      <assetsImage></assetsImage>
      <div class="image-info fn__flex-column fn__flex-1" style="overflow-y: hidden;" @wheel=verticalScrollFirst>
        <label>注释</label>
        <input v-model="note" placeholder="添加注释,可以引用思源的块" />
        <label>来源</label>
        <input v-model="link" placeholder="http://" />
        <div class="tags">
          <label>标签</label>
          <tagsGrid></tagsGrid>
        </div>
        <div class="folder-info" @dblclick="()=>在资源管理器打开本地文件夹数组(currentFolderInfo.folderArray)">
          <label>本地文件夹</label>
          <div @dblclick.stop="()=>在资源管理器打开本地文件夹数组(currentFolderInfo.folderArray)" 
          @click.right.stop ="openFolderAssetsTab"
          class="input-like ariaLabel" placeholder="文件夹"
            :aria-label="`双击在资源管理器打开,右键在新页签打开:\n${Array.from(new Set(currentFolderInfo.folderArray)).join('\n')}`">{{ folder }}</div>
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
import { getCommonThumbnailsFromAssets } from '../../utils/tumbnail.js'
import _path from '../../../../polyfills/path.js'
import tagsGrid from '../../components/assetInfoPanel/tags.vue';
import { watchStatu, 状态注册表 } from '../../../globalStatus/index.js';
import { verticalScrollFirst } from '../../utils/scroll.js';
import assetsImage from '../../components/assetInfoPanel/assetsImage.vue';
import { 打开文件夹数组素材页签 } from './assetinfoPanel.js';
import { 搜集eagle元数据 } from '../../../utils/thirdParty/eagle.js';
import { 在资源管理器打开本地文件夹数组 } from '../../../utils/useRemote/shell.js';
import { 获取数组中素材所在笔记 } from '../../../utils/sql/siyuanSentence.js';

// 导入新工具函数
import { 
  获取资产文件格式, 
  获取资产本地文件夹, 
  生成资产描述标签,
  处理资产路径数组,
  比较资产路径数组
} from '../../../../src/toolBox/feature/forAssets/forAssetInfo.js';
import { 异步清理重复元素, 异步映射 } from '../../../utils/useEcma/useArray/index.js';

const path = _path.default
const imageSrc = ref(['http://127.0.0.1/thumbnail/?path=assets%2F42-20240129031127-2sioyhf.jpg']);
const format = ref('无选择');
const name = ref('无选择');
const note = ref('');
const link = ref('');
const folder = ref('无选择');
const rating = ref('★★★★★');
const dimensions = ref('无选择');
const fileSize = ref('无选择');
const addedDate = ref('无选择');
const createdDate = ref('无选择');
const modifiedDate = ref('无选择');

const exportImage = () => {
  console.log('导出图片');
};
const eagleMetas = ref([])
const doc = ref('')
const lastAssetPaths = ref([]);
const currentFolderInfo = ref({
  folderArray: [],
  displayText: '无选择'
});

const openFolderAssetsTab = () => {
  if (currentFolderInfo.value.folderArray.length > 0) {
    打开文件夹数组素材页签(currentFolderInfo.value.folderArray)
  } else {
    console.log('没有可打开的文件夹');
  }
}

watchStatu(状态注册表.选中的资源, async (newVal) => {
  const assets = await 异步清理重复元素(newVal)
  const assetPaths = await 异步映射(assets, asset => asset?.data?.path);
  
  if (!assetPaths[0]) {
    console.log('未获取到选中列表,跳过查询');
    return;
  }
  
  // 使用新工具函数比较资产路径数组
  if (比较资产路径数组(assetPaths, lastAssetPaths.value)) {
    console.log('路径列表未变化，跳过查询');
    return;
  }
  
  lastAssetPaths.value = assetPaths;
  
  // 处理缩略图
  if (assets) {
    imageSrc.value = getCommonThumbnailsFromAssets(
      assets.map(item => item && item.data).filter(item => item)
    );
  }
  
  // 使用新工具函数生成资产描述
  const assetDataList = assets.map(item => item.data);
  name.value = 生成资产描述标签(assetDataList);
  
  // 使用新工具函数获取文件格式
  format.value = 获取资产文件格式(assetDataList);
  
  // 使用新工具函数获取文件夹信息
  const folderInfo = 获取资产本地文件夹(assetDataList);
  currentFolderInfo.value = folderInfo;
  folder.value = folderInfo.displayText;
  
  // 获取Eagle元数据
  eagleMetas.value = await 搜集eagle元数据(assetDataList);
  
  // 获取所在笔记
  doc.value = (await 获取数组中素材所在笔记(lastAssetPaths.value))
    .map(item => item.root_id)
    .join(',');
})

const getNames = (asset) => {
  return asset?.path.split('/').pop()
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

const currentFolderArray = ref([])
const 获取本地文件夹 = (assets) => {
  if (assets.length === 0) {
    currentFolderArray.value = []
    return '无选择'
  };

  currentFolderArray.value = assets.map(asset => {
    console.log(asset?.path);
    if (asset?.path.startsWith('assets/')) {
      return path.dirname(siyuan.config.system.workspaceDir + '/data/' + asset?.path).replace(/\\/g, '/');
    } else {
      return path.dirname(asset?.path).replace(/\\/g, '/');
    }
  });

  const paths = new Set(currentFolderArray.value);

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
  background-color: var(--b3-theme-surface);
  color: var(--b3-theme-on-surface);
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

.input-like {
  width: 100%;
  padding: 5px;
  margin: 5px 0;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  background-color: #f9f9f9;
  color: #333;
  cursor: pointer;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.input-like:disabled {
  background-color: #333;
  color: #ccc;
}
</style>