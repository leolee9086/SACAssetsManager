/**
 * 提示词服务模块
 * 负责从思源笔记API获取和管理提示词数据
 */

/**
 * 从思源笔记API获取提示词数据
 * @returns {Promise<Array>} 提示词数组
 */
export async function fetchPrompts() {
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
    
    return prompts;
  } catch (error) {
    console.error('获取提示词出错:', error);
    throw error;
  }
}

/**
 * 保存修改的提示词
 * @param {Object} prompt 提示词对象
 * @param {string} content 新的提示词内容
 * @returns {Promise<boolean>} 是否保存成功
 */
export async function savePrompt(prompt, content) {
  try {
    if (!prompt) return false;
    
    // 仅支持local-ai提示词的保存
    if (prompt.source === 'local-ai') {
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
      if (localAi[prompt.id]) {
        localAi[prompt.id].memo = content;
        
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
        
        return true;
      } else {
        throw new Error('未找到对应的提示词');
      }
    } else {
      // 非local-ai的提示词暂不支持保存
      throw new Error('当前仅支持修改本地AI提示词');
    }
  } catch (error) {
    console.error('保存提示词出错:', error);
    throw error;
  }
} 