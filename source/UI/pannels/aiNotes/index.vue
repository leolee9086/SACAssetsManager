<!-- AI提示词查看器 -->
<template>
  <div class="ai-prompt-panel">
    <div class="header">
      <h2>AI提示词管理</h2>
      <div class="actions">
        <button @click="refreshPrompts" class="primary-button">
          <i class="refresh-icon"></i>刷新提示词
        </button>
      </div>
    </div>

    <div class="prompt-filter-section">
          <input 
        v-model="filterText" 
        placeholder="搜索提示词..." 
        class="filter-input" 
          />
        </div>

    <div class="prompts-section">
      <h3>思源笔记中的提示词</h3>
      <div v-if="loading" class="loading-state">
        加载中...
      </div>
      <div v-else-if="promptList.length === 0" class="empty-message">
        没有找到提示词
      </div>
      <div v-else class="prompts-list">
        <div 
          v-for="(prompt, index) in filteredPrompts" 
          :key="index" 
          class="prompt-item"
          @click="selectPrompt(prompt)"
          :class="{ 'selected': selectedPrompt === prompt }"
        >
          <div class="prompt-info">
            <span class="prompt-title">{{ prompt.name || '未命名提示词' }}</span>
            <span class="prompt-desc">{{ formatPromptDesc(prompt) }}</span>
          </div>
          <div class="prompt-actions">
            <button 
              @click.stop="activateBrushMode(prompt)" 
              class="icon-button" 
              title="使用提示词刷子"
            >
              <svg class="brush-icon" viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a.996.996 0 0 0-1.41 0L9 12.25 11.75 15l8.96-8.96a.996.996 0 0 0 0-1.41z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedPrompt" class="prompt-detail-section">
      <h3>提示词详情</h3>
      <div class="prompt-header">
        <span class="prompt-title">{{ selectedPrompt.name || '未命名提示词' }}</span>
        <div class="prompt-actions">
          <button @click="toggleEdit" class="small-button">
            {{ isEditing ? '取消编辑' : '编辑提示词' }}
          </button>
          <button v-if="isEditing" @click="savePrompt" class="primary-button small-button">
            保存修改
        </button>
        </div>
      </div>
      <div class="prompt-content">
        <textarea 
          v-model="editingContent" 
          :readonly="!isEditing"
          class="prompt-textarea"
          :class="{ 'editing': isEditing }"
        ></textarea>
      </div>
    </div>

    <!-- 消息提示 -->
    <div v-if="message.show" class="message" :class="message.type">
      {{ message.content }}
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { getPluginByName } from '../../../../src/toolBox/useAge/forSiyuan/forSiyuanPlugin/forQuery.js';
import { createBrushModeHandlers } from '../../../globalStatus/mode/brush.js';
import { forLegacySiyuanConfig } from '../../../../src/toolBox/useAge/forSiyuan/forAI/forLegacyCode.js';
import { BlockHandler } from '../../../../src/toolBox/useAge/forSiyuan/forBlock/useBlockHandler.js';
import { kernelApi } from '../../../asyncModules.js';
import { getStatu, setStatu, 状态注册表 } from '../../../globalStatus/index.js';
import { plugin } from '../../../pluginSymbolRegistry.js';

export default {
  name: 'AIPromptPanel',
  setup() {
    // 提示词数据
    const promptList = ref([]);
    const selectedPrompt = ref(null);
    const loading = ref(true);
    const filterText = ref('');
    
    // 消息提示
    const message = reactive({
      show: false,
      content: '',
      type: 'info',
      timer: null
    });
    
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

    // 根据关键词过滤提示词
    const filteredPrompts = computed(() => {
      if (!filterText.value) return promptList.value;
      
      const lowerFilter = filterText.value.toLowerCase();
      return promptList.value.filter(prompt => {
        return (
          (prompt.name && prompt.name.toLowerCase().includes(lowerFilter)) ||
          (prompt.content && prompt.content.toLowerCase().includes(lowerFilter))
        );
      });
    });
    
    // 格式化提示词描述
    const formatPromptDesc = (prompt) => {
      if (!prompt.content) return '空内容';
      const contentPreview = prompt.content.substring(0, 60);
      return contentPreview + (prompt.content.length > 60 ? '...' : '');
    };
    
    // 在script部分添加
    const isEditing = ref(false);
    const editingContent = ref('');
    
    // 选择提示词
    const selectPrompt = (prompt) => {
      selectedPrompt.value = prompt;
      editingContent.value = prompt.content || '';
      isEditing.value = false;
    };
    
    // 切换编辑模式
    const toggleEdit = () => {
      isEditing.value = !isEditing.value;
      if (!isEditing.value) {
        // 取消编辑时恢复原内容
        editingContent.value = selectedPrompt.value.content || '';
      }
    };
    
    // 保存修改的提示词
    const savePrompt = async () => {
      try {
        if (!selectedPrompt.value) return;
        
        // 更新本地数据
        selectedPrompt.value.content = editingContent.value;
        
        // 如果是local-ai的提示词，尝试更新思源存储
        if (selectedPrompt.value.source === 'local-ai') {
          // 获取当前存储
          const response = await fetch('/api/storage/getLocalStorage', {
            method: 'POST'
          });
          
          if (!response.ok) {
            throw new Error('获取本地存储失败');
          }
          
          const data = await response.json();
          
          if (data.code !== 0 || !data.data) {
            throw new Error('API返回错误');
          }
          
          // 获取local-ai数组
          const localAi = data.data['local-ai'] || [];
          
          // 更新提示词
          if (localAi[selectedPrompt.value.id]) {
            localAi[selectedPrompt.value.id].memo = editingContent.value;
            
            // 保存回思源
            const saveResponse = await fetch('/api/storage/setLocalStorage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                key: 'local-ai',
                val: JSON.stringify(localAi)
              })
            });
            
            if (!saveResponse.ok) {
              throw new Error('保存失败');
            }
            
            const saveResult = await saveResponse.json();
            if (saveResult.code !== 0) {
              throw new Error(`保存失败: ${saveResult.msg}`);
            }
            
            showMessage('提示词已保存', 'success');
            isEditing.value = false;
          } else {
            throw new Error('未找到对应的提示词');
          }
        } else {
          // 非local-ai的提示词暂不支持保存
          showMessage('当前仅支持修改本地AI提示词', 'warning');
        }
      } catch (error) {
        console.error('保存提示词出错:', error);
        showMessage('保存失败: ' + error.message, 'error');
      }
    };
    
    // 从思源API获取提示词数据
    const fetchPrompts = async () => {
      loading.value = true;
      try {
        // 使用kernelAPI获取本地存储的prompts数据
        const response = await fetch('/api/storage/getLocalStorage', {
          method: 'POST'
        });
        
        if (!response.ok) {
          throw new Error('获取本地存储失败');
        }
        
        const data = await response.json();
        
        if (data.code !== 0) {
          throw new Error(`API错误: ${data.msg}`);
        }
        
        // 提取提示词数据
        const prompts = [];
        
        // 从local-ai数组中获取提示词数据
        if (data.data && data.data['local-ai'] && Array.isArray(data.data['local-ai'])) {
          const localAiPrompts = data.data['local-ai'];
          
          // 处理local-ai中的提示词
          localAiPrompts.forEach((item, index) => {
            if (item) {
              prompts.push({
                id: index,
                name: item.name || '未命名提示词',
                content: item.memo || '',
                source: 'local-ai',
                type: 'default'
              });
            }
          });
          
          console.log(`从local-ai中找到${prompts.length}条提示词`);
        } else {
          console.warn('未在local-ai中找到有效的提示词数据');
        }
        
        // 尝试查找其他可能的提示词位置
        if (prompts.length === 0) {
          // 可以在这里添加对其他位置的提示词查找，如local-bazaar等
          console.log('在其他位置寻找提示词数据...');
          
          // 遍历localStorage找到提示词相关数据
          const localStorage = data.data;
          for (const key in localStorage) {
            if (key.includes('prompts') || key.includes('chat/history')) {
              try {
                let promptData = localStorage[key];
                if (typeof promptData === 'string') {
                  promptData = JSON.parse(promptData);
                }
                
                if (Array.isArray(promptData)) {
                  // 处理数组形式的提示词
                  promptData.forEach(item => {
                    if (item && (item.content || item.memo)) {
                      prompts.push({
                        name: item.name || item.title || '未命名提示词',
                        content: item.content || item.memo || '',
                        source: key,
                        type: 'array'
                      });
                    }
                  });
                } else if (promptData && typeof promptData === 'object') {
                  // 处理对象形式的提示词
                  Object.keys(promptData).forEach(promptKey => {
                    const item = promptData[promptKey];
                    if (item && (item.content || item.memo || typeof item === 'string')) {
                      prompts.push({
                        name: item.name || item.title || promptKey,
                        content: item.content || item.memo || (typeof item === 'string' ? item : ''),
                        source: key,
                        type: 'object'
                      });
                    }
                  });
                }
              } catch (parseError) {
                console.warn(`解析 ${key} 数据出错:`, parseError);
              }
            }
          }
        }
        
        promptList.value = prompts;
        
        if (prompts.length === 0) {
          showMessage('未找到提示词数据', 'warning');
        } else {
          showMessage(`找到 ${prompts.length} 条提示词`, 'success');
        }
      } catch (error) {
        console.error('获取提示词出错:', error);
        showMessage('获取提示词出错: ' + error.message, 'error');
        promptList.value = [];
      } finally {
        loading.value = false;
      }
    };
    
    // 刷新提示词
    const refreshPrompts = () => {
      fetchPrompts();
      selectedPrompt.value = null;
    };
    
    // 使用全局状态
    const isBrushMode = computed({
      get: () => getStatu(状态注册表.笔刷模式),
      set: (value) => setStatu(状态注册表.笔刷模式, value)
    });

    const currentHoverElement = computed({
      get: () => getStatu(状态注册表.笔刷悬停元素),
      set: (value) => setStatu(状态注册表.笔刷悬停元素, value)
    });

    // 刷子模式相关
    const currentBrushPrompt = ref(null);
    let brushHandlers = null;

    // 激活刷子模式
    const activateBrushMode = (prompt) => {
      event.stopPropagation(); // 防止触发selectPrompt
      
      // 保存当前提示词
      currentBrushPrompt.value = prompt;
      
      // 设置全局刷子模式状态
      setStatu(状态注册表.笔刷模式, true);
      
      // 如果已经有刷子处理器，先移除
      if (brushHandlers && typeof brushHandlers.removeBrushListeners === 'function') {
        brushHandlers.removeBrushListeners();
      }
      
      // 创建新的刷子处理器
      brushHandlers = createPromptBrushHandlers({
        isBrushMode,
        currentHoverElement,
        prompt: currentBrushPrompt
      });
      
      // 添加刷子事件
      if (brushHandlers && typeof brushHandlers.addBrushListeners === 'function') {
        // 设置刷子模式样式
        document.body.classList.add('brushMode');
        
        // 添加事件监听器
        brushHandlers.addBrushListeners();
        
        showMessage(`已激活"${prompt.name}"提示词刷子，点击文档中的块应用此提示词`, 'info');
      } else {
        console.error('创建刷子处理器失败');
        showMessage('激活提示词刷子失败', 'error');
        setStatu(状态注册表.笔刷模式, false);
      }
    };

    // 取消刷子模式
    const deactivateBrushMode = () => {
      // 仅在刷子模式下执行
      if (getStatu(状态注册表.笔刷模式)) {
        // 移除事件监听
        if (brushHandlers && typeof brushHandlers.removeBrushListeners === 'function') {
          brushHandlers.removeBrushListeners();
        }
        
        // 重置样式
        document.body.classList.remove('brushMode');
        
        // 重置状态
        setStatu(状态注册表.笔刷模式, false);
        setStatu(状态注册表.笔刷悬停元素, null);
        
        showMessage('已退出提示词刷子模式', 'info');
      }
    };

    // 创建提示词刷子处理器
    const createPromptBrushHandlers = ({ isBrushMode, currentHoverElement, prompt }) => {
      // 应用hover样式
      const applyHoverStyle = (element) => {
        element.style.outline = '2px solid var(--b3-theme-primary, #4285f4)';
        element.style.backgroundColor = 'rgba(66, 133, 244, 0.1)';
      };
      
      // 清除hover样式
      const clearHoverStyle = (element) => {
        element.style.outline = '';
        element.style.backgroundColor = '';
      };
      
      // 点击元素时执行流式对话
      const handleClick = async (element) => {
        try {
          if (!prompt.value) return;
          
          const blockId = element.getAttribute('data-node-id');
          if (!blockId) return;
          
          // 获取块内容
          const blockHandler = new BlockHandler(blockId);
          const blockContent = await blockHandler.markdown;
          
          // 创建对话消息
          const promptContent = prompt.value.content;
          
          // 特殊处理：如果提示词来源是block，则作为指令而不是添加到内容中
          let userContent = '';
          if (prompt.value.source === 'block') {
            userContent = `${promptContent}\n\n${blockContent}`;
          } else {
            // 正常处理，将提示词和块内容合并
            userContent = `${promptContent}\n\n${blockContent}`;
          }
          
          const noteChat = [
            { role: 'user', content: userContent }
          ];
          
          // 显示流式对话对话框
          const { showStreamingChatDialog } = await import('../../../UI/dialogs/streamingChatDialog.js');
          const aiConfig = forLegacySiyuanConfig();
          const emitter = await showStreamingChatDialog(noteChat, aiConfig);
          
          let responseContent = '';
          
          emitter.on('data', (text) => {
            responseContent += text;
          });
          
          emitter.on('userAccept', async () => {
            if (responseContent) {
              // 创建模拟事件对象
              const mockEvent = {
                detail: {
                  blockElements: [element]
                }
              };
              
              // 插入响应内容
              await handleStreamingResponse(mockEvent, responseContent);
              
              // 设置块属性，标记使用的提示词
              const responseBlockId = mockEvent.detail.responseBlockId;
              if (responseBlockId) {
                await kernelApi.setBlockAttrs({
                  id: responseBlockId,
                  attrs: {
                    'custom-prompt-name': prompt.value.name || '未命名提示词',
                    'custom-prompt-source': prompt.value.source || 'unknown'
                  }
                });
              }
              
              showMessage('已应用提示词并生成回复', 'success');
            }
          });
          
          emitter.on('error', (error) => {
            console.error('流式对话出错:', error);
            showMessage('流式对话出错: ' + error.message, 'error');
          });
          
          // 开始流式对话
          emitter.emit('start');
          
          // 退出刷子模式
          deactivateBrushMode();
        } catch (error) {
          console.error('应用提示词刷子时出错:', error);
          showMessage('应用提示词刷子时出错: ' + error.message, 'error');
        }
      };
      
      // 构建自定义光标
      const cursorElement = (() => {
        const cursorWrapper = document.createElement('div');
        cursorWrapper.innerHTML = `
          <div style="display: flex; align-items: center; gap: 4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a.996.996 0 0 0-1.41 0L9 12.25 11.75 15l8.96-8.96a.996.996 0 0 0 0-1.41z"/>
            </svg>
            <span style="
              font-size: 12px;
              color: #3182ce;
              background: rgba(255, 255, 255, 0.9);
              padding: 2px 6px;
              border-radius: 4px;
              white-space: nowrap;
              box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            ">应用提示词</span>
          </div>
        `;
        cursorWrapper.style.color = '#3182ce';
        cursorWrapper.style.filter = 'drop-shadow(0 0 2px rgba(0,0,0,0.1))';
        return cursorWrapper;
      })();
      
      // 查找目标块元素函数
      const findTargetBlock = (element) => {
        while (element && !element.hasAttribute('data-node-id')) {
          element = element.parentElement;
        }
        return element;
      };
      
      // 调用createBrushModeHandlers创建刷子处理器
      return createBrushModeHandlers({
        isBrushMode,
        currentHoverElement,
        onHover: {
          apply: applyHoverStyle,
          cleanup: clearHoverStyle
        },
        onClick: handleClick,
        cursor: {
          type: 'element',
          value: cursorElement,
          offsetX: 8,
          offsetY: 8
        },
        findTarget: findTargetBlock
      });
    };

    // 处理流式对话响应
    const handleStreamingResponse = async (e, responseContent) => {
      try {
        // 获取AI配置信息
        const aiConfig = forLegacySiyuanConfig();
        
        const lastBlock = e.detail.blockElements[e.detail.blockElements.length - 1];
        const last = new BlockHandler(lastBlock.getAttribute('data-node-id'));
        const data = await last.insertAfter(responseContent);
        
        // 记录响应块ID，用于后续设置属性
        if (data && data.length > 0 && data[0].doOperations && data[0].doOperations.length > 0) {
          e.detail.responseBlockId = data[0].doOperations[0].id;
        }
        
        // 设置块属性
        data.forEach(item => {
          item.doOperations.forEach(async op => {
            await kernelApi.setBlockAttrs({
              id: op.id,
              attrs: {
                'custom-chat-role': 'assistant',
                'custom-chat-endpoint': aiConfig.endpoint || aiConfig.apiBaseURL,
                'custom-chat-model': aiConfig.apiModel || aiConfig.model
              }
            });
          });
        });
      } catch (error) {
        console.error('处理流式对话响应时出错:', error);
        showMessage('处理响应出错: ' + error.message, 'error');
      }
    };

    // 监听ESC键，用于取消刷子模式
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isBrushMode.value) {
        deactivateBrushMode();
      }
    };

    // 在onMounted钩子中注册全局事件监听
    onMounted(() => {
      fetchPrompts();
      document.addEventListener('keydown', handleKeyDown);
      
      // 监听全局的提示词刷子激活事件
      plugin.eventBus.on('activate-prompt-brush', (blockPrompt) => {
        activateBrushMode(blockPrompt);
      });
    });

    // 在onUnmounted钩子中移除事件监听
    onUnmounted(() => {
      if (isBrushMode.value && brushHandlers) {
        brushHandlers.removeBrushListeners();
      }
      document.removeEventListener('keydown', handleKeyDown);
      
      // 移除全局事件监听
      plugin.eventBus.off('activate-prompt-brush');
    });

    return {
      promptList,
      filteredPrompts,
      selectedPrompt,
      loading,
      filterText,
      message,
      selectPrompt,
      formatPromptDesc,
      refreshPrompts,
      isEditing,
      editingContent,
      toggleEdit,
      savePrompt,
      isBrushMode,
      activateBrushMode,
      deactivateBrushMode
    };
  }
};
</script>

<style scoped>
.ai-prompt-panel {
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

.prompt-filter-section {
  margin-bottom: 16px;
}

.filter-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--b3-border-color);
  border-radius: 4px;
  font-size: 14px;
}

.prompts-section,
.prompt-detail-section {
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

.prompts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.prompt-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: var(--b3-theme-background, #fff);
  border-radius: 4px;
  border: 1px solid var(--b3-border-color);
  cursor: pointer;
  transition: background-color 0.2s;
}

.prompt-item:hover {
  background-color: var(--b3-theme-surface-light, #e8e8e8);
}

.prompt-item.selected {
  border-color: var(--b3-theme-primary, #4285f4);
  background-color: rgba(66, 133, 244, 0.05);
}

.prompt-info {
  display: flex;
  flex-direction: column;
}

.prompt-title {
  font-weight: 500;
  font-size: 14px;
}

.prompt-desc {
  font-size: 12px;
  color: var(--b3-theme-on-surface-light, #666);
  margin-top: 4px;
  white-space: pre-line;
}

.prompt-header {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--b3-border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.prompt-actions {
  display: flex;
  gap: 4px;
}

.small-button {
  padding: 4px 8px;
  font-size: 12px;
  background-color: var(--b3-theme-surface, #f5f5f5);
  color: var(--b3-theme-on-surface, #333);
  border-color: var(--b3-border-color);
  border-radius: 4px;
}

.small-button.primary-button {
  background-color: var(--b3-theme-primary, #4285f4);
  color: white;
}

.prompt-content {
  background-color: var(--b3-theme-background, #fff);
  padding: 12px;
  border-radius: 4px;
  border: 1px solid var(--b3-border-color);
  overflow-x: auto;
  white-space: pre-wrap;
}

.prompt-content pre {
  margin: 0;
  font-family: monospace;
  font-size: 14px;
}

.empty-message,
.loading-state {
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

.prompt-textarea {
  width: 100%;
  min-height: 200px;
  padding: 12px;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.5;
  border: 1px solid var(--b3-border-color);
  border-radius: 4px;
  background-color: var(--b3-theme-background, #fff);
  resize: vertical;
}

.prompt-textarea.editing {
  background-color: var(--b3-theme-background, #fff);
  border-color: var(--b3-theme-primary, #4285f4);
}

.prompt-textarea:not(.editing) {
  cursor: default;
  color: var(--b3-theme-on-background, #333);
  background-color: var(--b3-theme-surface-lighter, #f5f5f5);
}

.icon-button {
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  color: var(--b3-theme-on-surface-light, #666);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.icon-button:hover {
  background-color: var(--b3-theme-surface-light, #e8e8e8);
  color: var(--b3-theme-primary, #4285f4);
}

.brush-icon {
  width: 16px;
  height: 16px;
}
</style>

<style>
/* 刷子模式下的状态指示器 */
body.brushMode {
  cursor: crosshair !important;
}

body.brushMode::after {
  content: "提示词刷子模式 (ESC退出)";
  position: fixed;
  top: 10px;
  right: 10px;
  background-color: var(--b3-theme-primary, #4285f4);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  z-index: 9999;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
</style> 