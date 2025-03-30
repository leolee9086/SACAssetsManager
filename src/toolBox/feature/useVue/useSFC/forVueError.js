/**
 * Vue组件加载错误处理
 * 
 * 提供错误诊断、错误显示和加载历史记录功能
 */

// 创建加载历史记录器，确保只有一个全局实例
export const 加载历史记录 = (() => {
  // 私有状态
  let 事件列表 = [];
  let 错误列表 = [];
  
  return {
    // 记录加载事件
    记录事件(事件, 数据) {
      事件列表.push({
        时间: new Date().toISOString(),
        事件: 事件,
        数据: 数据
      });
      console.log(`[加载事件] ${事件}:`, 数据);
    },
    
    // 记录错误
    记录错误(错误, 上下文) {
      const 错误信息 = {
        时间: new Date().toISOString(),
        错误类型: 错误.name,
        错误消息: 错误.message,
        上下文: 上下文,
        堆栈: 错误.stack
      };
      错误列表.push(错误信息);
      console.error(`[加载错误] ${上下文}:`, 错误);
      return 错误信息;
    },
    
    // 清除历史记录
    清除() {
      事件列表 = [];
      错误列表 = [];
      console.log('[加载历史] 已清除所有记录');
      return this;
    },
    
    // 获取完整历史
    获取历史() {
      return {
        加载事件: [...事件列表], // 返回副本而不是引用
        错误记录: [...错误列表]
      };
    }
  };
})();

/**
 * 增强错误信息
 * @param {Error} 错误 - 原始错误对象
 * @param {string} 组件路径 - 组件路径
 * @param {string} 上下文 - 错误上下文
 * @returns {Error} 增强后的错误对象
 */
export const 增强错误信息 = (错误, 组件路径, 上下文 = '') => {
  // 确保有文件URL
  错误.fileUrl = 错误.fileUrl || 组件路径;
  加载历史记录.记录错误(错误, 上下文 || `处理组件错误: ${组件路径}`);
  
  // 添加额外诊断信息
  if (错误.message && 错误.message.includes('sourceType: "module"')) {
    错误.codeIssue = true;
    错误.scriptTagIssue = true;
    错误.diagnosis = `Vue文件的<script>标签需要添加setup属性或type="module"属性`;
  }
  
  // 路径问题检查
  if (错误.message && (错误.message.includes('404') || 错误.message.includes('Failed to fetch'))) {
    错误.pathIssue = true;
    加载历史记录.记录事件('检测到路径问题', { url: 组件路径, 错误类型: '404或Failed to fetch' });
    
    // 分析路径问题
    if (组件路径.includes('/src/base/') && !组件路径.includes('/src/toolBox/base/')) {
      错误.diagnosis = (错误.diagnosis || '') + "\n路径问题: 使用了 '/src/base/' 而不是 '/src/toolBox/base/'";
      错误.suggestedFix = 组件路径.replace('/src/base/', '/src/toolBox/base/');
    } else if (组件路径.includes('/base/') && !组件路径.includes('/toolBox/base/')) {
      错误.diagnosis = (错误.diagnosis || '') + "\n路径问题: 可能缺少 '/toolBox' 部分";
      错误.suggestedFix = 组件路径.replace('/base/', '/toolBox/base/');
    }
  }
  
  // 添加历史记录到错误对象
  错误.loadingHistory = 加载历史记录.获取历史();
  
  return 错误;
};

/**
 * 创建安全的错误对象副本，避免循环引用
 * @param {Error} 错误 - 原始错误对象 
 * @returns {Error} 安全的错误对象
 */
export const 创建安全错误 = (错误) => {
  const 安全错误 = new Error(错误.message);
  安全错误.name = 错误.name;
  安全错误.stack = 错误.stack;
  安全错误.fileUrl = 错误.fileUrl;
  安全错误.diagnosis = 错误.diagnosis;
  安全错误.suggestedFix = 错误.suggestedFix;
  安全错误.pathIssue = 错误.pathIssue;
  安全错误.scriptTagIssue = 错误.scriptTagIssue;
  安全错误.codeIssue = 错误.codeIssue;
  安全错误.foundScriptTag = 错误.foundScriptTag;
  安全错误.validAlternativePath = 错误.validAlternativePath;
  安全错误.moduleFetchError = 错误.moduleFetchError;
  
  // 安全处理加载历史
  const 历史 = 加载历史记录.获取历史();
  if (历史 && 历史.错误记录) {
    // 移除可能导致循环引用的原始错误字段
    历史.错误记录 = 历史.错误记录.map(err => ({
      时间: err.时间,
      错误类型: err.错误类型,
      错误消息: err.错误消息,
      上下文: err.上下文,
      堆栈: err.堆栈
    }));
  }
  安全错误.loadingHistory = 历史;
  
  return 安全错误;
};

/**
 * 创建错误显示组件
 * @param {Error} error - 错误对象
 * @param {string} componentPath - 组件路径
 * @returns {Object} Vue组件对象
 */
export const 创建错误显示组件 = (错误, 组件路径) => {
  // 提取错误历史
  const 加载历史 = 错误.loadingHistory || { 加载事件: [], 错误记录: [] };
  
  // 格式化错误信息为JSON
  const 错误对象 = {
    错误类型: 错误.name,
    错误消息: 错误.message,
    组件路径: 组件路径,
    文件URL: 错误.fileUrl || 组件路径 || '未知',
    诊断信息: 错误.diagnosis || '无特定诊断',
    建议修复: 错误.suggestedFix || '',
    发生时间: new Date().toISOString(),
    错误堆栈: 错误.stack || '无错误堆栈',
    加载历史: {
      加载事件: 加载历史.加载事件 || [],
      错误记录: 加载历史.错误记录 ? 加载历史.错误记录.map(err => ({
        时间: err.时间,
        错误类型: err.错误类型,
        错误消息: err.错误消息,
        上下文: err.上下文
      })) : []
    }
  };
  
  // 使用replacer函数防止循环引用
  const getCircularReplacer = () => {
    const seen = new WeakSet();
    return (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[循环引用]';
        }
        seen.add(value);
      }
      return value;
    };
  };
  
  const 错误JSON = JSON.stringify(错误对象, getCircularReplacer(), 2);
  
  // 返回组件对象
  return {
    data() {
      return {
        错误对象,
        错误JSON,
        加载历史: 错误对象.加载历史,
        复制按钮文本: '复制错误信息',
        已复制: false,
        显示历史: false
      };
    },
    computed: {
      有错误() {
        return this.加载历史.错误记录 && this.加载历史.错误记录.length > 0;
      },
      有事件() {
        return this.加载历史.加载事件 && this.加载历史.加载事件.length > 0;
      },
      格式化诊断() {
        return this.错误对象.诊断信息.split('\n').join('<br>');
      }
    },
    methods: {
      复制错误信息() {
        const 错误文本 = this.错误JSON;
        navigator.clipboard.writeText(错误文本)
          .then(() => {
            this.复制按钮文本 = '已复制!';
            setTimeout(() => { 
              this.复制按钮文本 = '复制错误信息'; 
            }, 2000);
          })
          .catch(err => {
            console.error('复制失败:', err);
            alert('复制失败: ' + err);
          });
      },
      切换显示历史() {
        this.显示历史 = !this.显示历史;
      },
      格式化时间(时间字符串) {
        try {
          const 日期 = new Date(时间字符串);
          return 日期.toLocaleTimeString();
        } catch (e) {
          return 时间字符串;
        }
      }
    },
    template: `
      <div class="error-container" style="padding: 20px; background-color: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #d32f2f; font-family: system-ui, -apple-system, sans-serif;">
        <h3 style="margin-top: 0; color: #b71c1c;">组件加载失败</h3>
        
        <div style="margin-bottom: 10px;"><b>错误信息:</b> {{ 错误对象.错误消息 }}</div>
        <div style="margin-bottom: 10px;"><b>组件路径:</b> {{ 错误对象.组件路径 }}</div>
        <div style="margin-bottom: 10px;"><b>文件URL:</b> {{ 错误对象.文件URL }}</div>
        
        <div v-if="错误对象.诊断信息 !== '无特定诊断'" style="margin-bottom: 10px;">
          <b>错误诊断:</b>
          <div v-html="格式化诊断"></div>
        </div>
        
        <div v-if="错误对象.pathIssue" style="margin: 15px 0; padding: 10px; background-color: #fff3e0; border-left: 4px solid #ff9800;">
          <b>路径问题:</b> 可能的路径错误，通常是缺少 'toolBox' 部分或路径层级不正确
          <div v-if="错误对象.建议修复"><b>建议路径:</b> {{ 错误对象.建议修复 }}</div>
        </div>
        
        <div v-if="错误对象.scriptTagIssue" style="margin: 15px 0; padding: 10px; background-color: #e8f5e9; border-left: 4px solid #4caf50;">
          <b>建议修复:</b> 将 &lt;script&gt; 标签修改为 &lt;script setup&gt; 或 &lt;script type="module"&gt;
        </div>
        
        <div v-if="错误对象.moduleFetchError" style="margin: 15px 0; padding: 10px; background-color: #fff3e0; border-left: 4px solid #ff9800;">
          <b>模块导入错误:</b> 动态导入JavaScript模块失败
          <div><b>模块路径:</b> {{ 错误对象.文件URL }}</div>
          <div v-if="错误对象.诊断信息 !== '无特定诊断'"><b>可能原因:</b> {{ 错误对象.诊断信息 }}</div>
          <div style="margin-top: 8px;">
            <b>解决方法:</b>
            <ul style="margin-top: 5px;">
              <li>检查模块文件是否存在于指定路径</li>
              <li>验证模块没有语法错误</li>
              <li>确保模块可通过网络访问且没有CORS限制</li>
            </ul>
          </div>
        </div>
        
        <!-- 加载历史摘要 -->
        <div v-if="有错误 || 有事件" style="margin: 15px 0; padding: 12px; background-color: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <b>加载过程:</b>
            <button @click="切换显示历史" style="background: none; border: none; color: #1565c0; cursor: pointer; font-weight: bold; text-decoration: underline;">
              {{ 显示历史 ? '隐藏详情' : '查看详情' }}
            </button>
          </div>
          
          <div v-if="显示历史">
            <!-- 错误历史记录 -->
            <div v-if="有错误" style="margin-top: 10px;">
              <div style="font-weight: bold; margin-bottom: 5px; color: #d32f2f;">错误记录 ({{ 加载历史.错误记录.length }}条):</div>
              <ul style="margin: 0; padding-left: 20px;">
                <li v-for="(err, index) in 加载历史.错误记录" :key="'err-'+index" style="margin-bottom: 8px;">
                  <div><b>时间:</b> {{ 格式化时间(err.时间) }}</div>
                  <div><b>上下文:</b> {{ err.上下文 }}</div>
                  <div><b>错误:</b> {{ err.错误类型 }}: {{ err.错误消息 }}</div>
                </li>
              </ul>
            </div>

            <!-- 加载事件历史 -->
            <div v-if="有事件" style="margin-top: 10px;">
              <div style="font-weight: bold; margin-bottom: 5px; color: #1565c0;">加载事件 ({{ 加载历史.加载事件.length }}条):</div>
              <ul style="margin: 0; padding-left: 20px;">
                <li v-for="(event, index) in 加载历史.加载事件" :key="'evt-'+index" style="margin-bottom: 5px;">
                  {{ 格式化时间(event.时间) }} - {{ event.事件 }}: {{ typeof event.数据 === 'string' ? event.数据 : JSON.stringify(event.数据) }}
                </li>
              </ul>
            </div>
          </div>
          <div v-else>
            <div>共 {{ 加载历史.加载事件.length }} 条事件记录，{{ 加载历史.错误记录.length }} 条错误记录</div>
          </div>
        </div>
        
        <div style="margin: 15px 0;">
          <button @click="复制错误信息" style="padding: 8px 16px; background-color: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
            {{ 复制按钮文本 }}
          </button>
        </div>
        
        <div style="margin-top: 15px;">
          <details>
            <summary style="cursor: pointer; color: #b71c1c; font-weight: bold; margin-bottom: 8px;">
              查看完整错误信息
            </summary>
            <pre style="background-color: #fff; padding: 12px; border-radius: 4px; overflow: auto; max-height: 300px; white-space: pre-wrap; word-break: break-word; font-family: monospace;">{{ 错误JSON }}</pre>
          </details>
        </div>
      </div>
    `
  };
}; 