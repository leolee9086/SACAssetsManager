<!-- 
  AI密钥管理面板
  兼容SACKeyManager的密钥存储和管理功能
-->
<template>
  <div class="key-manager">
    <div class="header">
      <h2>AI密钥管理</h2>
      <div class="actions">
        <button @click="importFromOldPlugin" class="primary-button" title="从SACKeyManager导入配置">
          <i class="import-icon"></i>导入旧配置
        </button>
        <button @click="saveCurrentConfig" class="normal-button">
          <i class="save-icon"></i>保存当前配置
        </button>
      </div>
    </div>

    <div class="current-config-section">
      <h3>当前AI配置</h3>
      <div class="config-form">
        <div class="form-group" v-for="(value, key) in configStore.currentConfig" :key="key">
          <label :for="key">{{ formatKeyName(key) }}</label>
          <input 
            :type="getInputType(key)" 
            :id="key" 
            v-model="configStore.currentConfig[key]" 
          />
        </div>
      </div>
    </div>

    <div class="saved-configs-section">
      <div class="section-header">
        <h3>已保存的配置</h3>
        <div class="section-actions">
          <input 
            v-model="configStore.newConfigName" 
            placeholder="配置名称" 
            class="config-name-input" 
          />
          <button 
            @click="saveAsNewConfig" 
            class="small-button" 
            :disabled="!configStore.newConfigName"
          >
            保存新配置
          </button>
        </div>
      </div>

      <div class="saved-configs-list">
        <div 
          v-for="config in configStore.savedConfigs" 
          :key="config.name" 
          class="config-item"
        >
          <div class="config-info">
            <span class="config-name">{{ config.name }}</span>
            <span class="config-desc">{{ configStore.savedDescribes[config.name]?.describe || '无描述' }}</span>
          </div>
          <div class="config-actions">
            <button @click="() => loadConfig(config)" class="icon-button" title="加载配置">
              <i class="load-icon"></i>
            </button>
            <button @click="() => deleteConfig(config)" class="icon-button" title="删除配置">
              <i class="delete-icon"></i>
            </button>
          </div>
        </div>
        <div v-if="configStore.savedConfigs.length === 0" class="empty-message">
          没有保存的配置
        </div>
      </div>
    </div>

    <div class="import-export-section">
      <h3>导入/导出</h3>
      <div class="section-actions">
        <button @click="exportAllConfigs" class="normal-button">
          <i class="export-icon"></i>导出所有配置
        </button>
        <button @click="triggerImportFile" class="normal-button">
          <i class="import-icon"></i>导入配置文件
        </button>
        <input 
          type="file" 
          ref="fileInput" 
          style="display: none" 
          @change="handleFileImport" 
          accept=".json" 
        />
      </div>
    </div>

    <!-- 消息提示 -->
    <div v-if="configStore.message.show" class="message" :class="configStore.message.type">
      {{ configStore.message.content }}
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import fs from '../../../../polyfills/fs.js';
import { getPluginByName } from '../../../../src/toolBox/useAge/forSiyuan/forSiyuanPlugin/forQuery.js';
import { createConfigEditor } from '../aiNotes/config-editor.js';

export default {
  name: 'KeyManager',
  setup() {
    // 创建配置编辑器
    const { 
      configStore, 
      saveCurrentConfig, 
      saveAsNewConfig, 
      loadConfig, 
      deleteConfig, 
      exportAllConfigs, 
      importConfigFile,
      showMessage
    } = createConfigEditor();
    
    // 文件输入引用
    const fileInput = ref(null);
    
    // 从SACKeyManager导入配置
    const importFromOldPlugin = async () => {
      try {
        // 使用文件系统API导入
        const importSuccess = await importFromOldPluginData();
        
        if (!importSuccess) {
          // 如果没有找到数据，显示提示
          showMessage('未找到SACKeyManager配置数据', 'warning');
        }
      } catch (error) {
        console.error('导入旧插件配置出错:', error);
        showMessage(`导入出错: ${error.message}`, 'error');
      }
      
      return false;
    };
    
    // 从SACKeyManager的数据文件导入配置
    const importFromOldPluginData = async (showSuccessMessage = true) => {
      try {
        console.log('尝试从工作空间存储目录导入SACKeyManager数据');
        const plugin = getPluginByName('SACAssetsManager');
        
        // 检查旧插件数据目录是否存在
        const oldPluginPath = '/data/storage/petal/SACKeyManager';
        
        // 使用fs.exists检查目录是否存在
        const dirExists = await fs.exists(oldPluginPath);
        if (!dirExists) {
          console.warn(`SACKeyManager数据目录不存在: ${oldPluginPath}`);
          throw new Error('未找到SACKeyManager的数据目录');
        }
        
        // 列出目录内容
        const files = await fs.readDir(oldPluginPath);
        console.log('找到SACKeyManager的数据文件:', files);
        
        // 检查描述文件
        const describesFile = files.find(f => f.name === 'describes');
        let describesData = {};
        
        if (describesFile) {
          try {
            const describesContent = await fs.readFile(`${oldPluginPath}/describes`);
            describesData = JSON.parse(describesContent);
            console.log('读取到描述文件:', describesData);
          } catch (descError) {
            console.warn('读取描述文件出错:', descError);
          }
        }
        
        // 读取每个配置文件（除了describes之外的所有文件）
        const configFiles = files.filter(f => f.name !== 'describes');
        let importedConfigs = [];
        
        for (const configFile of configFiles) {
          try {
            const configPath = `${oldPluginPath}/${configFile.name}`;
            console.log(`读取配置文件: ${configPath}`);
            const configContent = await fs.readFile(configPath);
            
            if (configContent) {
              const configData = JSON.parse(configContent);
              
              // 创建配置对象
              importedConfigs.push({
                name: configFile.name,
                value: configData
              });
              
              console.log(`成功导入配置 "${configFile.name}"`);
            }
          } catch (configError) {
            console.warn(`读取配置文件 "${configFile.name}" 出错:`, configError);
          }
        }
        
        if (importedConfigs.length === 0) {
          throw new Error('未找到有效的配置文件');
        }
        
        // 导入到当前应用
        console.log(`导入${importedConfigs.length}个配置:`, importedConfigs);
        
        // 合并配置
        for (const config of importedConfigs) {
          const existingIndex = configStore.savedConfigs.findIndex(c => c.name === config.name);
          
          if (existingIndex >= 0) {
            configStore.savedConfigs[existingIndex] = config;
          } else {
            configStore.savedConfigs.push(config);
          }
        }
        
        // 合并描述
        for (const [name, describe] of Object.entries(describesData)) {
          configStore.savedDescribes[name] = describe;
        }
        
        // 使用configEditor的保存方法
        await plugin.saveData('ai-configs.json', configStore.savedConfigs);
        await plugin.saveData('ai-describes.json', configStore.savedDescribes);
        
        if (showSuccessMessage) {
          showMessage(`已从SACKeyManager导入${importedConfigs.length}个配置`, 'success');
        }
        
        return importedConfigs.length > 0;
      } catch (error) {
        console.error('从数据文件导入配置出错:', error);
        if (showSuccessMessage) {
          showMessage(`导入出错: ${error.message}`, 'error');
        }
        return false;
      }
    };
    
    // 触发导入文件选择
    const triggerImportFile = () => {
      fileInput.value.click();
    };
    
    // 处理文件导入
    const handleFileImport = async (event) => {
      try {
        const file = event.target.files[0];
        if (file) {
          await importConfigFile(file);
        }
      } catch (error) {
        showMessage('导入文件失败: ' + error.message, 'error');
      } finally {
        // 清空文件输入，以便再次选择同一文件
        event.target.value = '';
      }
    };
    
    // 格式化键名
    const formatKeyName = (key) => {
      if (!key) return '';
      
      // 常见字段的中文名
      const nameMap = {
        apiKey: 'API密钥',
        apiBaseUrl: 'API基础URL',
        apiBaseURL: 'API基础URL',
        proxy: '代理服务器',
        apiProxy: '代理服务器',
        timeout: '超时时间(毫秒)',
        apiTimeout: '超时时间(秒)',
        maxTokens: '最大标记数',
        apiMaxTokens: '最大标记数',
        temperature: '温度',
        apiTemperature: '温度',
        topP: 'Top-P值',
        model: '模型名称',
        apiModel: '模型名称',
        apiProvider: 'API提供商',
        apiVersion: 'API版本',
        apiUserAgent: '用户代理'
      };
      
      return nameMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    };
    
    // 根据键名获取输入类型
    const getInputType = (key) => {
      if (key.toLowerCase().includes('key') || key.toLowerCase().includes('secret')) {
        return 'password';
      } else if (
        key === 'timeout' || 
        key === 'apiTimeout' || 
        key === 'maxTokens' || 
        key === 'apiMaxTokens' ||
        key === 'temperature' ||
        key === 'apiTemperature'
      ) {
        return 'number';
      } else {
        return 'text';
      }
    };

    return {
      configStore,
      saveCurrentConfig,
      saveAsNewConfig: () => saveAsNewConfig(configStore.newConfigName),
      loadConfig,
      deleteConfig,
      exportAllConfigs,
      importFromOldPlugin,
      fileInput,
      triggerImportFile,
      handleFileImport,
      formatKeyName,
      getInputType
    };
  }
};
</script>

<style scoped>
.key-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  overflow-y: auto;
  background-color: var(--b3-theme-background, #fff);
  color: var(--b3-theme-on-background, #333);
  font-family: var(--b3-font-family);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 8px;
}

button {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.primary-button {
  background-color: var(--b3-theme-primary, #4285f4);
  color: white;
}

.primary-button:hover {
  background-color: var(--b3-theme-primary-light, #5294f5);
}

.normal-button {
  background-color: var(--b3-theme-surface, #f5f5f5);
  color: var(--b3-theme-on-surface, #333);
  border-color: var(--b3-border-color);
}

.normal-button:hover {
  background-color: var(--b3-theme-surface-light, #e8e8e8);
}

.small-button {
  padding: 4px 8px;
  font-size: 12px;
  background-color: var(--b3-theme-surface, #f5f5f5);
  color: var(--b3-theme-on-surface, #333);
  border-color: var(--b3-border-color);
}

.small-button:hover {
  background-color: var(--b3-theme-surface-light, #e8e8e8);
}

.small-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-button {
  padding: 6px;
  background: transparent;
}

.icon-button:hover {
  background-color: var(--b3-theme-surface-light, #e8e8e8);
}

.current-config-section,
.saved-configs-section,
.import-export-section {
  margin-bottom: 20px;
  padding: 16px;
  background-color: var(--b3-theme-surface, #f5f5f5);
  border-radius: 8px;
  border: 1px solid var(--b3-border-color);
}

h3 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 1.1rem;
  font-weight: 500;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.config-name-input {
  padding: 4px 8px;
  border: 1px solid var(--b3-border-color);
  border-radius: 4px;
  font-size: 13px;
}

.config-form {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
}

.form-group label {
  font-size: 13px;
  margin-bottom: 4px;
  color: var(--b3-theme-on-surface-light, #666);
}

.form-group input {
  padding: 8px;
  border: 1px solid var(--b3-border-color);
  border-radius: 4px;
  background-color: var(--b3-theme-background, #fff);
  font-size: 14px;
}

.saved-configs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: var(--b3-theme-background, #fff);
  border-radius: 4px;
  border: 1px solid var(--b3-border-color);
  transition: background-color 0.2s;
}

.config-item:hover {
  background-color: var(--b3-theme-surface-lighter, #e8e8e8);
}

.config-info {
  display: flex;
  flex-direction: column;
}

.config-name {
  font-weight: 500;
  font-size: 14px;
}

.config-desc {
  font-size: 12px;
  color: var(--b3-theme-on-surface-light, #666);
  margin-top: 4px;
}

.config-actions {
  display: flex;
  gap: 8px;
}

.empty-message {
  color: #999;
  font-style: italic;
  padding: 12px;
  text-align: center;
}

.message {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 10px 16px;
  border-radius: 4px;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 999;
  opacity: 0.9;
  transition: opacity 0.3s;
}

.message.info {
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
  color: #1890ff;
}

.message.success {
  background-color: #f6ffed;
  border: 1px solid #b7eb8f;
  color: #52c41a;
}

.message.warning {
  background-color: #fffbe6;
  border: 1px solid #ffe58f;
  color: #faad14;
}

.message.error {
  background-color: #fff2f0;
  border: 1px solid #ffccc7;
  color: #ff4d4f;
}
</style> 