/**
 * 日志数据管理钩子
 * 提供日志数据的加载、处理和状态管理
 */
import { ref, computed, nextTick } from '../../../../static/vue.esm-browser.js';
import { 数据库, 格式化器 } from '../../../../source/server/utils/logs/index.js';
import { 获取元素ID } from './logUtils.js';

/**
 * 创建日志数据管理
 * @param {Object} 配置 - 配置选项
 * @returns {Object} 日志数据管理对象
 */
export function useLogData(配置 = {}) {
  // 默认配置
  const 默认配置 = {
    最大内存日志数: 1000,
    每页日志数: 100,
    分页大小: 200,
  };
  
  // 合并配置
  const 选项 = { ...默认配置, ...配置 };
  
  // 状态定义
  const 日志列表 = ref([]);
  const 最大内存日志数 = ref(Number(选项.最大内存日志数));
  const 每页日志数 = ref(选项.每页日志数);
  const 自动滚动 = ref(true);
  const 暂停接收 = ref(false);
  const 选中级别 = ref('');
  const 搜索文本 = ref('');
  const 选中标签 = ref('');
  const 日志统计 = ref({
    total: 0,
    info: 0,
    warn: 0,
    error: 0,
    debug: 0
  });
  
  // 数据库和加载状态
  const 数据库日志计数 = ref(0);
  const 最早加载的时间戳 = ref(null);
  const 最新加载的时间戳 = ref(null);
  const 正在加载更多 = ref(false);
  const 可以加载更多 = ref(true);
  const 待处理日志 = ref([]);
  const 正在处理 = ref(false);
  const 丢弃日志数 = ref(0);
  
  // 计算可用标签
  const 可用标签 = computed(() => {
    const 标签集合 = new Set();
    // 性能优化：限制遍历的数量
    const 最大遍历数 = Math.min(日志列表.value.length, 200);
    for (let i = 0; i < 最大遍历数; i++) {
      const 日志 = 日志列表.value[i];
      if (日志.标签 && Array.isArray(日志.标签)) {
        日志.标签.forEach(标签 => 标签集合.add(标签));
      }
    }
    return Array.from(标签集合).sort();
  });
  
  // 计算过滤后的日志
  const 过滤后的日志 = computed(() => {
    if (选中级别.value === '' && 搜索文本.value === '' && 选中标签.value === '') {
      return 日志列表.value;
    }
    
    let 结果 = 日志列表.value;
    
    if (选中级别.value !== '') {
      结果 = 结果.filter(日志 => 日志.级别 === 选中级别.value);
    }
    
    if (搜索文本.value) {
      const 搜索词 = 搜索文本.value.toLowerCase();
      结果 = 结果.filter(日志 => {
        try {
          const 内容 = 日志.内容;
          const 内容字符串 = typeof 内容 === 'object' ? JSON.stringify(内容) : String(内容 || '');
          return 内容字符串.toLowerCase().includes(搜索词) || 
                 (日志.来源 && 日志.来源.toLowerCase().includes(搜索词));
        } catch (e) {
          console.error('搜索过滤时出错:', e);
          return false;
        }
      });
    }
    
    if (选中标签.value !== '') {
      结果 = 结果.filter(日志 => {
        return 日志.标签 && Array.isArray(日志.标签) && 日志.标签.includes(选中标签.value);
      });
    }
    
    return 结果.slice(0, 选项.分页大小); // 限制最大显示数量以提高性能
  });
  
  /**
   * 异步初始化数据库
   */
  const 初始化数据库 = async () => {
    try {
      // 获取数据库中的日志计数
      数据库日志计数.value = await 数据库.获取日志计数();
      
      // 加载最新的日志
      const 最新日志 = await 数据库.加载日志(0, Math.min(选项.分页大小, 最大内存日志数.value));
      
      if (最新日志 && 最新日志.length > 0) {
        // 兼容两种数据结构 (新/旧)
        const 格式化日志 = 最新日志.map(日志 => {
          // 确保日志格式符合组件期望的格式
          return {
            id: 日志.id || 日志.timestamp || Date.now(),
            时间: 日志.时间 || 日志.timestamp || new Date().toISOString(),
            级别: 日志.级别 || 日志.level || 'info',
            内容: 日志.内容 || 日志.message || '',
            来源: 日志.来源 || 日志.category || 'Console',
            标签: 日志.tags || []
          };
        });
        
        日志列表.value = 格式化日志;
        
        // 更新时间戳范围
        if (格式化日志[0] && 格式化日志[0].时间) {
          最新加载的时间戳.value = 格式化日志[0].时间;
        }
        
        if (格式化日志[格式化日志.length - 1] && 格式化日志[格式化日志.length - 1].时间) {
          最早加载的时间戳.value = 格式化日志[格式化日志.length - 1].时间;
        }
        
        // 更新统计
        格式化日志.forEach(日志 => {
          日志统计.value.total++;
          if (日志.级别) {
            日志统计.value[日志.级别]++;
          }
        });
        
        // 设置可以加载更多的标志
        可以加载更多.value = 格式化日志.length < 数据库日志计数.value;
      }
    } catch (错误) {
      console.error('初始加载日志失败:', 错误);
    }
  };
  
  /**
   * 批量处理日志
   */
  const 批量处理日志 = async () => {
    if (正在处理.value) return;
    
    正在处理.value = true;
    
    // 使用更高效的批处理方式
    const 处理批次 = () => {
      const 批次日志 = 待处理日志.value.splice(0, Math.min(20, 待处理日志.value.length));
      if (批次日志.length === 0) {
        正在处理.value = false;
        return;
      }
      
      const 处理后日志 = [];
      const 数据库日志 = 批次日志.map(日志 => {
        // 确保日志格式正确
        const 新日志 = {
          id: 日志.id || (Date.now() + Math.random().toString(36).substr(2, 9)),
          时间: 日志.时间 || 日志.timestamp || new Date().toISOString(),
          级别: 日志.级别 || 日志.level || 'info',
          内容: 日志.内容 || 日志.message || '',
          来源: 日志.来源 || 日志.category || 'Console',
          标签: 日志.tags || []
        };
        
        处理后日志.push(新日志);
        
        // 更新统计
        日志统计.value.total++;
        if (新日志.级别) {
          日志统计.value[新日志.级别]++;
        }
        
        // 转换为数据库格式
        return {
          id: 新日志.id,
          timestamp: 新日志.时间,
          level: 新日志.级别,
          message: 新日志.内容,
          category: 新日志.来源,
          tags: 新日志.标签
        };
      });
      
      // 使用Promise.all更高效地处理保存操作
      Promise.all([
        数据库.保存日志(数据库日志),
        数据库.获取日志计数().then(计数 => 数据库日志计数.value = 计数)
      ]).then(() => {
        // 更新内存中的日志列表
        日志列表.value = [...日志列表.value, ...处理后日志];
        
        // 应用最大内存日志数限制
        if (日志列表.value.length > 最大内存日志数.value) {
          日志列表.value = 日志列表.value.slice(日志列表.value.length - 最大内存日志数.value);
        }
        
        // 更新时间戳范围
        if (处理后日志.length > 0) {
          const 最新日志 = 处理后日志[处理后日志.length - 1];
          最新加载的时间戳.value = 最新日志.时间;
          
          if (!最早加载的时间戳.value) {
            最早加载的时间戳.value = 最新日志.时间;
          }
        }
        
        // 继续处理队列中的日志
        if (待处理日志.value.length > 0) {
          setTimeout(处理批次, 50);
        } else {
          正在处理.value = false;
        }
      }).catch(错误 => {
        console.error('保存日志到数据库失败:', 错误);
        正在处理.value = false;
      });
    };
    
    // 使用requestAnimationFrame确保UI流畅
    requestAnimationFrame(处理批次);
  };
  
  /**
   * 添加日志到处理队列
   * @param {Object} 日志 - 日志对象
   */
  const 添加日志 = (日志) => {
    // 如果暂停接收，则丢弃日志
    if (暂停接收.value) {
      丢弃日志数.value++;
      return;
    }
    
    // 如果队列过长，丢弃一些日志
    if (待处理日志.value.length > 500) {
      丢弃日志数.value += (待处理日志.value.length - 500);
      待处理日志.value = 待处理日志.value.slice(待处理日志.value.length - 500);
    }
    
    // 将日志添加到待处理队列
    待处理日志.value.push(日志);
    
    // 如果未启动处理，则启动批量处理
    if (!正在处理.value) {
      批量处理日志();
    }
  };
  
  /**
   * 清空日志
   */
  const 清空日志 = async () => {
    try {
      // 清空内存中的日志
      日志列表.value = [];
      待处理日志.value = [];
      
      // 清空数据库中的日志
      await 数据库.清空日志();
      
      // 重置统计和状态
      日志统计.value = {
        total: 0,
        info: 0,
        warn: 0,
        error: 0,
        debug: 0
      };
      数据库日志计数.value = 0;
      最早加载的时间戳.value = null;
      最新加载的时间戳.value = null;
      可以加载更多.value = false;
      丢弃日志数.value = 0;
    } catch (错误) {
      console.error('清空日志数据库失败:', 错误);
    }
  };
  
  /**
   * 加载更多日志
   */
  const 加载更多日志 = async () => {
    if (正在加载更多.value || !最早加载的时间戳.value) return;
    
    正在加载更多.value = true;
    
    try {
      // 加载早于最早时间戳的日志
      const 较早日志 = await 数据库.加载早于时间戳的日志(最早加载的时间戳.value, 每页日志数.value);
      
      if (较早日志.length > 0) {
        // 更新最早的时间戳
        最早加载的时间戳.value = 较早日志[较早日志.length - 1].时间;
        
        // 确保新加载的日志有唯一的ID
        const 新日志 = 较早日志.map(日志 => {
          // 强制重新生成ID
          日志._elId = undefined;
          return 日志;
        });
        
        // 将较早的日志添加到列表前面
        日志列表.value = [...新日志, ...日志列表.value];
        
        // 限制内存中的日志总数
        if (日志列表.value.length > 最大内存日志数.value) {
          日志列表.value = 日志列表.value.slice(0, 最大内存日志数.value);
        }
      } else {
        // 没有更多日志了
        可以加载更多.value = false;
      }
    } catch (错误) {
      console.error('加载更多日志失败:', 错误);
    } finally {
      正在加载更多.value = false;
    }
  };
  
  /**
   * 导出日志
   */
  const 导出日志 = async () => {
    try {
      // 从数据库导出所有日志
      let 所有日志 = [];
      let 页码 = 0;
      const 每页数量 = 10000;
      let 继续导出 = true;
      
      while (继续导出) {
        const 日志批次 = await 数据库.加载日志(页码, 每页数量);
        所有日志 = [...所有日志, ...日志批次];
        
        if (日志批次.length < 每页数量) {
          继续导出 = false;
        } else {
          页码++;
        }
        
        // 安全限制，最多导出100万条
        if (所有日志.length >= 1000000) {
          继续导出 = false;
        }
      }
      
      // 将日志转换为文本格式
      const 文本 = 格式化器.日志列表转文本(所有日志);
      
      // 创建并下载文件
      const blob = new Blob([文本], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `日志_${new Date().toLocaleDateString().replace(/[\/\s:]/g, '_')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('导出日志失败:', e);
    }
  };
  
  /**
   * 应用最大日志数限制
   */
  const 应用最大日志数 = () => {
    if (日志列表.value.length > 最大内存日志数.value) {
      日志列表.value = 日志列表.value.slice(日志列表.value.length - 最大内存日志数.value);
    }
  };
  
  return {
    // 状态
    日志列表,
    最大内存日志数,
    每页日志数,
    自动滚动,
    暂停接收,
    选中级别,
    搜索文本,
    选中标签,
    日志统计,
    数据库日志计数,
    最早加载的时间戳,
    最新加载的时间戳,
    正在加载更多,
    可以加载更多,
    待处理日志,
    正在处理,
    丢弃日志数,
    
    // 计算属性
    过滤后的日志,
    可用标签,
    
    // 方法
    初始化数据库,
    添加日志,
    清空日志,
    加载更多日志,
    导出日志,
    应用最大日志数,
    获取元素ID
  };
} 