<!--
  自动测试管理器组件
  提供自动测试的控制和配置管理
-->
<template>
  <div class="test-manager">
    <div class="test-manager-header">
      <h2>自动测试管理</h2>
      <div class="action-buttons">
        <button @click="runAllTests" class="primary-button" :disabled="isRunning">
          <i class="run-icon"></i>运行所有测试
        </button>
        <button @click="saveConfig" class="normal-button">
          <i class="save-icon"></i>保存配置
        </button>
      </div>
    </div>
    
    <div class="test-categories">
      <!-- 基础工具测试 -->
      <div class="test-category">
        <div class="category-header" @click="toggleCategory('base')">
          <i class="toggle-icon" :class="{'expanded': expandedCategories.base}"></i>
          <h3>基础工具测试 (@base)</h3>
          <div class="category-controls">
            <label class="switch">
              <input type="checkbox" v-model="testConfig.categories.base.enabled" @change="updateConfig">
              <span class="slider"></span>
            </label>
          </div>
        </div>
        <div class="category-tests" v-if="expandedCategories.base">
          <div class="test-item" v-for="(test, name) in baseTests" :key="name">
            <span class="test-name">{{ name }}</span>
            <div class="test-controls">
              <label class="switch">
                <input type="checkbox" v-model="test.enabled" @change="updateConfig">
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div v-if="Object.keys(baseTests).length === 0" class="empty-message">
            没有找到测试文件
          </div>
        </div>
      </div>
      
      <!-- 功能特性测试 -->
      <div class="test-category">
        <div class="category-header" @click="toggleCategory('feature')">
          <i class="toggle-icon" :class="{'expanded': expandedCategories.feature}"></i>
          <h3>功能特性测试 (@feature)</h3>
          <div class="category-controls">
            <label class="switch">
              <input type="checkbox" v-model="testConfig.categories.feature.enabled" @change="updateConfig">
              <span class="slider"></span>
            </label>
          </div>
        </div>
        <div class="category-tests" v-if="expandedCategories.feature">
          <div class="test-item" v-for="(test, name) in featureTests" :key="name">
            <span class="test-name">{{ name }}</span>
            <div class="test-controls">
              <label class="switch">
                <input type="checkbox" v-model="test.enabled" @change="updateConfig">
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div v-if="Object.keys(featureTests).length === 0" class="empty-message">
            没有找到测试文件
          </div>
        </div>
      </div>
      
      <!-- 应用场景测试 -->
      <div class="test-category">
        <div class="category-header" @click="toggleCategory('useAge')">
          <i class="toggle-icon" :class="{'expanded': expandedCategories.useAge}"></i>
          <h3>应用场景测试 (@useAge)</h3>
          <div class="category-controls">
            <label class="switch">
              <input type="checkbox" v-model="testConfig.categories.useAge.enabled" @change="updateConfig">
              <span class="slider"></span>
            </label>
          </div>
        </div>
        <div class="category-tests" v-if="expandedCategories.useAge">
          <div class="test-item" v-for="(test, name) in useAgeTests" :key="name">
            <span class="test-name">{{ name }}</span>
            <div class="test-controls">
              <label class="switch">
                <input type="checkbox" v-model="test.enabled" @change="updateConfig">
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div v-if="Object.keys(useAgeTests).length === 0" class="empty-message">
            没有找到测试文件
          </div>
        </div>
      </div>
    </div>
    
    <!-- 运行选项设置 -->
    <div class="test-options">
      <h3>运行选项</h3>
      <div class="option-item">
        <label>
          <input type="checkbox" v-model="testConfig.options.autoRunOnStartup" @change="updateConfig">
          启动时自动运行测试
        </label>
      </div>
      <div class="option-item">
        <label>
          <input type="checkbox" v-model="testConfig.options.stopOnFirstFailure" @change="updateConfig">
          遇到第一个失败时停止
        </label>
      </div>
      <div class="option-item">
        <label>
          <input type="checkbox" v-model="testConfig.options.logToConsole" @change="updateConfig">
          输出详细日志到控制台
        </label>
      </div>
      <div class="option-item">
        <label>
          忽略测试超时时间 (毫秒)
          <input type="number" v-model.number="testConfig.options.timeout" @change="updateConfig" min="1000" step="1000">
        </label>
      </div>
    </div>
    
    <!-- 测试结果 -->
    <div class="test-results" v-if="lastTestRun">
      <h3>最近测试结果</h3>
      <div class="results-summary">
        <div class="result-item">
          <span class="result-label">运行时间:</span>
          <span class="result-value">{{ formatDate(lastTestRun.timestamp) }}</span>
        </div>
        <div class="result-item">
          <span class="result-label">总测试数:</span>
          <span class="result-value">{{ lastTestRun.total }}</span>
        </div>
        <div class="result-item">
          <span class="result-label">成功:</span>
          <span class="result-value success">{{ lastTestRun.passed }}</span>
        </div>
        <div class="result-item">
          <span class="result-label">失败:</span>
          <span class="result-value" :class="{'failure': lastTestRun.failed > 0}">{{ lastTestRun.failed }}</span>
        </div>
        <div class="result-item">
          <span class="result-label">耗时:</span>
          <span class="result-value">{{ lastTestRun.duration }}毫秒</span>
        </div>
      </div>
    </div>
    
    <!-- 消息提示 -->
    <div v-if="message.show" class="message" :class="message.type">
      {{ message.content }}
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, watch } from 'vue';

// 使用Node.js文件系统API
const fs = window.require ? window.require('fs') : null;
const path = window.require ? window.require('path') : null;

export default {
  name: 'TestManager',
  setup() {
    // 测试配置
    const testConfig = reactive({
      categories: {
        base: {
          enabled: true,
          path: 'tests/base'
        },
        feature: {
          enabled: true,
          path: 'tests/feature'
        },
        useAge: {
          enabled: true,
          path: 'tests/useAge'
        }
      },
      options: {
        autoRunOnStartup: false,
        stopOnFirstFailure: false,
        logToConsole: true,
        timeout: 10000 // 默认超时时间10秒
      },
      tests: {}
    });

    // UI状态
    const expandedCategories = reactive({
      base: true,
      feature: true,
      useAge: true
    });
    
    const isRunning = ref(false);
    const lastTestRun = ref(null);
    
    // 分类测试列表
    const baseTests = reactive({});
    const featureTests = reactive({});
    const useAgeTests = reactive({});
    
    // 消息提示
    const message = reactive({
      show: false,
      content: '',
      type: 'info',
      timer: null
    });
    
    // 工作区路径
    const workspacePath = window.siyuan?.config?.system?.workspaceDir || process.cwd() || '';
    
    // 插件路径
    const pluginPath = window.siyuan?.plugins ? 
      (window.siyuan.plugins.find(p => p.name === 'SACAssetsManager')?.path || '') : '';
    
    // 测试配置文件路径
    const configFilePath = path?.join(workspacePath, 'data/plugins/SACAssetsManager/tests/test-config.json') || '';
    
    // 插件实例（从全局变量获取）
    const plugin = window.siyuan?.plugins?.find(p => p.name === 'SACAssetsManager');
    
    // 显示消息提示
    const showMessage = (content, type = 'info') => {
      if (message.timer) {
        clearTimeout(message.timer);
      }
      message.show = true;
      message.content = content;
      message.type = type;
      message.timer = setTimeout(() => {
        message.show = false;
      }, 3000);
    };
    
    // 加载测试配置
    const loadConfig = async () => {
      try {
        if (plugin) {
          // 使用插件API读取配置
          const configData = await plugin.loadData('test-config.json');
          
          if (configData) {
            // 更新配置
            Object.assign(testConfig.options, configData.options || {});
            
            // 更新分类启用状态
            for (const category in configData.categories) {
              if (testConfig.categories[category]) {
                testConfig.categories[category].enabled = 
                  configData.categories[category].enabled;
              }
            }
            
            // 更新测试项
            testConfig.tests = configData.tests || {};
            
            showMessage('测试配置已加载', 'success');
          } else {
            // 创建默认配置
            saveConfig();
            showMessage('已创建默认测试配置', 'info');
          }
        } else if (fs && path && configFilePath) {
          // 备用方案：使用文件系统API
          if (fs.existsSync(configFilePath)) {
            const configData = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
            
            // 更新配置
            Object.assign(testConfig.options, configData.options || {});
            
            for (const category in configData.categories) {
              if (testConfig.categories[category]) {
                testConfig.categories[category].enabled = 
                  configData.categories[category].enabled;
              }
            }
            
            testConfig.tests = configData.tests || {};
            
            showMessage('测试配置已加载', 'success');
          } else {
            // 创建默认配置
            saveConfig();
            showMessage('已创建默认测试配置', 'info');
          }
        } else {
          showMessage('无法访问存储API', 'error');
        }
      } catch (error) {
        console.error('加载测试配置出错:', error);
        showMessage('加载测试配置出错', 'error');
      }
    };
    
    // 保存测试配置
    const saveConfig = async () => {
      try {
        if (plugin) {
          // 使用插件API保存配置
          await plugin.saveData('test-config.json', testConfig);
          showMessage('测试配置已保存', 'success');
        } else if (fs && path && configFilePath) {
          // 备用方案：使用文件系统API
          const configDir = path.dirname(configFilePath);
          if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
          }
          
          fs.writeFileSync(
            configFilePath, 
            JSON.stringify(testConfig, null, 2), 
            'utf8'
          );
          
          showMessage('测试配置已保存', 'success');
        } else {
          showMessage('无法访问存储API', 'error');
        }
      } catch (error) {
        console.error('保存测试配置出错:', error);
        showMessage('保存测试配置出错', 'error');
      }
    };
    
    // 更新配置
    const updateConfig = () => {
      // 每次更改都会保存配置
      saveConfig();
    };
    
    // 切换分类展开状态
    const toggleCategory = (category) => {
      expandedCategories[category] = !expandedCategories[category];
    };
    
    // 扫描测试文件
    const scanTestFiles = () => {
      try {
        // 清空现有测试
        Object.keys(baseTests).forEach(key => delete baseTests[key]);
        Object.keys(featureTests).forEach(key => delete featureTests[key]);
        Object.keys(useAgeTests).forEach(key => delete useAgeTests[key]);
        
        // 扫描基础测试
        scanCategoryTests('base', baseTests);
        
        // 扫描功能测试
        scanCategoryTests('feature', featureTests);
        
        // 扫描应用场景测试
        scanCategoryTests('useAge', useAgeTests);
        
        // 保存配置以更新测试信息
        saveConfig();
        
        showMessage('测试文件已扫描', 'success');
      } catch (error) {
        console.error('扫描测试文件出错:', error);
        showMessage('扫描测试文件出错', 'error');
      }
    };
    
    // 扫描分类测试文件
    const scanCategoryTests = (category, targetObj) => {
      try {
        // 确定测试目录路径
        let testFiles = [];
        
        // 获取插件目录路径（优先使用插件API，否则尝试从其他方式获取）
        let pluginDir = '';
        
        if (plugin && plugin.path) {
          // 如果插件实例可用且有path属性
          pluginDir = plugin.path;
        } else if (path) {
          // 尝试找到插件目录的常见位置
          const possiblePaths = [
            path.join(process.cwd(), 'data/plugins/SACAssetsManager'),
            path.join(workspacePath, 'data/plugins/SACAssetsManager'),
            path.join(process.cwd(), 'plugins/SACAssetsManager'),
            path.join(workspacePath, 'plugins/SACAssetsManager')
          ];
          
          // 如果__dirname可用，也尝试从当前组件路径反推
          if (typeof __dirname !== 'undefined') {
            possiblePaths.push(path.resolve(__dirname, '../../../'));
          }
          
          for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
              pluginDir = p;
              console.log(`[测试管理器] 找到插件目录: ${pluginDir}`);
              break;
            }
          }
        }
        
        if (!pluginDir) {
          console.error('[测试管理器] 无法确定插件目录路径');
          return;
        }
        
        // 现在使用正确的插件路径构建测试目录路径
        const categoryPath = path.join(pluginDir, testConfig.categories[category].path);
        console.log(`[测试管理器] 扫描${category}测试，路径: ${categoryPath}`);
        
        if (fs.existsSync(categoryPath)) {
          console.log(`[测试管理器] 目录存在: ${categoryPath}`);
          testFiles = fs.readdirSync(categoryPath)
            .filter(file => (file.endsWith('.js') || file.endsWith('.mjs')) && 
                          file !== 'index.js' && file !== 'run.js' &&
                          file !== 'index.mjs' && file !== 'run.mjs');
          console.log(`[测试管理器] 找到文件: `, testFiles);
        } else {
          console.warn(`[测试管理器] 目录不存在: ${categoryPath}`);
        }
        
        // 处理找到的测试文件
        console.log(`[测试管理器] 处理${category}测试文件，数量: ${testFiles.length}`);
        testFiles.forEach(file => {
          const fileExt = file.endsWith('.mjs') ? '.mjs' : '.js';
          const testName = path.basename(file, fileExt);
          const testPath = path.join(testConfig.categories[category].path, file);
          
          // 检查测试配置中是否已存在
          if (!testConfig.tests[testPath]) {
            testConfig.tests[testPath] = {
              enabled: true,
              name: testName,
              category: category
            };
          }
          
          // 添加到对应的分类对象
          targetObj[testName] = testConfig.tests[testPath];
        });
        
        console.log(`[测试管理器] ${category}测试处理完成，结果:`, Object.keys(targetObj));
      } catch (error) {
        console.error(`[测试管理器] 扫描${category}测试文件出错:`, error);
      }
    };
    
    // 运行所有启用的测试
    const runAllTests = async () => {
      if (isRunning.value) {
        return;
      }
      
      isRunning.value = true;
      showMessage('开始运行测试...', 'info');
      
      const startTime = Date.now();
      const results = {
        timestamp: startTime,
        total: 0,
        passed: 0,
        failed: 0,
        duration: 0,
        details: []
      };
      
      try {
        // 收集所有启用的测试
        const testsToRun = Object.entries(testConfig.tests)
          .filter(([_, test]) => test.enabled && 
                 testConfig.categories[test.category]?.enabled)
          .map(([path, test]) => ({
            path,
            name: test.name,
            category: test.category
          }));
        
        results.total = testsToRun.length;
        
        // 在这里我们需要运行测试
        // 实际实现会连接到现有测试框架
        
        // 模拟测试运行
        for (const test of testsToRun) {
          console.log(`运行测试: ${test.name} (${test.category})`);
          
          // 这里将来需要替换为实际的测试执行代码
          const testResult = {
            name: test.name,
            path: test.path,
            category: test.category,
            passed: Math.random() > 0.2, // 模拟80%的通过率
            duration: Math.floor(Math.random() * 500) + 100,
          };
          
          if (testResult.passed) {
            results.passed++;
          } else {
            results.failed++;
            
            // 检查是否需要在第一次失败时停止
            if (testConfig.options.stopOnFirstFailure) {
              break;
            }
          }
          
          results.details.push(testResult);
          
          // 人为延迟，模拟测试时间
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        results.duration = Date.now() - startTime;
        lastTestRun.value = results;
        
        const status = results.failed === 0 ? '成功' : '失败';
        showMessage(`测试运行完成：${status}`, results.failed === 0 ? 'success' : 'error');
      } catch (error) {
        console.error('运行测试出错:', error);
        showMessage('运行测试出错', 'error');
      } finally {
        isRunning.value = false;
      }
    };
    
    // 格式化日期
    const formatDate = (timestamp) => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleString();
    };
    
    // 初始化
    onMounted(() => {
      console.log('[测试管理器] 初始化');
      console.log('[测试管理器] 文件系统可用:', !!fs && !!path);
      console.log('[测试管理器] 插件实例可用:', !!plugin);
      console.log('[测试管理器] 工作区路径:', workspacePath);
      
      // 添加一个直接测试访问
      testDirectAccess();
      
      loadConfig();
      scanTestFiles();
      
      // 检查是否需要自动运行测试
      if (testConfig.options.autoRunOnStartup) {
        setTimeout(() => {
          runAllTests();
        }, 1000);
      }
    });
    
    // 测试直接访问文件系统
    const testDirectAccess = () => {
      if (fs && path) {
        try {
          // 尝试查找插件根目录的可能路径
          const possiblePaths = [
            path.join(process.cwd(), 'data/plugins/SACAssetsManager'),
            path.join(workspacePath, 'data/plugins/SACAssetsManager'),
            path.join(process.cwd(), 'plugins/SACAssetsManager'),
            path.join(workspacePath, 'plugins/SACAssetsManager')
          ];
          
          // 如果__dirname可用，也尝试从当前组件路径反推
          if (typeof __dirname !== 'undefined') {
            possiblePaths.push(path.resolve(__dirname, '../../../'));
          }
          
          console.log('[测试管理器] 尝试查找插件根目录，可能的路径:', possiblePaths);
          
          let pluginRoot = '';
          for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
              pluginRoot = p;
              console.log(`[测试管理器] 找到插件根目录: ${pluginRoot}`);
              break;
            }
          }
          
          if (!pluginRoot) {
            console.log('[测试管理器] 无法找到插件根目录');
            return;
          }
          
          // 尝试列出tests目录
          const testsDir = path.join(pluginRoot, 'tests');
          if (fs.existsSync(testsDir)) {
            const files = fs.readdirSync(testsDir);
            console.log('[测试管理器] tests目录内容:', files);
            
            // 尝试访问每个子目录
            ['base', 'feature', 'useAge'].forEach(dir => {
              const subDir = path.join(testsDir, dir);
              if (fs.existsSync(subDir)) {
                const subFiles = fs.readdirSync(subDir);
                console.log(`[测试管理器] ${dir}目录内容:`, subFiles);
              } else {
                console.log(`[测试管理器] ${dir}目录不存在`);
              }
            });
          } else {
            console.log('[测试管理器] tests目录不存在');
          }
        } catch (error) {
          console.error('[测试管理器] 测试直接访问出错:', error);
        }
      }
    };
    
    return {
      testConfig,
      expandedCategories,
      isRunning,
      lastTestRun,
      baseTests,
      featureTests,
      useAgeTests,
      message,
      
      toggleCategory,
      updateConfig,
      saveConfig,
      runAllTests,
      formatDate
    };
  }
};
</script>

<style scoped>
.test-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  overflow-y: auto;
  background-color: var(--b3-theme-background, #fff);
  color: var(--b3-theme-on-background, #333);
  font-family: 'SF Pro Text', 'Segoe UI', system-ui, -apple-system, sans-serif;
}

.test-manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.test-manager-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

button {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.primary-button {
  background-color: var(--b3-theme-primary, #4285f4);
  color: white;
}

.primary-button:hover {
  background-color: var(--b3-theme-primary-lighter, #5294f5);
}

.primary-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.normal-button {
  background-color: var(--b3-theme-surface, #f5f5f5);
  color: var(--b3-theme-on-surface, #333);
}

.normal-button:hover {
  background-color: var(--b3-theme-surface-lighter, #e8e8e8);
}

.test-categories {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.test-category {
  border: 1px solid var(--b3-theme-surface-lighter, #eee);
  border-radius: 8px;
  overflow: hidden;
}

.category-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--b3-theme-surface, #f5f5f5);
  cursor: pointer;
}

.category-header h3 {
  flex: 1;
  margin: 0;
  font-size: 1.1rem;
  font-weight: 500;
}

.toggle-icon {
  margin-right: 8px;
  width: 16px;
  height: 16px;
  transition: transform 0.2s;
  border-style: solid;
  border-width: 0 2px 2px 0;
  display: inline-block;
  padding: 3px;
  transform: rotate(-45deg);
}

.toggle-icon.expanded {
  transform: rotate(45deg);
}

.category-tests {
  padding: 8px 16px 16px;
}

.test-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--b3-theme-surface-lighter, #eee);
}

.test-item:last-child {
  border-bottom: none;
}

.test-name {
  flex: 1;
  font-size: 14px;
}

/* 开关样式 */
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 20px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--b3-theme-primary, #4285f4);
}

input:focus + .slider {
  box-shadow: 0 0 1px var(--b3-theme-primary, #4285f4);
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.test-options {
  margin-bottom: 20px;
  padding: 16px;
  background-color: var(--b3-theme-surface, #f5f5f5);
  border-radius: 8px;
}

.test-options h3 {
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 1.1rem;
  font-weight: 500;
}

.option-item {
  margin-bottom: 8px;
}

.option-item label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.option-item input[type="checkbox"] {
  margin: 0;
}

.option-item input[type="number"] {
  width: 80px;
  padding: 4px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.test-results {
  padding: 16px;
  background-color: var(--b3-theme-surface, #f5f5f5);
  border-radius: 8px;
}

.test-results h3 {
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 1.1rem;
  font-weight: 500;
}

.results-summary {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.result-item {
  display: flex;
  flex-direction: column;
  background-color: var(--b3-theme-background, #fff);
  padding: 8px 12px;
  border-radius: 4px;
}

.result-label {
  font-size: 12px;
  color: var(--b3-theme-on-surface-light, #666);
  margin-bottom: 4px;
}

.result-value {
  font-size: 16px;
  font-weight: 500;
}

.result-value.success {
  color: #4caf50;
}

.result-value.failure {
  color: #f44336;
}

.message {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 10px 20px;
  border-radius: 4px;
  z-index: 1001;
  animation: slideIn 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.message.info {
  background: #e3f2fd;
  color: #1976d2;
}

.message.success {
  background: #e8f5e9;
  color: #388e3c;
}

.message.error {
  background: #fdecea;
  color: #d32f2f;
}

.empty-message {
  color: #999;
  font-style: italic;
  padding: 8px 0;
}

@keyframes slideIn {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style> 