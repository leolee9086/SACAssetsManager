/**
 * 无缝贴图检测器面板
 * 提供单图和批量检测无缝贴图的功能
 */

import MainPanel from './main.vue';

// 面板配置信息
export const panelConfig = {
  name: 'seamless-texture-tester',
  icon: '#iconTexture', // 假设存在纹理图标
  title: '无缝贴图检测器',
  component: MainPanel,
  height: '80vh',
  width: '80vw',
  openWhenInit: false,
  destroyWhenClose: false
};

// 导出面板初始化函数
export const initPanel = (pluginInstance, panelManager) => {
  if (!panelManager) return;
  
  // 注册面板
  panelManager.addPanel({
    config: panelConfig,
    plugin: pluginInstance
  });
  
  // 添加到工具菜单
  pluginInstance.addCommand({
    langKey: 'seamlessTextureDetector',
    langText: {
      'zh_CN': '无缝贴图检测器',
      'en_US': 'Seamless Texture Detector'
    },
    hotkey: '',
    callback: () => {
      panelManager.openPanel(panelConfig.name, true);
    }
  });
  
  console.log('无缝贴图检测器面板已注册');
}; 