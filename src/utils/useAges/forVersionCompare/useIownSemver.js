/**
 * 完整的语义化版本(Semantic Versioning)实现
 * 提供与'semver'包相同甚至更强的功能
 * @author 您的团队
 */

// 版本号正则表达式，支持完整的semver规范 (https://semver.org/)
const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

// 版本范围比较符号
const COMPARATORS = {
  '>': (a, b) => a > b,
  '<': (a, b) => a < b,
  '=': (a, b) => a === b,
  '>=': (a, b) => a >= b,
  '<=': (a, b) => a <= b,
  '!=': (a, b) => a !== b
};

/**
 * 配置选项，允许全局修改库行为
 * @type {Object}
 */
export const CONFIG = {
  strictMode: true, // 严格模式会拒绝任何不完全符合规范的版本
  cacheSize: 1000,  // 缓存大小上限
  allowV: true,     // 是否允许版本号前缀v（如v1.2.3）
  i18n: {
    enabled: false,
    locale: 'zh-CN'
  }
};

/**
 * 设置全局配置
 * @param {Object} options 配置选项
 * @returns {Object} 更新后的配置
 */
export function configure(options) {
  if (!options || typeof options !== 'object') return CONFIG;
  
  Object.keys(options).forEach(key => {
    if (key in CONFIG) {
      if (key === 'i18n' && typeof options[key] === 'object') {
        Object.assign(CONFIG.i18n, options[key]);
      } else {
        CONFIG[key] = options[key];
      }
    }
  });
  
  // 配置更新后，清理缓存
  if ('cacheSize' in options && options.cacheSize !== MAX_CACHE_SIZE) {
    MAX_CACHE_SIZE = options.cacheSize;
    clearParseCache();
  }
  
  return { ...CONFIG };
}

/**
 * 解析语义化版本为结构化对象
 * @param {string} versionStr 版本字符串
 * @returns {Object|null} 解析后的版本对象，无效则返回null
 */
export function parse(versionStr) {
  if (typeof versionStr !== 'string') {
    return null;
  }

  const match = SEMVER_REGEX.exec(versionStr);
  if (!match) {
    return null;
  }

  const [, major, minor, patch, prerelease, buildmetadata] = match;

  const result = {
    major: parseInt(major, 10),
    minor: parseInt(minor, 10),
    patch: parseInt(patch, 10),
    prerelease: prerelease ? prerelease.split('.') : [],
    buildmetadata: buildmetadata ? buildmetadata.split('.') : [],
    version: versionStr,
    raw: versionStr
  };

  // 处理预发布版本标识符（将数字字符串转换为数字）
  result.prerelease = result.prerelease.map(part => {
    const num = Number(part);
    return isNaN(num) ? part : (String(num) === part ? num : part);
  });

  return result;
}

/**
 * 实现LRU缓存（最近最少使用缓存）
 * 替代原来的简单Map缓存，解决缓存管理和内存泄漏问题
 */
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
    this.usage = new Map();
    this.lastUsed = new Map();
    // 添加一个访问顺序跟踪
    this.accessOrder = [];
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    
    // 更新使用频率和最近使用时间
    this.usage.set(key, (this.usage.get(key) || 0) + 1);
    this.lastUsed.set(key, Date.now());
    
    // 更新访问顺序（移除旧位置并添加到末尾）
    this.updateAccessOrder(key);
    
    return this.cache.get(key);
  }

  set(key, value) {
    // 如果已经存在，更新值和计数器
    if (this.cache.has(key)) {
      this.cache.set(key, value);
      this.usage.set(key, (this.usage.get(key) || 0) + 1);
      this.lastUsed.set(key, Date.now());
      // 更新访问顺序
      this.updateAccessOrder(key);
      return;
    }
    
    // 检查容量，如果满了则清除最久未使用的项
    if (this.cache.size >= this.capacity) {
      this.evict();
    }
    
    // 设置新值
    this.cache.set(key, value);
    this.usage.set(key, 1);
    this.lastUsed.set(key, Date.now());
    // 添加到访问顺序末尾
    this.accessOrder.push(key);
  }

  updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  evict() {
    // 使用访问顺序列表，始终淘汰最久未访问的键
    if (this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift();
      this.cache.delete(oldestKey);
      this.usage.delete(oldestKey);
      this.lastUsed.delete(oldestKey);
    }
  }

  clear() {
    this.cache.clear();
    this.usage.clear();
    this.lastUsed.clear();
    this.accessOrder.length = 0;
  }

  has(key) {
    return this.cache.has(key);
  }

  get size() {
    return this.cache.size;
  }

  // 获取统计数据
  getStats() {
    // 按使用频率排序，获取前10个
    const topFrequent = [...this.usage.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => ({ version: key, count }));
    
    return {
      size: this.cache.size,
      maxSize: this.capacity,
      topFrequent
    };
  }
}

// 使用LRU缓存替代原来的Map
let MAX_CACHE_SIZE = CONFIG.cacheSize;
const parseCache = new LRUCache(MAX_CACHE_SIZE);

/**
 * 缓存统计对象 - 用于性能监控
 * @type {Object}
 */
const cacheStats = {
  hits: 0,
  misses: 0
};

export function cachedParse(version) {
  const cached = parseCache.get(version);
  if (cached) {
    cacheStats.hits++;
    return cached;
  }
  
  cacheStats.misses++;
  const result = parse(version);
  parseCache.set(version, result);
  return result;
}

/**
 * 检查版本字符串是否有效
 * @param {string} version 版本字符串
 * @returns {boolean} 是否有效
 */
export function isValid(version) {
  return cachedParse(version) !== null;
}

/**
 * 净化版本字符串（修复小问题）
 * @param {string} version 可能不规范的版本字符串
 * @returns {string|null} 修复后的版本，无法修复则返回null
 */
export function clean(version) {
  if (typeof version !== 'string') return null;
  
  // 处理常见格式问题: 删除前导"v"、"="等
  version = version.trim().replace(/^[=v]+/, '');
  
  // 处理"1.2.3-beta.1+build.2"格式
  const match = SEMVER_REGEX.exec(version);
  if (match) {
    return version;
  }
  
  // 尝试修复不完整的版本
  if (/^\d+$/.test(version)) {
    return `${version}.0.0`;
  } else if (/^\d+\.\d+$/.test(version)) {
    return `${version}.0`;
  } else if (/^\d+\.\d+\.\d+$/.test(version)) {
    return version;
  }

  // 尝试处理额外格式："v1.2"、"1.2b2"等
  const basicVersionMatch = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(.*)$/.exec(version);
  if (basicVersionMatch) {
    const [, maj, min = '0', pat = '0', extra] = basicVersionMatch;
    const cleanVersion = `${maj}.${min}.${pat}`;
    
    // 如果额外部分可能是预发布标识符
    if (extra && /^[-+]?[0-9a-zA-Z.-]+$/.test(extra)) {
      // 尝试标准化额外部分
      const extraPart = extra.replace(/^[^0-9a-zA-Z]+/, '-');
      return `${cleanVersion}${extraPart}`;
    }
    
    return cleanVersion;
  }
  
  return null;
}

/**
 * 比较两个版本的预发布部分 - 改进版
 * @param {Array} prerelease1 第一个预发布数组
 * @param {Array} prerelease2 第二个预发布数组
 * @returns {number} 比较结果：-1, 0, 1
 */
function comparePrerelease(prerelease1, prerelease2) {
  if (prerelease1.length === 0 && prerelease2.length === 0) return 0;
  if (prerelease1.length === 0) return 1; // 无预发布 > 有预发布
  if (prerelease2.length === 0) return -1; // 有预发布 < 无预发布
  
  const minLength = Math.min(prerelease1.length, prerelease2.length);
  
  for (let i = 0; i < minLength; i++) {
    const a = prerelease1[i];
    const b = prerelease2[i];
    
    if (a === b) continue;
    
    // 数字比较
    const aNum = typeof a === 'number';
    const bNum = typeof b === 'number';
    
    if (aNum && bNum) return a > b ? 1 : -1;
    if (aNum) return -1; // 数字 < 字符串
    if (bNum) return 1;  // 字符串 > 数字
    
    // 字符串比较 - 使用localeCompare以获得更一致的结果
    return String(a).localeCompare(String(b), 'en');
  }
  
  // 如果共同部分相等，则较长的预发布标识符版本较低
  // 这是因为 1.0.0-alpha < 1.0.0
  return prerelease1.length > prerelease2.length ? -1 : 
         prerelease1.length < prerelease2.length ? 1 : 0;
}

/**
 * 比较两个语义化版本
 * @param {string} v1 第一个版本
 * @param {string} v2 第二个版本
 * @returns {number} 如果v1>v2返回1，如果v1<v2返回-1，如果相等返回0
 */
export function compareVersions(v1, v2) {
  const parsed1 = cachedParse(v1);
  const parsed2 = cachedParse(v2);
  
  if (parsed1 === null && parsed2 === null) return 0;
  if (parsed1 === null) return -1;
  if (parsed2 === null) return 1;
  
  // 比较主版本号
  if (parsed1.major !== parsed2.major) {
    return parsed1.major > parsed2.major ? 1 : -1;
  }
  
  // 比较次版本号
  if (parsed1.minor !== parsed2.minor) {
    return parsed1.minor > parsed2.minor ? 1 : -1;
  }
  
  // 比较修订号
  if (parsed1.patch !== parsed2.patch) {
    return parsed1.patch > parsed2.patch ? 1 : -1;
  }
  
  // 比较预发布版本
  return comparePrerelease(parsed1.prerelease, parsed2.prerelease);
}

/**
 * 提供便捷的版本比较函数
 */
export const gt = (v1, v2) => compareVersions(v1, v2) > 0;
export const lt = (v1, v2) => compareVersions(v1, v2) < 0;
export const eq = (v1, v2) => compareVersions(v1, v2) === 0;
export const gte = (v1, v2) => compareVersions(v1, v2) >= 0;
export const lte = (v1, v2) => compareVersions(v1, v2) <= 0;
export const neq = (v1, v2) => compareVersions(v1, v2) !== 0;

/**
 * 获取版本的主版本号
 * @param {string} version 版本字符串
 * @returns {number|null} 主版本号
 */
export function major(version) {
  const parsed = cachedParse(version);
  return parsed ? parsed.major : null;
}

/**
 * 获取版本的次版本号
 * @param {string} version 版本字符串
 * @returns {number|null} 次版本号
 */
export function minor(version) {
  const parsed = cachedParse(version);
  return parsed ? parsed.minor : null;
}

/**
 * 获取版本的修订号
 * @param {string} version 版本字符串
 * @returns {number|null} 修订号
 */
export function patch(version) {
  const parsed = cachedParse(version);
  return parsed ? parsed.patch : null;
}

/**
 * 获取版本的预发布标签
 * @param {string} version 版本字符串
 * @returns {Array|null} 预发布标签数组
 */
export function prerelease(version) {
  const parsed = cachedParse(version);
  return parsed && parsed.prerelease.length > 0 ? parsed.prerelease : null;
}

/**
 * 递增版本号
 * @param {string} version 当前版本
 * @param {string} release 递增级别: major, minor, patch, premajor, preminor, prepatch, prerelease
 * @param {string} [identifier] 预发布标识符
 * @returns {string|null} 递增后的版本
 */
export function inc(version, release, identifier) {
  const parsed = cachedParse(version);
  if (!parsed) return null;
  
  let { major: maj, minor: min, patch: pat, prerelease: pre } = parsed;
  
  switch (release) {
    case 'major':
      // 如果当前是预发布版本且主版本已增加，不再增加主版本
      if (pre.length > 0 && maj > 0 && min === 0 && pat === 0) {
        pre = [];
      } else {
        maj++;
        min = 0;
        pat = 0;
        pre = [];
      }
      break;
    case 'minor':
      // 如果当前是预发布版本且次版本已增加，不再增加次版本
      if (pre.length > 0 && min > 0 && pat === 0) {
        pre = [];
      } else {
        min++;
        pat = 0;
        pre = [];
      }
      break;
    case 'patch':
      // 如果当前是预发布补丁版本，只需移除预发布标识
      if (pre.length > 0) {
        pre = [];
      } else {
        pat++;
      }
      break;
    case 'premajor':
      maj++;
      min = 0;
      pat = 0;
      pre = [identifier || 'alpha', 0];
      break;
    case 'preminor':
      min++;
      pat = 0;
      pre = [identifier || 'alpha', 0];
      break;
    case 'prepatch':
      pat++;
      pre = [identifier || 'alpha', 0];
      break;
    case 'prerelease':
      if (pre.length === 0) {
        // 如果不是预发布版本，则递增patch并添加预发布标识
        pat++;
        pre = [identifier || 'alpha', 0];
      } else {
        // 已经是预发布版本
        let lastIdx = pre.length - 1;
        const id = identifier || pre[0]; // 保持相同的预发布标识符
        
        if (id !== pre[0]) {
          // 如果标识符变了，重置计数
          pre = [id, 0];
        } else if (typeof pre[lastIdx] === 'number') {
          // 递增最后的数字
          pre[lastIdx]++;
        } else {
          // 最后部分不是数字，添加一个数字
          pre.push(0);
        }
      }
      break;
    default:
      return null;
  }
  
  // 构建新版本字符串
  let result = `${maj}.${min}.${pat}`;
  if (pre.length > 0) {
    result += `-${pre.join('.')}`;
  }
  
  // 保留构建元数据(如果存在)
  if (parsed.buildmetadata.length > 0) {
    result += `+${parsed.buildmetadata.join('.')}`;
  }
  
  return result;
}

/**
 * 计算两个版本之间的差异类型
 * @param {string} v1 第一个版本
 * @param {string} v2 第二个版本
 * @returns {string|null} 差异类型: major, minor, patch, prerelease, null(无法比较)
 */
export function diff(v1, v2) {
  const p1 = cachedParse(v1);
  const p2 = cachedParse(v2);
  
  if (!p1 || !p2) return null;
  
  if (p1.major !== p2.major) return 'major';
  if (p1.minor !== p2.minor) return 'minor';
  if (p1.patch !== p2.patch) return 'patch';
  
  if (p1.prerelease.length !== p2.prerelease.length) return 'prerelease';
  
  for (let i = 0; i < p1.prerelease.length; i++) {
    if (p1.prerelease[i] !== p2.prerelease[i]) return 'prerelease';
  }
  
  return null; // 版本相同
}

/**
 * 排序版本数组
 * @param {string[]} versions 版本数组
 * @param {boolean} [ascending=true] 是否升序
 * @returns {string[]} 排序后的数组
 */
export function sort(versions, ascending = true) {
  return [...versions].sort((a, b) => {
    const result = compareVersions(a, b);
    return ascending ? result : -result;
  });
}

/**
 * 解析单个比较器表达式 - 增强版
 * @param {string} comp 比较器表达式 (如 >=1.2.3)
 * @returns {Object|null} 解析结果
 */
function parseComparator(comp) {
  comp = comp.trim();
  
  // 特殊处理 * 或 x.x.x 等通配符
  if (comp === '*' || comp === 'x' || comp === 'X' || 
      comp === '*.*.*' || comp === 'x.x.x' || comp === 'X.X.X') {
    return { operator: '>=', version: '0.0.0' };
  }
  
  // 处理部分通配符，如 1.x.x 或 1.2.*
  const wildcardMatch = /^(\d+)(?:\.([*xX]|\d+))?(?:\.([*xX]|\d+))?$/.exec(comp);
  if (wildcardMatch) {
    const [, major, minor = '*', patch = '*'] = wildcardMatch;
    if (minor === '*' || minor === 'x' || minor === 'X') {
      return { 
        operator: '>=', 
        version: `${major}.0.0`,
        upperBound: { operator: '<', version: `${parseInt(major, 10) + 1}.0.0` }
      };
    }
    if (patch === '*' || patch === 'x' || patch === 'X') {
      return { 
        operator: '>=', 
        version: `${major}.${minor}.0`,
        upperBound: { operator: '<', version: `${major}.${parseInt(minor, 10) + 1}.0` }
      };
    }
    return { operator: '=', version: `${major}.${minor}.${patch}` };
  }
  
  // 尝试匹配操作符
  const ops = Object.keys(COMPARATORS).sort((a, b) => b.length - a.length); // 长的操作符优先
  let operator = '=';
  let version = comp;
  
  for (const op of ops) {
    if (comp.startsWith(op)) {
      operator = op;
      version = comp.slice(op.length).trim();
      break;
    }
  }
  
  // 清理和验证版本
  version = clean(version);
  if (!version) return null;
  
  // 处理超大版本号的边界情况
  const parsed = parse(version);
  if (parsed) {
    // 检查版本号是否超过JS安全整数
    if (parsed.major > Number.MAX_SAFE_INTEGER || 
        parsed.minor > Number.MAX_SAFE_INTEGER || 
        parsed.patch > Number.MAX_SAFE_INTEGER) {
      // 限制在安全范围内
      const safeVersion = `${
        Math.min(parsed.major, Number.MAX_SAFE_INTEGER)
      }.${
        Math.min(parsed.minor, Number.MAX_SAFE_INTEGER)
      }.${
        Math.min(parsed.patch, Number.MAX_SAFE_INTEGER)
      }`;
      return { operator, version: safeVersion };
    }
  }
  
  return { operator, version };
}

/**
 * 解析版本范围 - 增强版
 * @param {string} range 版本范围
 * @param {number} [depth=0] 当前递归深度
 * @returns {Object} 解析结果
 */
export function parseVersionRange(range, depth = 0) {
  if (!range || typeof range !== 'string') {
    return { type: 'invalid', original: range };
  }
  
  // 防止过度复杂的表达式导致性能问题
  if (range.length > 1000) {
    return { type: 'invalid', original: range, reason: '表达式过长' };
  }
  
  range = range.trim();
  
  // 处理精确版本
  if (isValid(range)) {
    return {
      type: 'exact',
      version: range,
      original: range
    };
  }
  
  // 处理通配符
  if (range === '*' || range === 'x' || range === 'X' || 
      range === '*.*.*' || range === 'x.x.x' || range === 'X.X.X') {
    return {
      type: 'any',
      original: range
    };
  }
  
  // 处理兼容版本 (^)
  if (range.startsWith('^')) {
    const version = range.substring(1);
    if (!isValid(version)) {
      return { type: 'invalid', original: range };
    }
    return {
      type: 'compatible',
      version: version,
      original: range
    };
  }
  
  // 处理补丁版本 (~)
  if (range.startsWith('~')) {
    const version = range.substring(1);
    if (!isValid(version)) {
      return { type: 'invalid', original: range };
    }
    return {
      type: 'patch',
      version: version,
      original: range
    };
  }
  
  // 处理范围版本 (1.2.3 - 2.0.0)
  if (range.includes(' - ')) {
    const [min, max] = range.split(' - ').map(v => v.trim());
    if (!isValid(min) || !isValid(max)) {
      return { type: 'invalid', original: range };
    }
    
    // 验证范围的合理性（确保最小值不大于最大值）
    if (gt(min, max)) {
      return { type: 'invalid', original: range, reason: 'min > max' };
    }
    
    return {
      type: 'range',
      min: min,
      max: max,
      original: range
    };
  }
  
  // 处理组合比较器和括号表达式
  if (/[<>=\(\)]/.test(range)) {
    return parseComplexExpression(range, depth);
  }
  
  return { type: 'invalid', original: range };
}

/**
 * 解析复杂表达式 - 新增函数
 * @param {string} expression 表达式
 * @param {number} [depth=0] 当前递归深度
 * @returns {Object} 解析结果
 */
function parseComplexExpression(expression, depth = 0) {
  // 处理括号表达式
  if (expression.includes('(') || expression.includes(')')) {
    // 这里需要解析嵌套结构，简化版实现
    return parseNestedExpression(expression, depth + 1);
  }
  
  // 处理空格分隔的比较器 (>1.2.3 <2.0.0)
  const comparators = expression.split(/\s+/).filter(Boolean);
  const parsedComps = [];
  
  for (const comp of comparators) {
    const parsed = parseComparator(comp);
    if (!parsed) {
      return { type: 'invalid', original: expression };
    }
    parsedComps.push(parsed);
  }
  
  return {
    type: 'comparator',
    comparators: parsedComps,
    original: expression
  };
}

/**
 * 解析嵌套表达式 - 安全版本
 * 处理形如 (>1.0.0 <2.0.0) || (>=3.0.0) 的表达式
 * @param {string} expression 嵌套表达式
 * @param {number} [depth=0] 当前递归深度
 * @returns {Object} 解析结果
 */
function parseNestedExpression(expression, depth = 0) {
  // 防止栈溢出，限制递归深度
  const MAX_DEPTH = 10;
  if (depth > MAX_DEPTH) {
    return { type: 'invalid', original: expression, reason: '表达式嵌套过深' };
  }
  
  // 首先处理 || 运算符分隔的表达式
  if (expression.includes('||')) {
    const orParts = [];
    let currentPart = '';
    let parenLevel = 0;
    
    // 正确处理括号嵌套中的 || 操作符
    for (let i = 0; i < expression.length; i++) {
      const char = expression[i];
      
      if (char === '(') parenLevel++;
      else if (char === ')') parenLevel--;
      
      // 只有在括号外部才能分割 || 操作符
      if (char === '|' && expression[i+1] === '|' && parenLevel === 0) {
        orParts.push(currentPart.trim());
        currentPart = '';
        i++; // 跳过第二个 |
      } else {
        currentPart += char;
      }
    }
    
    if (currentPart.trim()) {
      orParts.push(currentPart.trim());
    }
    
    if (orParts.length > 1) {
      return {
        type: 'or',
        expressions: orParts.map(part => parseVersionRange(part, depth + 1)),
        original: expression
      };
    }
  }
  
  // 处理括号表达式
  const bracketGroups = [];
  let bracketContent = '';
  let parenLevel = 0;
  let groupStartIndex = -1;
  
  for (let i = 0; i < expression.length; i++) {
    const char = expression.charAt(i);
    
    if (char === '(' && parenLevel === 0) {
      parenLevel = 1;
      groupStartIndex = i;
      bracketContent = ''; // 重置括号内容
    } else if (char === '(' && parenLevel > 0) {
      parenLevel++;
      bracketContent += char;
    } else if (char === ')' && parenLevel > 1) {
      parenLevel--;
      bracketContent += char;
    } else if (char === ')' && parenLevel === 1) {
      parenLevel = 0;
      bracketGroups.push({
        full: expression.substring(groupStartIndex, i + 1),
        content: bracketContent,
        startIndex: groupStartIndex,
        endIndex: i
      });
    } else if (parenLevel > 0) {
      bracketContent += char;
    }
  }
  
  // 如果有括号组，处理它们
  if (bracketGroups.length > 0) {
    // 替换每个括号组为一个占位符，以处理外部的操作符
    let processedExpression = expression;
    const placeholders = [];
    
    bracketGroups.forEach((group, index) => {
      const placeholder = `__BRACKET_${index}__`;
      processedExpression = processedExpression.substring(0, group.startIndex) + 
                           placeholder + 
                           processedExpression.substring(group.endIndex + 1);
      placeholders.push({
        placeholder,
        content: group.content
      });
    });
    
    // 处理占位符外部的操作符
    const comparators = processedExpression.split(/\s+/).filter(Boolean);
    const resolvedComparators = [];
    
    for (const comp of comparators) {
      // 检查是否是占位符
      const placeholderMatch = /^__BRACKET_(\d+)__$/.exec(comp);
      if (placeholderMatch) {
        const placeholderIndex = parseInt(placeholderMatch[1], 10);
        // 添加安全检查，确保索引在范围内
        if (placeholderIndex >= 0 && placeholderIndex < placeholders.length) {
          const groupContent = placeholders[placeholderIndex].content;
          // 递归解析括号内容
          resolvedComparators.push(parseVersionRange(groupContent, depth + 1));
        } else {
          // 无效占位符索引
          resolvedComparators.push({ type: 'invalid', original: comp });
        }
      } else {
        const parsed = parseComparator(comp);
        if (parsed) {
          resolvedComparators.push({
            type: 'comparator',
            comparators: [parsed],
            original: comp
          });
        } else {
          resolvedComparators.push({ type: 'invalid', original: comp });
        }
      }
    }
    
    if (resolvedComparators.length === 1) {
      return resolvedComparators[0];
    }
    
    return {
      type: 'group',
      expressions: resolvedComparators,
      original: expression
    };
  }
  
  // 没有复杂结构，作为普通的比较器组处理
  return parseComplexExpression(expression.replace(/[()]/g, '').trim());
}

/**
 * 测试版本是否满足比较器
 * @param {string} version 版本
 * @param {Object} comparator 比较器对象
 * @returns {boolean} 是否满足
 */
function testComparator(version, comparator) {
  if (!isValid(version)) return false;
  
  const { operator, version: compVersion, upperBound } = comparator;
  const result = compareVersions(version, compVersion);
  
  // 处理带有上界的比较器（通配符情况）
  const basicResult = COMPARATORS[operator](result, 0);
  if (!basicResult) return false;
  
  if (upperBound) {
    const upperResult = compareVersions(version, upperBound.version);
    return COMPARATORS[upperBound.operator](upperResult, 0);
  }
  
  return true;
}

/**
 * 检查版本是否满足版本范围 - 增强版
 * @param {string} version 要检查的版本
 * @param {string} range 版本范围
 * @returns {boolean} 是否满足
 */
export function satisfiesVersion(version, range) {
  if (!isValid(version)) return false;
  if (!range || typeof range !== 'string') return false;
  
  // 处理多个范围条件，用 || 分隔 (OR 条件)
  if (range.includes('||')) {
    return range.split('||').some(r => satisfiesVersion(version, r.trim()));
  }
  
  const parsed = parseVersionRange(range);
  
  switch (parsed.type) {
    case 'exact':
      return compareVersions(version, parsed.version) === 0;
    
    case 'any':
      return true;
    
    case 'compatible': {
      const parsedVersion = cachedParse(parsed.version);
      if (!parsedVersion) return false;
      
      // ^0.x.x 特殊处理: 只允许补丁版本变化
      if (parsedVersion.major === 0) {
        if (parsedVersion.minor === 0) {
          // ^0.0.x 只允许当前版本
          return eq(version, parsed.version);
        }
        // ^0.y.x 只允许补丁版本变化
        const nextMinor = `0.${parsedVersion.minor + 1}.0`;
        return gte(version, parsed.version) && lt(version, nextMinor);
      }
      
      // ^1.x.x 允许次版本和补丁版本变化
      const nextMajor = `${parsedVersion.major + 1}.0.0`;
      return gte(version, parsed.version) && lt(version, nextMajor);
    }
    
    case 'patch': {
      const parsedVersion = cachedParse(parsed.version);
      if (!parsedVersion) return false;
      
      const nextMinor = `${parsedVersion.major}.${parsedVersion.minor + 1}.0`;
      return gte(version, parsed.version) && lt(version, nextMinor);
    }
    
    case 'range':
      return gte(version, parsed.min) && lte(version, parsed.max);
    
    case 'comparator': {
      // 所有比较器必须同时满足 (AND 条件)
      return parsed.comparators.every(comp => testComparator(version, comp));
    }
    
    case 'or': {
      // 任一子表达式满足即可
      return parsed.expressions.some(expr => 
        satisfiesVersion(version, expr.original)
      );
    }
    
    case 'group': {
      // 所有子表达式都必须满足
      return parsed.expressions.every(expr => 
        satisfiesVersion(version, expr.original)
      );
    }
    
    default:
      return false;
  }
}

/**
 * 验证版本范围是否有效
 * @param {string} range 版本范围
 * @returns {string|null} 规范化的范围字符串，无效则返回null
 */
export function validRange(range) {
  const parsed = parseVersionRange(range);
  if (parsed.type === 'invalid') return null;
  return parsed.original;
}

/**
 * 创建一个版本
 * @param {number} major 主版本号
 * @param {number} minor 次版本号
 * @param {number} patch 修订号
 * @param {string|Array} [prerelease] 预发布标识符
 * @param {string|Array} [buildmetadata] 构建元数据
 * @returns {string} 版本字符串
 */
export function make(major, minor, patch, prerelease, buildmetadata) {
  let version = `${major}.${minor}.${patch}`;
  
  if (prerelease) {
    const pre = Array.isArray(prerelease) ? prerelease.join('.') : prerelease;
    version += `-${pre}`;
  }
  
  if (buildmetadata) {
    const build = Array.isArray(buildmetadata) ? buildmetadata.join('.') : buildmetadata;
    version += `+${build}`;
  }
  
  return version;
}

/**
 * 检查版本是否在范围之外
 * @param {string} version 版本
 * @param {string} range 范围
 * @param {boolean} [hilo='<'] 检查较低还是较高
 * @returns {boolean} 是否在范围外
 */
export function outside(version, range, hilo = '<') {
  if (!['<', '>', '<=', '>='].includes(hilo)) {
    throw new Error("参数 hilo 必须是 '<', '>', '<=', 或 '>='");
  }
  
  if (!satisfiesVersion(version, range)) {
    // 不满足范围，但需要确定是高了还是低了
    const parsed = parseVersionRange(range);
    
    switch (parsed.type) {
      case 'exact':
        return COMPARATORS[hilo](compareVersions(version, parsed.version), 0);
      
      case 'range':
        if (lt(version, parsed.min)) return hilo.includes('<');
        if (gt(version, parsed.max)) return hilo.includes('>');
        return false;
      
      case 'compatible':
      case 'patch': {
        const min = parsed.version;
        let max;
        
        if (parsed.type === 'compatible') {
          const parsedMin = cachedParse(min);
          if (parsedMin.major === 0) {
            if (parsedMin.minor === 0) {
              max = `0.0.${parsedMin.patch + 1}`;
            } else {
              max = `0.${parsedMin.minor + 1}.0`;
            }
          } else {
            max = `${parsedMin.major + 1}.0.0`;
          }
        } else {
          const parsedMin = cachedParse(min);
          max = `${parsedMin.major}.${parsedMin.minor + 1}.0`;
        }
        
        if (lt(version, min)) return hilo.includes('<');
        if (gte(version, max)) return hilo.includes('>');
        return false;
      }
      
      case 'comparator':
        // 这需要更复杂的计算，暂时返回true
        return true;
      
      default:
        return true;
    }
  }
  
  return false;
}

/**
 * 将版本字符串格式化为标准格式
 * @param {string} version 版本字符串
 * @returns {string|null} 标准化的版本，无效则返回null
 */
export function format(version) {
  const parsed = cachedParse(version);
  if (!parsed) return null;
  
  let result = `${parsed.major}.${parsed.minor}.${parsed.patch}`;
  
  if (parsed.prerelease.length > 0) {
    result += `-${parsed.prerelease.join('.')}`;
  }
  
  if (parsed.buildmetadata.length > 0) {
    result += `+${parsed.buildmetadata.join('.')}`;
  }
  
  return result;
}

/**
 * 将版本数组去重并合并
 * @param {string[]|string} versions 版本数组或单个版本
 * @returns {string[]} 合并后的数组
 */
export function coerce(versions) {
  // 处理单个版本的情况
  if (typeof versions === 'string') {
    const cleaned = clean(versions);
    return cleaned ? [cleaned] : [];
  }
  
  if (!Array.isArray(versions)) {
    return [];
  }
  
  const result = new Map();
  
  for (const v of versions) {
    const cleaned = clean(v);
    if (cleaned) {
      const parsedVersion = cachedParse(cleaned);
      if (parsedVersion) {
        const key = `${parsedVersion.major}.${parsedVersion.minor}`;
        
        if (!result.has(key) || gt(cleaned, result.get(key))) {
          result.set(key, cleaned);
        }
      }
    }
  }
  
  return Array.from(result.values());
}

/**
 * 判断版本是否为稳定版本(没有预发布标识符)
 * @param {string} version 版本字符串
 * @returns {boolean} 是否为稳定版本
 */
export function isStable(version) {
  return isValid(version) && !prerelease(version);
}

/**
 * 获取符合范围的最大版本
 * @param {string[]} versions 版本数组
 * @param {string} range 版本范围
 * @returns {string|null} 最大的满足版本
 */
export function maxSatisfying(versions, range) {
  return versions
    .filter(v => satisfiesVersion(v, range))
    .sort((a, b) => compareVersions(b, a))[0] || null;
}

/**
 * 获取符合范围的最小版本
 * @param {string[]} versions 版本数组
 * @param {string} range 版本范围
 * @returns {string|null} 最小的满足版本
 */
export function minSatisfying(versions, range) {
  return versions
    .filter(v => satisfiesVersion(v, range))
    .sort((a, b) => compareVersions(a, b))[0] || null;
}

/**
 * 创建版本范围对象
 * @param {string} operator 操作符（如 >, <, >=, <=, =, ^, ~）
 * @param {string} version 版本字符串
 * @returns {Object|null} 范围对象
 */
export function createRange(operator, version) {
  const cleanedVersion = clean(version);
  if (!cleanedVersion) return null;
  
  // 验证操作符
  if (!['^', '~', '>', '<', '>=', '<=', '='].includes(operator)) {
    return null;
  }
  
  return operator + cleanedVersion;
}

/**
 * 验证版本集合
 * @param {string[]} versions 版本数组
 * @returns {string[]} 有效的版本数组
 */
export function validVersions(versions) {
  return versions.filter(v => isValid(v));
}

/**
 * 获取版本集合中满足条件的版本
 * @param {string[]} versions 版本数组
 * @param {string|Function} condition 范围条件或自定义过滤函数
 * @returns {string[]} 满足条件的版本数组
 */
export function filterVersions(versions, condition) {
  if (typeof condition === 'function') {
    return versions.filter(condition);
  }
  return versions.filter(v => satisfiesVersion(v, condition));
}

/**
 * 获取两个版本集合的交集
 * @param {string[]} set1 第一个版本集合
 * @param {string[]} set2 第二个版本集合
 * @returns {string[]} 交集
 */
export function intersect(set1, set2) {
  return set1.filter(v => set2.includes(v));
}

/**
 * 获取两个版本集合的差集
 * @param {string[]} set1 第一个版本集合
 * @param {string[]} set2 第二个版本集合
 * @returns {string[]} 差集 (set1 - set2)
 */
export function difference(set1, set2) {
  return set1.filter(v => !set2.includes(v));
}

/**
 * 获取两个版本集合的并集
 * @param {string[]} set1 第一个版本集合
 * @param {string[]} set2 第二个版本集合
 * @returns {string[]} 并集
 */
export function union(set1, set2) {
  return [...new Set([...set1, ...set2])];
}

/**
 * 查找给定版本可能的下一个版本
 * @param {string} version 当前版本
 * @param {string} [type='patch'] 版本递增类型
 * @returns {Object} 可能的下一个版本对象
 */
export function nextVersions(version, type = 'patch') {
  if (!isValid(version)) return {};
  
  return {
    major: inc(version, 'major'),
    minor: inc(version, 'minor'),
    patch: inc(version, 'patch'),
    premajor: inc(version, 'premajor'),
    preminor: inc(version, 'preminor'),
    prepatch: inc(version, 'prepatch'),
    prerelease: inc(version, 'prerelease'),
    recommended: inc(version, type || 'patch')
  };
}

/**
 * 解析版本别名
 * @param {Object} aliases 别名映射对象
 * @param {string} name 别名
 * @returns {string|null} 解析后的版本
 */
export function resolveAlias(aliases, name) {
  if (!aliases || typeof aliases !== 'object') return null;
  
  let result = aliases[name];
  let visited = new Set([name]);
  
  // 处理嵌套别名链
  while (typeof result === 'string' && aliases[result] && !visited.has(result)) {
    visited.add(result);
    result = aliases[result];
  }
  
  return isValid(result) ? result : null;
}

/**
 * 生成版本序列
 * @param {string} start 起始版本
 * @param {string} end 结束版本
 * @param {string} [increment='patch'] 递增类型
 * @returns {string[]} 版本序列
 */
export function generateVersionRange(start, end, increment = 'patch') {
  if (!isValid(start) || !isValid(end) || lt(end, start)) {
    return [];
  }
  
  const result = [start];
  let current = start;
  
  while (lt(current, end)) {
    const next = inc(current, increment);
    if (!next || eq(next, current)) break;
    
    current = next;
    if (lte(current, end)) {
      result.push(current);
    }
  }
  
  return result;
}

/**
 * 解析较复杂的版本范围语法
 * @param {string} rangeStr 版本范围字符串
 * @returns {Function} 匹配函数
 */
export function parseComplexRange(rangeStr) {
  if (!rangeStr || typeof rangeStr !== 'string') {
    return () => false;
  }
  
  // 处理OR逻辑 (使用||分割)
  if (rangeStr.includes('||')) {
    const subRanges = rangeStr.split('||').map(r => r.trim());
    const matchers = subRanges.map(parseComplexRange);
    
    return (version) => matchers.some(matcher => matcher(version));
  }
  
  // 普通范围
  return (version) => satisfiesVersion(version, rangeStr);
}

/**
 * 获取最接近但小于指定版本的版本
 * @param {string[]} versions 版本数组
 * @param {string} version 参考版本
 * @returns {string|null} 找到的版本
 */
export function maxLessThan(versions, version) {
  return versions
    .filter(v => lt(v, version))
    .sort((a, b) => compareVersions(b, a))[0] || null;
}

/**
 * 获取最接近但大于指定版本的版本
 * @param {string[]} versions 版本数组
 * @param {string} version 参考版本
 * @returns {string|null} 找到的版本
 */
export function minGreaterThan(versions, version) {
  return versions
    .filter(v => gt(v, version))
    .sort((a, b) => compareVersions(a, b))[0] || null;
}

/**
 * 验证版本是否包含预发布标签的特定类型
 * @param {string} version 版本字符串
 * @param {string|RegExp} identifier 预发布标识符
 * @returns {boolean} 是否包含
 */
export function hasPreRelease(version, identifier) {
  const pre = prerelease(version);
  if (!pre) return false;
  
  if (identifier instanceof RegExp) {
    return pre.some(p => identifier.test(String(p)));
  }
  
  return pre.includes(identifier);
}

/**
 * 检查一组版本号是否包含断点
 * @param {string[]} versions 版本数组
 * @param {string} [type='minor'] 检查级别
 * @returns {Object} 断点信息
 */
export function findVersionGaps(versions, type = 'minor') {
  if (!Array.isArray(versions) || versions.length < 2) {
    return { hasGaps: false, gaps: [] };
  }
  
  const sorted = sort(validVersions(versions));
  const gaps = [];
  
  for (let i = 1; i < sorted.length; i++) {
    const current = cachedParse(sorted[i]);
    const previous = cachedParse(sorted[i-1]);
    
    if (!current || !previous) continue;
    
    let hasGap = false;
    
    if (type === 'major' && current.major - previous.major > 1) {
      hasGap = true;
    } else if (type === 'minor' && 
               current.major === previous.major && 
               current.minor - previous.minor > 1) {
      hasGap = true;
    } else if (type === 'patch' && 
               current.major === previous.major && 
               current.minor === previous.minor && 
               current.patch - previous.patch > 1) {
      hasGap = true;
    }
    
    if (hasGap) {
      gaps.push({
        before: sorted[i-1],
        after: sorted[i],
        diffType: diff(sorted[i-1], sorted[i])
      });
    }
  }
  
  return {
    hasGaps: gaps.length > 0,
    gaps
  };
}

/**
 * 将范围表达式转换为人类可读的文字说明
 * @param {string} range 范围表达式
 * @returns {string} 可读解释
 */
export function explainRange(range) {
  const parsed = parseVersionRange(range);
  
  switch (parsed.type) {
    case 'invalid':
      return `无效的版本范围表达式: ${range}`;
    
    case 'exact':
      return `精确匹配版本 ${parsed.version}`;
    
    case 'any':
      return `匹配任意版本`;
    
    case 'compatible': {
      const v = cachedParse(parsed.version);
      if (v.major === 0) {
        if (v.minor === 0) {
          return `仅匹配精确版本 ${v.version}`;
        }
        return `匹配补丁版本更新，版本须在 ${v.version} 和 0.${v.minor+1}.0 之间（不含上限）`;
      }
      return `匹配次版本和补丁版本更新，版本须在 ${v.version} 和 ${v.major+1}.0.0 之间（不含上限）`;
    }
    
    case 'patch': {
      const v = cachedParse(parsed.version);
      return `匹配补丁版本更新，版本须在 ${v.version} 和 ${v.major}.${v.minor+1}.0 之间（不含上限）`;
    }
    
    case 'range':
      return `匹配版本范围：从 ${parsed.min} 到 ${parsed.max}（含边界）`;
    
    case 'comparator':
      return `匹配满足以下条件的版本：${parsed.comparators.map(c => 
        `${c.operator} ${c.version}`).join('且 ')}`;
    
    default:
      return `未知范围类型`;
  }
}

/**
 * 检查两个版本范围是否有交集
 * @param {string} range1 第一个范围
 * @param {string} range2 第二个范围
 * @returns {boolean} 是否有交集
 */
export function rangesOverlap(range1, range2) {
  // 实现策略：生成测试版本并检查是否两边都能满足
  const r1 = parseVersionRange(range1);
  const r2 = parseVersionRange(range2);
  
  if (r1.type === 'invalid' || r2.type === 'invalid') {
    return false;
  }
  
  // 简单情况：任一方匹配任意版本
  if (r1.type === 'any' || r2.type === 'any') {
    return true;
  }
  
  // 测试一些具体版本
  const testVersions = [];
  
  // 从两个范围收集关键版本点
  if (r1.type === 'exact') testVersions.push(r1.version);
  if (r2.type === 'exact') testVersions.push(r2.version);
  
  if (r1.type === 'range') {
    testVersions.push(r1.min, r1.max);
  }
  
  if (r2.type === 'range') {
    testVersions.push(r2.min, r2.max);
  }
  
  if (r1.type === 'compatible' || r1.type === 'patch') {
    testVersions.push(r1.version);
  }
  
  if (r2.type === 'compatible' || r2.type === 'patch') {
    testVersions.push(r2.version);
  }
  
  // 检查是否有任何版本同时满足两个范围
  return testVersions.some(v => 
    satisfiesVersion(v, range1) && satisfiesVersion(v, range2)
  );
}

/**
 * 计算版本跨度信息
 * @param {string[]} versions 版本数组
 * @returns {Object} 跨度信息
 */
export function calculateVersionSpread(versions) {
  const valid = validVersions(versions);
  if (valid.length === 0) return { empty: true };
  
  const sorted = sort(valid);
  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];
  
  return {
    empty: false,
    count: valid.length,
    oldest,
    newest,
    majorVersions: [...new Set(valid.map(v => major(v)))].sort((a, b) => a - b),
    span: diff(oldest, newest),
    duration: {
      major: major(newest) - major(oldest),
      minor: minor(newest) - minor(oldest),
      patch: patch(newest) - patch(oldest)
    }
  };
}

/**
 * 解析版本号中的构建元数据
 * @param {string} version 版本字符串
 * @returns {Array|null} 构建元数据数组
 */
export function buildMetadata(version) {
  const parsed = cachedParse(version);
  return parsed && parsed.buildmetadata.length > 0 ? parsed.buildmetadata : null;
}

/**
 * 清理解析缓存
 * @param {boolean} [partial=false] 是否只清理部分缓存
 */
export function clearParseCache(partial = false) {
  // 从配置中读取最新的缓存大小
  MAX_CACHE_SIZE = CONFIG.cacheSize;
  parseCache.capacity = MAX_CACHE_SIZE;
  
  if (partial) {
    // LRU缓存已自带自动清理功能，这里可以手动触发一次
    if (parseCache.size > MAX_CACHE_SIZE * 0.8) {
      const entriesToRemove = Math.floor(parseCache.size * 0.2);
      for (let i = 0; i < entriesToRemove; i++) {
        parseCache.evict();
      }
    }
  } else {
    parseCache.clear();
  }
}

/**
 * 判断版本是否遵循严格的语义化版本规范
 * 与isValid不同，此函数检查是否完全符合semver规范的所有细节
 * @param {string} version 版本字符串
 * @returns {boolean} 是否完全符合规范
 */
export function isStrictlySemver(version) {
  if (typeof version !== 'string') return false;
  return SEMVER_REGEX.test(version);
}

/**
 * 扩展版本解析，支持更多格式和未来可能的扩展
 * @param {string} version 版本字符串
 * @param {Object} options 解析选项
 * @returns {Object|null} 解析结果
 */
export function extendedParse(version, options = {}) {
  const opts = { allowLoose: false, ...options };
  
  // 标准解析
  let result = parse(version);
  if (result) return result;
  
  // 宽松模式解析
  if (opts.allowLoose) {
    const cleaned = clean(version);
    if (cleaned) return parse(cleaned);
  }
  
  // 尝试处理特殊格式
  if (typeof version === 'string') {
    // 处理日期版本格式 (YYYY.MM.DD)
    const dateMatch = /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/.exec(version);
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      return {
        format: 'date',
        major: parseInt(year, 10),
        minor: parseInt(month, 10),
        patch: parseInt(day, 10),
        version,
        raw: version
      };
    }
    
    // 其他可能的格式...
  }
  
  return null;
}

/**
 * 处理国际化版本比较
 * 在某些语言环境中，预发布标签可能需要特殊的排序规则
 * @param {string} v1 第一个版本
 * @param {string} v2 第二个版本
 * @param {string} locale 地区设置 (如 'en-US', 'zh-CN')
 * @returns {number} 比较结果
 */
export function compareVersionsLocalized(v1, v2, locale) {
  const baseCompare = compareVersions(v1, v2);
  if (baseCompare !== 0) return baseCompare;
  
  // 版本号主体相同，需要比较预发布标签
  const pre1 = prerelease(v1);
  const pre2 = prerelease(v2);
  
  if (!pre1 && !pre2) return 0;
  if (!pre1) return 1;
  if (!pre2) return -1;
  
  // 只对字符串类型的预发布标签应用本地化比较
  try {
    const stringIdentifiers1 = pre1.filter(p => typeof p === 'string');
    const stringIdentifiers2 = pre2.filter(p => typeof p === 'string');
    
    if (stringIdentifiers1.length > 0 && stringIdentifiers2.length > 0) {
      const allStrings = [...new Set([...stringIdentifiers1, ...stringIdentifiers2])];
      allStrings.sort((a, b) => String(a).localeCompare(String(b), locale));
      
      // 根据排序后的位置比较
      const getLowestIndex = (arr) => {
        return Math.min(...arr.map(item => 
          allStrings.findIndex(s => s === item)
        ).filter(idx => idx >= 0));
      };
      
      const idx1 = getLowestIndex(stringIdentifiers1);
      const idx2 = getLowestIndex(stringIdentifiers2);
      
      if (idx1 !== idx2) {
        return idx1 < idx2 ? -1 : 1;
      }
    }
  } catch (e) {
    // 降级到标准比较
    console.warn("本地化比较失败，使用标准比较", e);
  }
  
  // 如果本地化比较不适用或相等，回退到标准比较逻辑
  return comparePrerelease(pre1, pre2);
}

/**
 * 智能版本聚合 - 分析版本模式并生成最合适的版本范围表达式
 * @param {string[]} versions 版本数组
 * @returns {string} 最佳匹配的范围表达式
 */
export function smartVersionRange(versions) {
  if (!versions || !versions.length) return '*';
  
  const valid = validVersions(versions);
  if (valid.length === 0) return '*';
  if (valid.length === 1) return valid[0];
  
  const sorted = sort(valid);
  const newest = sorted[sorted.length - 1];
  const parsedNewest = cachedParse(newest);
  
  // 分析版本模式
  const allSameMajor = sorted.every(v => major(v) === parsedNewest.major);
  const allSameMinor = allSameMajor && sorted.every(v => minor(v) === parsedNewest.minor);
  
  // 常见模式检测
  if (allSameMinor) {
    // 所有版本都在同一个次版本线上，使用波浪号范围
    return `~${parsedNewest.major}.${parsedNewest.minor}.0`;
  } else if (allSameMajor) {
    // 所有版本在同一个主版本线上，使用插入符范围
    return `^${newest}`;
  } else {
    // 版本跨度大，找到一个合理的最低版本
    const oldestReasonable = sorted.find(v => major(v) > 0) || sorted[0];
    return `>=${oldestReasonable} <=${newest}`;
  }
}

/**
 * 版本模式分析 - 检测版本数组中的模式和发布周期
 * @param {string[]} versions 版本数组，最好是按时间排序的
 * @returns {Object} 版本模式分析结果
 */
export function analyzeVersionPattern(versions) {
  const valid = validVersions(versions);
  if (valid.length < 3) return { pattern: 'insufficient-data' };
  
  const sorted = sort(valid);
  
  // 检测版本号增长模式
  const majorJumps = [];
  const minorJumps = [];
  const patchJumps = [];
  
  for (let i = 1; i < sorted.length; i++) {
    const current = cachedParse(sorted[i]);
    const previous = cachedParse(sorted[i-1]);
    
    const majorDiff = current.major - previous.major;
    const minorDiff = current.minor - previous.minor;
    const patchDiff = current.patch - previous.patch;
    
    if (majorDiff > 0) majorJumps.push({ from: sorted[i-1], to: sorted[i], diff: majorDiff });
    if (majorDiff === 0 && minorDiff > 0) minorJumps.push({ from: sorted[i-1], to: sorted[i], diff: minorDiff });
    if (majorDiff === 0 && minorDiff === 0 && patchDiff > 0) patchJumps.push({ from: sorted[i-1], to: sorted[i], diff: patchDiff });
  }
  
  // 分析预发布版本模式
  const prereleaseVersions = sorted.filter(v => prerelease(v));
  const prereleasePatterns = {};
  
  prereleaseVersions.forEach(v => {
    const pre = prerelease(v);
    if (pre && pre.length > 0) {
      const firstTag = pre[0];
      prereleasePatterns[firstTag] = (prereleasePatterns[firstTag] || 0) + 1;
    }
  });
  
  return {
    pattern: majorJumps.length > minorJumps.length ? 'major-driven' : 
             minorJumps.length > patchJumps.length ? 'feature-driven' : 'maintenance-driven',
    versionCount: sorted.length,
    majorJumps: majorJumps.length,
    minorJumps: minorJumps.length,
    patchJumps: patchJumps.length,
    averageMajorJump: majorJumps.length ? majorJumps.reduce((sum, j) => sum + j.diff, 0) / majorJumps.length : 0,
    averageMinorJump: minorJumps.length ? minorJumps.reduce((sum, j) => sum + j.diff, 0) / minorJumps.length : 0,
    averagePatchJump: patchJumps.length ? patchJumps.reduce((sum, j) => sum + j.diff, 0) / patchJumps.length : 0,
    prereleaseUsage: prereleaseVersions.length / sorted.length,
    commonPrereleaseTags: Object.entries(prereleasePatterns)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }))
  };
}

/**
 * 获取缓存性能统计 - 改进版
 * @returns {Object} 缓存统计信息
 */
export function getCacheStats() {
  const hitRate = cacheStats.hits + cacheStats.misses > 0 ? 
    cacheStats.hits / (cacheStats.hits + cacheStats.misses) : 0;
  
  // 使用LRU缓存内置的统计方法
  const cacheMetrics = parseCache.getStats();
  
  return {
    size: cacheMetrics.size,
    maxSize: MAX_CACHE_SIZE,
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    hitRate: hitRate,
    topFrequent: cacheMetrics.topFrequent
  };
}

/**
 * 批量版本操作 - 对多个版本执行同一操作
 * @param {string[]} versions 版本数组
 * @param {string} operation 操作类型(inc, major, minor, patch等)
 * @param {...any} args 操作参数
 * @returns {string[]} 操作结果数组
 */
export function batchProcess(versions, operation, ...args) {
  // 获取导出的函数，而不是使用this
  const exports = {
    parse, clean, inc, major, minor, patch, prerelease,
    isValid, format, diff, compareVersions, satisfiesVersion
    // 添加其他可能需要的导出函数
  };
  
  if (!Array.isArray(versions) || !operation || typeof exports[operation] !== 'function') {
    return [];
  }
  
  const operationFn = exports[operation];
  return versions.map(version => {
    try {
      return operationFn(version, ...args);
    } catch (e) {
      console.error(`处理版本${version}时出错:`, e);
      return null;
    }
  }).filter(Boolean);
}

/**
 * 版本向下兼容性评估
 * @param {string} currentVersion 当前版本
 * @param {string} targetVersion 目标版本
 * @returns {Object} 兼容性评估结果
 */
export function compatibilityAssessment(currentVersion, targetVersion) {
  if (!isValid(currentVersion) || !isValid(targetVersion)) {
    return { compatible: false, reason: "无效版本" };
  }
  
  const current = cachedParse(currentVersion);
  const target = cachedParse(targetVersion);
  
  // 如果是降级（目标版本低于当前版本）
  if (lt(targetVersion, currentVersion)) {
    // 主版本相同，可能兼容
    if (current.major === target.major) {
      return {
        compatible: true,
        direction: "downgrade",
        risk: "low",
        changes: diff(targetVersion, currentVersion)
      };
    } else {
      return {
        compatible: false,
        direction: "downgrade",
        risk: "high",
        reason: "主版本不同，可能不兼容",
        changes: diff(targetVersion, currentVersion)
      };
    }
  }
  
  // 如果是升级（目标版本高于当前版本）
  if (gt(targetVersion, currentVersion)) {
    // 如果主版本号变更，根据semver规范，可能不向后兼容
    if (target.major > current.major) {
      return {
        compatible: false,
        direction: "upgrade",
        risk: "high",
        reason: "主版本号增加，表示有破坏性变更",
        changes: diff(currentVersion, targetVersion)
      };
    }
    
    // 次版本号变更，应该是向后兼容的功能变更
    if (target.minor > current.minor) {
      return {
        compatible: true,
        direction: "upgrade",
        risk: "medium",
        changes: diff(currentVersion, targetVersion)
      };
    }
    
    // 修订号变更，应该只是问题修复
    return {
      compatible: true,
      direction: "upgrade",
      risk: "low",
      changes: diff(currentVersion, targetVersion)
    };
  }
  
  // 版本相同
  return {
    compatible: true,
    direction: "same",
    risk: "none",
    changes: null
  };
}

/**
 * 版本升级路径规划
 * 计算从当前版本到目标版本的最佳升级路径
 * @param {string} currentVersion 当前版本
 * @param {string} targetVersion 目标版本
 * @param {string[]} availableVersions 可用的中间版本
 * @returns {string[]} 推荐的升级路径
 */
export function upgradePath(currentVersion, targetVersion, availableVersions = []) {
  if (!isValid(currentVersion) || !isValid(targetVersion)) {
    return [];
  }
  
  // 如果目标版本低于当前版本，则为降级
  if (lt(targetVersion, currentVersion)) {
    return [currentVersion, targetVersion];
  }
  
  // 如果版本相同，无需升级
  if (eq(currentVersion, targetVersion)) {
    return [currentVersion];
  }
  
  // 过滤出当前版本和目标版本之间的版本
  const inBetweenVersions = availableVersions.filter(v => 
    isValid(v) && gt(v, currentVersion) && lt(v, targetVersion)
  );
  
  if (inBetweenVersions.length === 0) {
    // 无中间版本，直接升级
    return [currentVersion, targetVersion];
  }
  
  // 按版本排序
  const sortedVersions = sort(inBetweenVersions);
  
  // 智能路径规划：优先选择主要里程碑版本
  const path = [currentVersion];
  
  const currentParsed = cachedParse(currentVersion);
  const targetParsed = cachedParse(targetVersion);
  
  // 如果跨主版本，查找每个主版本的最后一个版本作为跳转点
  if (targetParsed.major > currentParsed.major) {
    for (let majorVersion = currentParsed.major + 1; majorVersion < targetParsed.major; majorVersion++) {
      // 查找此主版本的最高版本
      const majorVersions = sortedVersions.filter(v => major(v) === majorVersion);
      if (majorVersions.length > 0) {
        // 添加这个主版本的最高版本到路径
        path.push(majorVersions[majorVersions.length - 1]);
      }
    }
  } else if (targetParsed.minor > currentParsed.minor) {
    // 如果只跨次版本，可以考虑选择关键的次版本作为跳转点
    // 例如每隔几个次版本选择一个
    const minorJumps = Math.ceil((targetParsed.minor - currentParsed.minor) / 3);
    for (let i = 1; i <= minorJumps; i++) {
      const targetMinor = currentParsed.minor + Math.floor(i * (targetParsed.minor - currentParsed.minor) / (minorJumps + 1));
      const minorVersions = sortedVersions.filter(v => 
        major(v) === currentParsed.major && minor(v) === targetMinor
      );
      if (minorVersions.length > 0) {
        path.push(minorVersions[minorVersions.length - 1]);
      }
    }
  }
  
  // 添加目标版本
  if (path[path.length - 1] !== targetVersion) {
    path.push(targetVersion);
  }
  
  return path;
}

/**
 * 以语义化版本的结构解析非标准版本格式
 * @param {string} version 非标准版本字符串
 * @returns {Object|null} 尽可能解析的结果
 */
export function parseNonStandard(version) {
  if (typeof version !== 'string') return null;
  
  // 尝试解析带有其他分隔符的版本号
  const numberPattern = /[\._\-]?(\d+)[\._\-]?(\d+)[\._\-]?(\d+)|(\d{1,2})[\._\-]?(\d{1,2})[\._\-]?(\d{2,4})/;
  const match = numberPattern.exec(version);
  
  if (match) {
    const nums = match.slice(1).filter(Boolean);
    if (nums.length >= 3) {
      const [a, b, c] = nums.map(n => parseInt(n, 10));
      
      // 检查日期格式可能性
      const isDateFormat = (a <= 31 && b <= 12) || (b <= 31 && a <= 12);
      
      if (isDateFormat && (c >= 2000 || c < 100)) {
        // 可能是日期格式 (DD.MM.YYYY 或 MM.DD.YYYY 或 YY 或这些的变种)
        const year = c < 100 ? (c < 50 ? 2000 + c : 1900 + c) : c;
        const isProbablyYear = (n) => n >= 1990 && n <= 2100;
        
        if (isProbablyYear(a)) {
          return {
            format: 'date-ymd',
            major: a,
            minor: b,
            patch: c,
            original: version
          };
        } else if (isProbablyYear(c)) {
          return {
            format: 'date-mdy',
            major: c,
            minor: a <= 12 ? a : b,
            patch: b <= 31 ? b : a,
            original: version
          };
        }
      }
      
      // 默认作为普通三段式版本号处理
      return {
        format: 'triplet',
        major: a,
        minor: b,
        patch: c,
        original: version
      };
    }
  }
  
  // 尝试解析单一数字的版本号(如构建号)
  const buildNumberMatch = /[^\d]?(\d+)[^\d]?/.exec(version);
  if (buildNumberMatch) {
    const buildNumber = parseInt(buildNumberMatch[1], 10);
    return {
      format: 'build-number',
      major: 0,
      minor: 0,
      patch: buildNumber,
      original: version
    };
  }
  
  return null;
}

/**
 * 将任意版本格式转换为标准SemVer格式
 * @param {string} version 任意版本字符串
 * @returns {string|null} 标准化的版本
 */
export function standardize(version) {
  // 首先尝试标准清理
  const cleaned = clean(version);
  if (cleaned) return cleaned;
  
  // 尝试解析非标准格式
  const parsed = parseNonStandard(version);
  if (parsed) {
    return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
  }
  
  return null;
}

/**
 * 健康检查 - 验证库是否正常工作
 * @returns {Object} 健康检查结果
 */
export function healthCheck() {
  const testCases = [
    { test: 'parseValid', fn: () => parse('1.2.3'), expectSuccess: true },
    { test: 'parseInvalid', fn: () => parse('invalid'), expectSuccess: false },
    { test: 'compareEqual', fn: () => eq('1.2.3', '1.2.3'), expect: true },
    { test: 'compareGreater', fn: () => gt('2.0.0', '1.9.9'), expect: true },
    { test: 'compareLess', fn: () => lt('1.0.0', '1.0.1'), expect: true },
    { test: 'satisfies', fn: () => satisfiesVersion('1.2.3', '^1.0.0'), expect: true },
    { test: 'increment', fn: () => inc('1.2.3', 'minor'), expect: '1.3.0' }
  ];
  
  const results = testCases.map(tc => {
    try {
      const result = tc.fn();
      const success = tc.expectSuccess !== undefined 
        ? (result !== null) === tc.expectSuccess
        : result === tc.expect;
      
      return {
        test: tc.test,
        success,
        expected: tc.expect !== undefined ? tc.expect : (tc.expectSuccess ? 'non-null' : 'null'),
        actual: result
      };
    } catch (e) {
      return {
        test: tc.test,
        success: false,
        error: e.message
      };
    }
  });
  
  return {
    timestamp: new Date().toISOString(),
    allPassed: results.every(r => r.success),
    tests: results,
    cacheStats: getCacheStats()
  };
}

/**
 * 版本号迁移助手 - 安全版本
 * 处理从非语义化版本到语义化版本的转换
 * @param {string} legacyVersion 旧版本格式
 * @param {Object} mappingRules 映射规则
 * @returns {string|null} 语义化版本
 */
export function migrateLegacyVersion(legacyVersion, mappingRules = {}) {
  // 输入长度限制，防止DoS攻击
  if (typeof legacyVersion !== 'string' || legacyVersion.length > 256) {
    return null;
  }
  
  // 首先尝试标准解析
  if (isValid(legacyVersion)) return legacyVersion;
  
  // 检查是否有直接映射
  if (mappingRules[legacyVersion]) {
    return mappingRules[legacyVersion];
  }
  
  // 安全处理正则表达式映射
  const safeRegexPatterns = new Map();
  for (const [pattern, replacement] of Object.entries(mappingRules)) {
    if (pattern.startsWith('/') && pattern.length > 2) {
      // 解析正则表达式和标志
      let regexStr = pattern.slice(1);
      let flags = '';
      
      // 提取标志
      const lastSlashIndex = regexStr.lastIndexOf('/');
      if (lastSlashIndex > 0) {
        flags = regexStr.slice(lastSlashIndex + 1);
        regexStr = regexStr.slice(0, lastSlashIndex);
      }
      
      try {
        // 安全标志检查 - 禁止使用全局匹配避免状态保留
        if (flags.includes('g')) {
          flags = flags.replace('g', '');
        }
        
        // 复杂度检查 - 防止过于复杂的正则表达式
        if (regexStr.length > 100 || 
            (regexStr.match(/[\*\+\{\}]/g) || []).length > 5 ||
            (regexStr.match(/\(/g) || []).length > 3) {
          console.warn(`正则表达式过于复杂，已跳过: ${pattern}`);
          continue;
        }
        
        // 使用安全的方式创建正则表达式
        const regex = new RegExp(regexStr, flags);
        safeRegexPatterns.set(regex, replacement);
      } catch (e) {
        console.error(`无效的正则表达式格式: ${pattern}`, e);
      }
    }
  }
  
  // 使用超时处理模式匹配，防止灾难性回溯
  for (const [regex, replacement] of safeRegexPatterns.entries()) {
    try {
      // 添加正则匹配的超时控制
      const startTime = Date.now();
      const MAX_REGEX_TIME = 50; // 毫秒
      
      if (regex.test(legacyVersion)) {
        // 检查正则执行时间
        if (Date.now() - startTime > MAX_REGEX_TIME) {
          console.warn(`正则表达式执行时间过长: ${regex}`);
          continue;
        }
        
        // 安全替换 - 限制替换次数为1
        return legacyVersion.replace(regex, replacement);
      }
      
      // 再次检查时间，防止测试阶段就超时的复杂正则
      if (Date.now() - startTime > MAX_REGEX_TIME) {
        console.warn(`正则表达式执行时间过长: ${regex}`);
      }
    } catch (e) {
      console.error(`正则表达式执行错误: ${regex}`, e);
    }
  }
  
  // 尝试智能猜测
  return standardize(legacyVersion);
}

/**
 * 安全版本增量 - 在修改版本号时自动处理极限情况
 * @param {string} version 当前版本
 * @param {string} type 增量类型
 * @param {Object} options 选项
 * @returns {string} 安全增量后的版本
 */
export function safeInc(version, type = 'patch', options = {}) {
  const opts = {
    maxMajor: Number.MAX_SAFE_INTEGER,
    maxMinor: Number.MAX_SAFE_INTEGER,
    maxPatch: Number.MAX_SAFE_INTEGER,
    ...options
  };
  
  // 标准inc逻辑
  const newVersion = inc(version, type);
  if (!newVersion) return version;
  
  const parsed = cachedParse(newVersion);
  if (!parsed) return version;
  
  // 检查是否超过最大限制
  let { major, minor, patch } = parsed;
  
  if (major > opts.maxMajor) {
    major = opts.maxMajor;
    minor = 0;
    patch = 0;
  } else if (minor > opts.maxMinor) {
    minor = opts.maxMinor;
    patch = 0;
  } else if (patch > opts.maxPatch) {
    patch = opts.maxPatch;
  }
  
  // 重建版本号
  return `${major}.${minor}.${patch}`;
}

/**
 * 错误处理包装 - 为所有函数提供安全执行环境
 * @param {Function} fn 要包装的函数
 * @returns {Function} 包装后的安全函数
 */
function createSafeFunction(fn, defaultValue = null) {
  return function(...args) {
    try {
      return fn.apply(this, args);
    } catch (e) {
      console.error(`执行${fn.name || '函数'}时发生错误:`, e);
      return defaultValue;
    }
  };
}

// 导出安全版本的关键函数
export const safeParse = createSafeFunction(parse);
export const safeCompare = createSafeFunction(compareVersions, 0);
export const safeSatisfies = createSafeFunction(satisfiesVersion, false);

/**
 * 版本翻译 - 将技术版本号映射为用户友好的名称
 * @param {string} version 版本字符串
 * @param {Object} namingScheme 命名方案
 * @returns {string} 用户友好的版本名称
 */
export function translateVersion(version, namingScheme = {}) {
  if (!isValid(version)) return version;
  
  // 检查精确匹配
  if (namingScheme[version]) return namingScheme[version];
  
  const parsed = cachedParse(version);
  
  // 检查主版本匹配
  const majorKey = `${parsed.major}.x.x`;
  if (namingScheme[majorKey]) {
    return namingScheme[majorKey].replace('{minor}', parsed.minor).replace('{patch}', parsed.patch);
  }
  
  // 检查次版本匹配
  const minorKey = `${parsed.major}.${parsed.minor}.x`;
  if (namingScheme[minorKey]) {
    return namingScheme[minorKey].replace('{patch}', parsed.patch);
  }
  
  // 默认格式化
  return version;
}

