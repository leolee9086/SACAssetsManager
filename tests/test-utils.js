/**
 * 测试工具函数
 * 提供测试配置加载、测试选择和结果记录等功能
 */

const fs = require('fs');
const path = require('path');

/**
 * 默认测试配置
 */
const 默认测试配置 = {
  // 测试分类配置
  categories: {
    // 基础工具测试
    base: {
      enabled: true,
      path: 'base',
      tests: {
        '流化器测试.js': true
      }
    },
    // 功能测试
    feature: {
      enabled: true,
      path: 'feature',
      tests: {
        '向量嵌入测试.js': true,
        '性能测试.js': true,
        'MIME链测试.js': true,
        '串链器测试.js': true
      }
    },
    // 应用场景测试
    useAge: {
      enabled: true,
      path: 'useAge',
      tests: {}
    }
  },
  // 测试运行选项
  options: {
    // 是否在启动时自动运行测试
    autoRunOnStartup: false,
    // 是否在首次失败时停止测试
    stopOnFirstFailure: false,
    // 是否将结果记录到控制台
    logToConsole: true,
    // 每个测试的超时时间(毫秒)
    timeout: 10000
  }
};

/**
 * 加载测试配置
 * 从文件系统读取配置，如果不存在则使用默认配置
 * @returns {Object} 测试配置对象
 */
function 加载测试配置() {
  const workspaceDir = window.siyuan?.config?.system?.workspaceDir || '';
  const 配置文件路径 = path.join(workspaceDir, 'data/plugins/SACAssetsManager/tests/test-config.json');
  
  try {
    if (fs.existsSync(配置文件路径)) {
      const 配置文本 = fs.readFileSync(配置文件路径, 'utf-8');
      return JSON.parse(配置文本);
    }
  } catch (错误) {
    console.error('加载测试配置失败，使用默认配置:', 错误);
  }
  
  return {...默认测试配置};
}

/**
 * 保存测试配置
 * @param {Object} 配置 - 要保存的测试配置
 * @returns {boolean} 是否成功保存
 */
function 保存测试配置(配置) {
  const workspaceDir = window.siyuan?.config?.system?.workspaceDir || '';
  const 配置文件路径 = path.join(workspaceDir, 'data/plugins/SACAssetsManager/tests/test-config.json');
  
  try {
    // 确保目录存在
    const 目录路径 = path.dirname(配置文件路径);
    if (!fs.existsSync(目录路径)) {
      fs.mkdirSync(目录路径, { recursive: true });
    }
    
    // 保存配置
    fs.writeFileSync(配置文件路径, JSON.stringify(配置, null, 2), 'utf-8');
    return true;
  } catch (错误) {
    console.error('保存测试配置失败:', 错误);
    return false;
  }
}

/**
 * 检查测试是否应该运行
 * @param {string} 测试路径 - 测试文件路径
 * @param {string} 分类 - 测试分类
 * @param {Object} 配置 - 测试配置
 * @returns {boolean} 是否应该运行该测试
 */
function 应该运行测试(测试路径, 分类, 配置) {
  // 检查分类是否启用
  if (!配置.categories[分类]?.enabled) {
    return false;
  }
  
  // 获取测试文件名
  const 测试文件名 = path.basename(测试路径);
  
  // 检查具体测试是否启用
  const 分类配置 = 配置.categories[分类];
  
  // 如果测试未明确配置，则默认启用
  if (分类配置.tests[测试文件名] === undefined) {
    return true;
  }
  
  return !!分类配置.tests[测试文件名];
}

/**
 * 获取启用的测试列表
 * @param {string} 目录路径 - 测试目录路径
 * @param {string} 分类 - 测试分类
 * @param {Object} 配置 - 测试配置
 * @returns {string[]} 启用的测试文件路径列表
 */
function 获取启用的测试列表(目录路径, 分类, 配置) {
  try {
    // 使用Node API读取目录下的所有JS文件
    const 文件列表 = fs.readdirSync(目录路径)
      .filter(文件名 => 文件名.endsWith('.js') && 文件名 !== 'run.js' && 文件名 !== 'index.js')
      .map(文件名 => path.resolve(目录路径, 文件名));
    
    // 过滤出应该运行的测试
    return 文件列表.filter(文件路径 => 应该运行测试(文件路径, 分类, 配置));
  } catch (错误) {
    console.error(`读取目录 ${目录路径} 失败:`, 错误);
    return [];
  }
}

/**
 * 格式化测试结果
 * @param {Object} 结果 - 测试结果对象
 * @returns {string} 格式化后的结果文本
 */
function 格式化测试结果(结果) {
  if (!结果) return '无测试结果';
  
  const 日期 = new Date(结果.timestamp).toLocaleString();
  const 总数 = 结果.total || 0;
  const 通过数 = 结果.passed || 0;
  const 失败数 = 结果.failed || 0;
  const 时长 = 结果.duration ? `${结果.duration}ms` : '未知';
  
  return `测试时间: ${日期}\n总测试: ${总数}\n通过: ${通过数}\n失败: ${失败数}\n总耗时: ${时长}`;
}

/**
 * 记录测试结果
 * @param {Object} 结果 - 测试结果对象
 */
function 记录测试结果(结果) {
  const workspaceDir = window.siyuan?.config?.system?.workspaceDir || '';
  const 结果目录 = path.join(workspaceDir, 'data/plugins/SACAssetsManager/tests/results');
  const 结果文件 = path.join(结果目录, `test-result-${Date.now()}.json`);
  
  try {
    // 确保目录存在
    if (!fs.existsSync(结果目录)) {
      fs.mkdirSync(结果目录, { recursive: true });
    }
    
    // 保存结果
    fs.writeFileSync(结果文件, JSON.stringify(结果, null, 2), 'utf-8');
    
    // 保留最后10个结果文件
    const 所有结果文件 = fs.readdirSync(结果目录)
      .filter(文件名 => 文件名.startsWith('test-result-'))
      .map(文件名 => ({
        名称: 文件名,
        路径: path.join(结果目录, 文件名),
        时间: parseInt(文件名.replace('test-result-', '').replace('.json', '')) || 0
      }))
      .sort((a, b) => b.时间 - a.时间);
    
    // 删除旧的结果文件
    if (所有结果文件.length > 10) {
      所有结果文件.slice(10).forEach(文件 => {
        try {
          fs.unlinkSync(文件.路径);
        } catch (e) {
          console.error(`删除旧测试结果文件失败: ${文件.路径}`, e);
        }
      });
    }
  } catch (错误) {
    console.error('记录测试结果失败:', 错误);
  }
}

// 导出工具函数
export {
  加载测试配置,
  保存测试配置,
  应该运行测试,
  获取启用的测试列表,
  格式化测试结果,
  记录测试结果
}; 