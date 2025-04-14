/**
 * AI配置编辑器功能模块
 * 提供AI配置的加载、修改和保存功能
 */

// 导入必要的模块
import { ref, reactive, watch } from '../../../../static/vue.esm-browser.js';
import { getPluginByName } from '../../../../src/toolBox/useAge/forSiyuan/forSiyuanPlugin/forQuery.js';

// 获取插件实例
const plugin = getPluginByName('SACAssetsManager');

/**
 * 创建配置编辑器
 * @returns {Object} 配置编辑器对象
 */
export function createConfigEditor() {
  // 配置存储
  const configStore = reactive({
    // 当前正在编辑的配置
    currentConfig: {},
    // 保存的配置列表
    savedConfigs: [],
    // 配置描述信息
    savedDescribes: {},
    // 新配置名称
    newConfigName: '',
    // 消息提示
    message: {
      show: false,
      content: '',
      type: 'info',
      timer: null
    }
  });

  /**
   * 显示消息提示
   * @param {string} content - 消息内容
   * @param {string} type - 消息类型 (info, success, warning, error)
   */
  const showMessage = (content, type = 'info') => {
    if (configStore.message.timer) {
      clearTimeout(configStore.message.timer);
    }
    configStore.message.show = true;
    configStore.message.content = content;
    configStore.message.type = type;
    configStore.message.timer = setTimeout(() => {
      configStore.message.show = false;
    }, 3000);
  };

  /**
   * 初始化配置数据
   */
  const initData = async () => {
    try {
      // 加载当前AI配置
      loadCurrentConfig();
      
      // 加载保存的配置
      if (plugin) {
        const configsData = await plugin.loadData('ai-configs.json');
        if (configsData) {
          configStore.savedConfigs = configsData;
        }
        
        const describesData = await plugin.loadData('ai-describes.json');
        if (describesData) {
          configStore.savedDescribes = describesData;
        }
      }
    } catch (error) {
      console.error('初始化配置数据出错:', error);
      showMessage('初始化配置数据出错', 'error');
    }
  };

  /**
   * 加载当前思源笔记的AI配置
   */
  const loadCurrentConfig = () => {
    try {
      // 复制当前思源AI配置
      const aiConfig = window.siyuan?.config?.ai?.openAI || {};
      Object.keys(aiConfig).forEach(key => {
        configStore.currentConfig[key] = aiConfig[key];
      });
      
      // 如果没有配置，添加一些默认字段
      if (Object.keys(configStore.currentConfig).length === 0) {
        configStore.currentConfig.apiKey = '';
        configStore.currentConfig.apiBaseUrl = 'https://api.openai.com';
        configStore.currentConfig.proxy = '';
        configStore.currentConfig.timeout = 30000;
        configStore.currentConfig.maxTokens = 2048;
      }
    } catch (error) {
      console.error('加载当前配置出错:', error);
      showMessage('加载当前配置出错', 'error');
    }
  };

  /**
   * 保存当前配置到思源笔记
   */
  const saveCurrentConfig = async () => {
    try {
      // 更新思源的AI配置
      if (window.siyuan?.config?.ai) {
        window.siyuan.config.ai.openAI = { ...configStore.currentConfig };
        
        // 调用思源API保存设置
        const response = await fetch('/api/setting/setAccount', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: window.siyuan.user.name,
            password: window.siyuan.user.password
          })
        });
        
        if (response.ok) {
          showMessage('配置已保存到思源笔记', 'success');
        } else {
          throw new Error('保存设置失败');
        }
      } else {
        throw new Error('无法访问思源配置');
      }
    } catch (error) {
      console.error('保存当前配置出错:', error);
      showMessage('保存当前配置出错', 'error');
    }
  };

  /**
   * 保存为新配置
   * @param {string} configName - 配置名称
   */
  const saveAsNewConfig = async (configName) => {
    if (!configName) return;
    
    try {
      // 使用传入的名称或状态中的名称
      const name = configName || configStore.newConfigName;
      
      // 检查是否已存在同名配置
      const existingIndex = configStore.savedConfigs.findIndex(c => c.name === name);
      
      if (existingIndex >= 0) {
        // 更新现有配置
        configStore.savedConfigs[existingIndex].value = { ...configStore.currentConfig };
        showMessage(`已更新配置: ${name}`, 'success');
      } else {
        // 添加新配置
        configStore.savedConfigs.push({
          name: name,
          value: { ...configStore.currentConfig }
        });
        
        // 初始化描述
        if (!configStore.savedDescribes[name]) {
          configStore.savedDescribes[name] = {
            describe: '',
            createTime: Date.now()
          };
        }
        
        showMessage(`已保存新配置: ${name}`, 'success');
      }
      
      // 保存配置到插件数据
      await saveConfigsToPlugin();
      
      // 清空输入
      configStore.newConfigName = '';
    } catch (error) {
      console.error('保存新配置出错:', error);
      showMessage('保存新配置出错', 'error');
    }
  };

  /**
   * 加载指定配置
   * @param {Object} config - 要加载的配置对象
   */
  const loadConfig = (config) => {
    try {
      // 清空当前配置
      Object.keys(configStore.currentConfig).forEach(key => {
        delete configStore.currentConfig[key];
      });
      
      // 将选择的配置复制到当前配置
      Object.keys(config.value).forEach(key => {
        configStore.currentConfig[key] = config.value[key];
      });
      
      showMessage(`已加载配置: ${config.name}`, 'success');
    } catch (error) {
      console.error('加载配置出错:', error);
      showMessage('加载配置出错', 'error');
    }
  };

  /**
   * 删除配置
   * @param {Object} config - 要删除的配置对象
   */
  const deleteConfig = async (config) => {
    try {
      const index = configStore.savedConfigs.findIndex(c => c.name === config.name);
      if (index >= 0) {
        configStore.savedConfigs.splice(index, 1);
        
        // 同时删除描述
        if (configStore.savedDescribes[config.name]) {
          delete configStore.savedDescribes[config.name];
        }
        
        // 保存到插件数据
        await saveConfigsToPlugin();
        
        showMessage(`已删除配置: ${config.name}`, 'success');
      }
    } catch (error) {
      console.error('删除配置出错:', error);
      showMessage('删除配置出错', 'error');
    }
  };

  /**
   * 保存配置到插件数据
   */
  const saveConfigsToPlugin = async () => {
    if (plugin) {
      await plugin.saveData('ai-configs.json', configStore.savedConfigs);
      await plugin.saveData('ai-describes.json', configStore.savedDescribes);
    } else {
      throw new Error('无法访问插件API');
    }
  };

  /**
   * 导出所有配置
   */
  const exportAllConfigs = () => {
    try {
      // 准备导出数据
      const exportData = {
        configs: configStore.savedConfigs,
        describes: configStore.savedDescribes,
        exportTime: Date.now()
      };
      
      // 创建下载链接
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `AI配置备份_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      showMessage('配置已导出', 'success');
    } catch (error) {
      console.error('导出配置出错:', error);
      showMessage('导出配置出错', 'error');
    }
  };

  /**
   * 导入配置文件
   * @param {File} file - 要导入的文件
   */
  const importConfigFile = async (file) => {
    try {
      if (!file) return;
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const importData = JSON.parse(e.target.result);
            
            if (importData.configs && Array.isArray(importData.configs)) {
              // 合并配置
              for (const config of importData.configs) {
                const existingIndex = configStore.savedConfigs.findIndex(c => c.name === config.name);
                
                if (existingIndex >= 0) {
                  configStore.savedConfigs[existingIndex] = config;
                } else {
                  configStore.savedConfigs.push(config);
                }
              }
              
              // 合并描述
              if (importData.describes) {
                for (const [name, describe] of Object.entries(importData.describes)) {
                  configStore.savedDescribes[name] = describe;
                }
              }
              
              // 保存到插件数据
              await saveConfigsToPlugin();
              
              showMessage('配置已导入', 'success');
              resolve(true);
            } else {
              throw new Error('配置数据格式不正确');
            }
          } catch (error) {
            console.error('解析导入文件出错:', error);
            showMessage('解析导入文件出错', 'error');
            reject(error);
          }
        };
        
        reader.onerror = (error) => {
          reject(error);
        };
        
        reader.readAsText(file);
      });
    } catch (error) {
      console.error('导入配置文件出错:', error);
      showMessage('导入配置文件出错', 'error');
      return false;
    }
  };

  // 初始化数据
  initData();

  // 返回配置编辑器接口
  return {
    // 状态
    configStore,
    // 方法
    loadCurrentConfig,
    saveCurrentConfig,
    saveAsNewConfig,
    loadConfig,
    deleteConfig,
    exportAllConfigs,
    importConfigFile,
    showMessage
  };
}

// 默认导出
export default createConfigEditor; 