<template>
  <div class="panel-launcher">
    <div class="panel-launcher__header">
      <h2>可用面板</h2>
      <div class="panel-launcher__search">
        <input type="text" v-model="searchQuery" placeholder="搜索面板..." />
      </div>
    </div>
    
    <div class="panel-launcher__grid">
      <div 
        v-for="panel in filteredPanels" 
        :key="panel.name" 
        class="panel-card"
        @click="openPanel(panel)"
      >
        <div class="panel-card__icon">
          <svg><use :xlink:href="panel.icon || '#iconPanel'"></use></svg>
        </div>
        <div class="panel-card__content">
          <h3 class="panel-card__title">{{ panel.name }}</h3>
          <p class="panel-card__desc">{{ panel.description || '暂无描述' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { plugin } from '../../../pluginSymbolRegistry.js';
import { 打开图片编辑器窗口, 打开图片画板窗口, 打开xbel窗口 } from '../windows/electronWindowManager.js';
import { 以关键词匹配对象 } from '../../../../src/utils/strings/search.js';
import _pinyin from '../../../../static/pinyin.js';

// 面板数据
const panels = ref([]);
const searchQuery = ref('');

// 根据搜索词过滤面板
const filteredPanels = computed(() => {
  const query = searchQuery.value.trim();
  if (!query) return panels.value;
  
  return panels.value.filter(panel => 
    以关键词匹配对象(query, panel, ['name', 'description'])
  );
});

// 打开面板
const openPanel = (panel) => {
  if (panel.type === 'electron') {
    // 打开Electron窗口
    switch (panel.windowType) {
      case 'imageEditor':
        打开图片编辑器窗口(panel.imagePath || '');
        break;
      case 'drawBoard':
        打开图片画板窗口(panel.imagePath || '');
        break;
      case 'xbel':
        打开xbel窗口(panel.imagePath || '');
        break;
      default:
        console.error('未知的窗口类型:', panel.windowType);
    }
  } else {
    // 打开思源标签页
    plugin.app.openTab({
      custom: {
        icon: panel.icon || 'iconPanel',
        title: panel.name,
        id: `${plugin.name}-${panel.name}`,
        data: panel.data || {}
      }
    });
  }
};

// 从面板目录获取面板列表
const loadPanelsFromDirectory = async () => {
  try {
    // 获取面板目录列表
    const fs = await import('../../../../polyfills/fs.js');
    const pannelPath = '/data/plugins/SACAssetsManager/source/UI/pannels';
    const files = await fs.default.readDir(pannelPath);
    
    // 将目录转换为面板数据
    const directoryPanels = files.filter(file => file.isDir).map(dir => ({
      name: dir.name,
      description: `${dir.name}面板`,
      type: 'tab',
      icon: 'iconPanel'
    }));
    
    // 添加Electron窗口面板
    const electronPanels = [
      {
        name: '图片编辑器',
        description: '调整图片亮度、对比度等参数',
        type: 'electron',
        windowType: 'imageEditor',
        icon: 'iconImage'
      },
      {
        name: '图片画板',
        description: '在图片上绘制标注和注释',
        type: 'electron',
        windowType: 'drawBoard',
        icon: 'iconEdit'
      },
      {
        name: 'XBEL编辑器',
        description: '编辑XML书签交换语言文件',
        type: 'electron',
        windowType: 'xbel',
        icon: 'iconFile'
      }
    ];
    
    // 合并所有面板
    panels.value = [...directoryPanels, ...electronPanels];
  } catch (error) {
    console.error('加载面板列表失败:', error);
    panels.value = [];
  }
};

onMounted(() => {
  loadPanelsFromDirectory();
});
</script>

<style>
.panel-launcher {
  padding: 16px;
  height: 100%;
  overflow: auto;
}

.panel-launcher__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.panel-launcher__search input {
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid var(--b3-border-color);
  background-color: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  width: 200px;
}

.panel-launcher__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.panel-card {
  display: flex;
  padding: 16px;
  border-radius: 4px;
  background-color: var(--b3-theme-surface);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.panel-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.panel-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-right: 16px;
}

.panel-card__icon svg {
  width: 32px;
  height: 32px;
  color: var(--b3-theme-primary);
}

.panel-card__content {
  flex: 1;
}

.panel-card__title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--b3-theme-on-surface);
}

.panel-card__desc {
  margin: 0;
  font-size: 14px;
  color: var(--b3-theme-on-surface-light);
}
</style> 