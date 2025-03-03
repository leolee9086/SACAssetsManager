<template>
  <div class="semver-tester">
    <h1>语义化版本测试工具</h1>
    
    <!-- 基本功能选项卡 -->
    <div class="tabs">
      <div 
        v-for="tab in tabs" 
        :key="tab.id" 
        :class="['tab', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </div>
    </div>
    
    <!-- 版本比较 -->
    <div v-if="activeTab === 'compare'" class="tab-content">
      <h2>版本比较</h2>
      <div class="input-group">
        <div class="version-inputs">
          <div class="input-row">
            <label>版本 A:</label>
            <input v-model="compareVersions.versionA" placeholder="例如: 1.2.3" />
            <span :class="['validity', { valid: isValid(compareVersions.versionA) }]">
              {{ isValid(compareVersions.versionA) ? '有效' : '无效' }}
            </span>
          </div>
          <div class="input-row">
            <label>版本 B:</label>
            <input v-model="compareVersions.versionB" placeholder="例如: 2.0.0-beta.1" />
            <span :class="['validity', { valid: isValid(compareVersions.versionB) }]">
              {{ isValid(compareVersions.versionB) ? '有效' : '无效' }}
            </span>
          </div>
        </div>
        <div class="actions">
          <button @click="performCompare" :disabled="!canCompare">比较</button>
        </div>
      </div>
      
      <div v-if="compareResult" class="result-box">
        <div class="result-row">
          <strong>比较结果:</strong> 
          <span class="result">{{ compareResultText }}</span>
        </div>
        <div class="result-row">
          <strong>差异类型:</strong> 
          <span class="diff">{{ diffType }}</span>
        </div>
      </div>
    </div>
    
    <!-- 版本范围 -->
    <div v-if="activeTab === 'range'" class="tab-content">
      <h2>版本范围测试</h2>
      <div class="input-group">
        <div class="input-row">
          <label>版本:</label>
          <input v-model="rangeTest.version" placeholder="例如: 1.2.3" />
          <span :class="['validity', { valid: isValid(rangeTest.version) }]">
            {{ isValid(rangeTest.version) ? '有效' : '无效' }}
          </span>
        </div>
        <div class="input-row">
          <label>范围:</label>
          <input v-model="rangeTest.range" placeholder="例如: ^1.0.0 || >2.0.0" />
        </div>
        <div class="actions">
          <button @click="checkRange" :disabled="!canCheckRange">测试</button>
        </div>
      </div>
      
      <div v-if="rangeResult !== null" class="result-box">
        <div class="result-row">
          <strong>满足条件:</strong> 
          <span :class="['result', { success: rangeResult, error: !rangeResult }]">
            {{ rangeResult ? '是' : '否' }}
          </span>
        </div>
        <div class="result-row">
          <strong>范围解释:</strong> 
          <span>{{ rangeExplanation }}</span>
        </div>
      </div>
    </div>
    
    <!-- 版本操作 -->
    <div v-if="activeTab === 'operations'" class="tab-content">
      <h2>版本操作</h2>
      <div class="input-group">
        <div class="input-row">
          <label>基础版本:</label>
          <input v-model="versionOps.baseVersion" placeholder="例如: 1.2.3" />
          <span :class="['validity', { valid: isValid(versionOps.baseVersion) }]">
            {{ isValid(versionOps.baseVersion) ? '有效' : '无效' }}
          </span>
        </div>
        <div class="input-row">
          <label>操作:</label>
          <select v-model="versionOps.operation">
            <option v-for="op in operations" :key="op.value" :value="op.value">
              {{ op.label }}
            </option>
          </select>
        </div>
        <div class="input-row" v-if="versionOps.operation.includes('pre')">
          <label>标识符:</label>
          <input v-model="versionOps.identifier" placeholder="例如: alpha" />
        </div>
        <div class="actions">
          <button @click="performOperation" :disabled="!canPerformOperation">执行</button>
        </div>
      </div>
      
      <div v-if="operationResult" class="result-box">
        <div class="result-row">
          <strong>操作结果:</strong> 
          <span class="result">{{ operationResult }}</span>
        </div>
      </div>
    </div>
    
    <!-- 批量测试 -->
    <div v-if="activeTab === 'batch'" class="tab-content">
      <h2>批量版本测试</h2>
      <div class="input-group">
        <div class="input-row full-width">
          <label>版本列表 (每行一个):</label>
          <textarea v-model="batchProcess.versions" placeholder="1.0.0&#10;2.0.0-beta.1&#10;0.5.2" rows="5"></textarea>
        </div>
        <div class="input-row">
          <label>排序方向:</label>
          <select v-model="batchProcess.ascending">
            <option :value="true">升序</option>
            <option :value="false">降序</option>
          </select>
        </div>
        <div class="actions">
          <button @click="performBatchSort">排序</button>
          <button @click="findGaps">查找断点</button>
          <button @click="analyzePattern">分析模式</button>
        </div>
      </div>
      
      <div v-if="batchResult" class="result-box">
        <h3>{{ batchResultTitle }}</h3>
        <div v-if="batchResultType === 'sort'" class="version-list">
          <div v-for="(version, index) in batchResult" :key="index" class="version-item">
            {{ version }}
          </div>
        </div>
        <div v-if="batchResultType === 'gaps'" class="gap-list">
          <div v-if="batchResult.hasGaps">
            <div v-for="(gap, index) in batchResult.gaps" :key="index" class="gap-item">
              <span>{{ gap.before }}</span> → <span>{{ gap.after }}</span>
              <span class="diff-tag">{{ gap.diffType }}</span>
            </div>
          </div>
          <div v-else>
            没有发现版本断点
          </div>
        </div>
        <div v-if="batchResultType === 'pattern'" class="pattern-analysis">
          <div class="pattern-row">
            <strong>版本模式:</strong> {{ batchResult.pattern }}
          </div>
          <div class="pattern-row">
            <strong>版本数量:</strong> {{ batchResult.versionCount }}
          </div>
          <div class="pattern-row">
            <strong>主版本跳跃:</strong> {{ batchResult.majorJumps }}
          </div>
          <div class="pattern-row">
            <strong>次版本跳跃:</strong> {{ batchResult.minorJumps }}
          </div>
          <div class="pattern-row">
            <strong>修订版本跳跃:</strong> {{ batchResult.patchJumps }}
          </div>
          <div class="pattern-row">
            <strong>预发布版本使用率:</strong> {{ (batchResult.prereleaseUsage * 100).toFixed(1) }}%
          </div>
          <div v-if="batchResult.commonPrereleaseTags && batchResult.commonPrereleaseTags.length > 0">
            <strong>常用预发布标签:</strong>
            <div v-for="(tag, index) in batchResult.commonPrereleaseTags.slice(0, 3)" :key="index">
              {{ tag.tag }}: {{ tag.count }}次
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 随机数据生成 -->
    <div v-if="activeTab === 'generator'" class="tab-content">
      <h2>随机版本生成器</h2>
      <div class="input-group">
        <div class="input-row">
          <label>生成数量:</label>
          <input type="number" v-model.number="generator.count" min="1" max="100" />
        </div>
        <div class="input-row">
          <label>版本类型:</label>
          <select v-model="generator.type">
            <option value="all">所有类型</option>
            <option value="release">正式版本</option>
            <option value="prerelease">预发布版本</option>
            <option value="major">主要版本</option>
            <option value="minor">次要版本</option>
          </select>
        </div>
        <div class="input-row" v-if="generator.type === 'prerelease'">
          <label>预发布标识:</label>
          <select v-model="generator.preId">
            <option value="random">随机</option>
            <option value="alpha">alpha</option>
            <option value="beta">beta</option>
            <option value="rc">rc</option>
          </select>
        </div>
        <div class="input-row">
          <label>版本范围:</label>
          <div class="range-inputs">
            <input type="number" v-model.number="generator.range.min.major" placeholder="主版本" min="0" max="999" />
            <span>.</span>
            <input type="number" v-model.number="generator.range.min.minor" placeholder="次版本" min="0" max="999" />
            <span>.</span>
            <input type="number" v-model.number="generator.range.min.patch" placeholder="修订号" min="0" max="999" />
            <span>至</span>
            <input type="number" v-model.number="generator.range.max.major" placeholder="主版本" min="0" max="999" />
            <span>.</span>
            <input type="number" v-model.number="generator.range.max.minor" placeholder="次版本" min="0" max="999" />
            <span>.</span>
            <input type="number" v-model.number="generator.range.max.patch" placeholder="修订号" min="0" max="999" />
          </div>
        </div>
        <div class="actions">
          <button @click="generateRandomVersions">生成版本</button>
          <button @click="copyGeneratedVersions" :disabled="!generatedVersions.length">复制到剪贴板</button>
        </div>
      </div>
      
      <div v-if="generatedVersions.length" class="result-box">
        <div class="result-header">
          <h3>生成的版本 ({{ generatedVersions.length }}个)</h3>
          <span v-if="copySuccess" class="copy-success">已复制!</span>
        </div>
        <div class="version-grid">
          <div v-for="(version, index) in generatedVersions" :key="index" class="version-item">
            {{ version }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- 版本解析器 -->
    <div v-if="activeTab === 'parser'" class="tab-content">
      <h2>版本解析器</h2>
      <div class="input-group">
        <div class="input-row">
          <label>输入版本:</label>
          <input v-model="parserInput" placeholder="例如: 1.2.3-beta.4+build.567" @input="parseVersion" />
        </div>
      </div>
      
      <div v-if="parserError" class="error-box">
        <div class="error-message">{{ parserError }}</div>
      </div>
      
      <div v-else-if="parsedVersion" class="result-box">
        <h3>解析结果</h3>
        <div class="parsed-version">
          <div class="parsed-row">
            <strong>完整版本:</strong> {{ parsedVersion.version }}
          </div>
          <div class="parsed-row">
            <strong>主版本:</strong> <span class="version-part major">{{ parsedVersion.major }}</span>
          </div>
          <div class="parsed-row">
            <strong>次版本:</strong> <span class="version-part minor">{{ parsedVersion.minor }}</span>
          </div>
          <div class="parsed-row">
            <strong>修订号:</strong> <span class="version-part patch">{{ parsedVersion.patch }}</span>
          </div>
          <div class="parsed-row" v-if="parsedVersion.prerelease && parsedVersion.prerelease.length">
            <strong>预发布:</strong> <span class="version-part prerelease">{{ parsedVersion.prerelease.join('.') }}</span>
          </div>
          <div class="parsed-row" v-if="parsedVersion.build && parsedVersion.build.length">
            <strong>构建元数据:</strong> <span class="version-part build">{{ parsedVersion.build.join('.') }}</span>
          </div>
          <div class="parsed-row">
            <strong>是预发布版本:</strong> {{ parsedVersion.prerelease && parsedVersion.prerelease.length ? '是' : '否' }}
          </div>
          <div class="parsed-row">
            <strong>版本格式:</strong> {{ parsedVersion.format }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- 高级功能 -->
    <div v-if="activeTab === 'advanced'" class="tab-content">
      <h2>高级功能</h2>
      
      <div class="sub-section">
        <h3>版本兼容性评估</h3>
        <div class="input-group">
          <div class="input-row">
            <label>当前版本:</label>
            <input v-model="advanced.currentVersion" placeholder="例如: 1.2.3" />
          </div>
          <div class="input-row">
            <label>目标版本:</label>
            <input v-model="advanced.targetVersion" placeholder="例如: 2.0.0" />
          </div>
          <div class="actions">
            <button @click="assessCompatibility" :disabled="!canAssessCompatibility">评估</button>
          </div>
        </div>
        
        <div v-if="compatibilityResult" class="result-box">
          <div class="result-row">
            <strong>兼容性:</strong> 
            <span :class="['result', { success: compatibilityResult.compatible, error: !compatibilityResult.compatible }]">
              {{ compatibilityResult.compatible ? '兼容' : '不兼容' }}
            </span>
          </div>
          <div class="result-row">
            <strong>方向:</strong> {{ directionText }}
          </div>
          <div class="result-row">
            <strong>风险等级:</strong> {{ riskText }}
          </div>
          <div class="result-row" v-if="compatibilityResult.reason">
            <strong>原因:</strong> {{ compatibilityResult.reason }}
          </div>
        </div>
      </div>
      
      <div class="sub-section">
        <h3>缓存统计</h3>
        <div class="actions">
          <button @click="loadCacheStats">获取缓存状态</button>
          <button @click="clearCache">清理缓存</button>
        </div>
        
        <div v-if="cacheStats" class="result-box">
          <div class="result-row">
            <strong>缓存大小:</strong> {{ cacheStats.size }} / {{ cacheStats.maxSize }}
          </div>
          <div class="result-row">
            <strong>命中率:</strong> {{ (cacheStats.hitRate * 100).toFixed(2) }}%
          </div>
          <div class="result-row">
            <strong>命中数:</strong> {{ cacheStats.hits }}
          </div>
          <div class="result-row">
            <strong>未命中数:</strong> {{ cacheStats.misses }}
          </div>
          <div v-if="cacheStats.topFrequent && cacheStats.topFrequent.length > 0">
            <strong>最常用版本:</strong>
            <div v-for="(item, index) in cacheStats.topFrequent.slice(0, 5)" :key="index" class="cache-item">
              {{ item.version }}: {{ item.count }}次
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import * as semver from '../../../utils/useAges/forVersionCompare/useIownSemver.js';

// 标签页
const tabs = [
  { id: 'compare', label: '版本比较' },
  { id: 'range', label: '版本范围' },
  { id: 'operations', label: '版本操作' },
  { id: 'batch', label: '批量测试' },
  { id: 'generator', label: '随机生成' },
  { id: 'parser', label: '版本解析' },
  { id: 'advanced', label: '高级功能' }
];
const activeTab = ref('compare');

// 版本比较
const compareVersions = ref({
  versionA: '',
  versionB: ''
});
const compareResult = ref(null);
const diffType = ref('');

const canCompare = computed(() => {
  return semver.isValid(compareVersions.value.versionA) && 
         semver.isValid(compareVersions.value.versionB);
});

const compareResultText = computed(() => {
  if (compareResult.value === null) return '';
  
  if (compareResult.value === 0) return '版本相等';
  if (compareResult.value > 0) return '版本A > 版本B';
  return '版本A < 版本B';
});

function performCompare() {
  compareResult.value = semver.compareVersions(
    compareVersions.value.versionA, 
    compareVersions.value.versionB
  );
  diffType.value = semver.diff(
    compareVersions.value.versionA, 
    compareVersions.value.versionB
  ) || '无差异';
}

// 版本范围测试
const rangeTest = ref({
  version: '',
  range: ''
});
const rangeResult = ref(null);
const rangeExplanation = ref('');

const canCheckRange = computed(() => {
  return semver.isValid(rangeTest.value.version) && 
         rangeTest.value.range.trim() !== '';
});

function checkRange() {
  rangeResult.value = semver.satisfiesVersion(
    rangeTest.value.version,
    rangeTest.value.range
  );
  rangeExplanation.value = semver.explainRange(rangeTest.value.range);
}

// 版本操作
const operations = [
  { value: 'major', label: '增加主版本' },
  { value: 'minor', label: '增加次版本' },
  { value: 'patch', label: '增加修订号' },
  { value: 'premajor', label: '预发布主版本' },
  { value: 'preminor', label: '预发布次版本' },
  { value: 'prepatch', label: '预发布修订版本' },
  { value: 'prerelease', label: '递增预发布版本' },
  { value: 'coerce', label: '强制转换格式' }
];

const versionOps = ref({
  baseVersion: '',
  operation: 'patch',
  identifier: 'alpha'
});
const operationResult = ref('');

const canPerformOperation = computed(() => {
  return semver.isValid(versionOps.value.baseVersion);
});

function performOperation() {
  const needsIdentifier = versionOps.value.operation.includes('pre');
  const identifier = needsIdentifier ? versionOps.value.identifier : undefined;
  
  if (versionOps.value.operation === 'coerce') {
    operationResult.value = semver.coerce(versionOps.value.baseVersion);
  } else {
    operationResult.value = semver.inc(
      versionOps.value.baseVersion,
      versionOps.value.operation,
      identifier
    );
  }
}

// 批量处理
const batchProcess = ref({
  versions: '',
  ascending: true
});
const batchResult = ref(null);
const batchResultType = ref('');
const batchResultTitle = ref('');

function getVersionArray() {
  return batchProcess.value.versions
    .split('\n')
    .map(v => v.trim())
    .filter(v => v);
}

function performBatchSort() {
  const versions = getVersionArray();
  batchResult.value = semver.sort(versions, batchProcess.value.ascending);
  batchResultType.value = 'sort';
  batchResultTitle.value = batchProcess.value.ascending ? '升序排列' : '降序排列';
}

function findGaps() {
  const versions = getVersionArray();
  batchResult.value = semver.findVersionGaps(versions);
  batchResultType.value = 'gaps';
  batchResultTitle.value = '版本断点分析';
}

function analyzePattern() {
  const versions = getVersionArray();
  batchResult.value = semver.analyzeVersionPattern(versions);
  batchResultType.value = 'pattern';
  batchResultTitle.value = '版本模式分析';
}

// 高级功能
const advanced = ref({
  currentVersion: '',
  targetVersion: ''
});
const compatibilityResult = ref(null);
const cacheStats = ref(null);

const canAssessCompatibility = computed(() => {
  return semver.isValid(advanced.value.currentVersion) && 
         semver.isValid(advanced.value.targetVersion);
});

const directionText = computed(() => {
  if (!compatibilityResult.value) return '';
  
  const dirMap = {
    'upgrade': '升级',
    'downgrade': '降级',
    'same': '相同版本'
  };
  
  return dirMap[compatibilityResult.value.direction] || compatibilityResult.value.direction;
});

const riskText = computed(() => {
  if (!compatibilityResult.value) return '';
  
  const riskMap = {
    'high': '高风险',
    'medium': '中等风险',
    'low': '低风险',
    'none': '无风险'
  };
  
  return riskMap[compatibilityResult.value.risk] || compatibilityResult.value.risk;
});

function assessCompatibility() {
  compatibilityResult.value = semver.compatibilityAssessment(
    advanced.value.currentVersion,
    advanced.value.targetVersion
  );
}

function loadCacheStats() {
  cacheStats.value = semver.getCacheStats();
}

function clearCache() {
  semver.clearParseCache();
  loadCacheStats();
}

// 随机版本生成
const generator = ref({
  count: 10,
  type: 'all',
  preId: 'random',
  range: {
    min: { major: 0, minor: 0, patch: 0 },
    max: { major: 10, minor: 20, patch: 20 }
  }
});
const generatedVersions = ref([]);
const copySuccess = ref(false);

function generateRandomVersions() {
  const result = [];
  const { count, type, preId, range } = generator.value;
  
  // 预发布标识数组
  const preIds = ['alpha', 'beta', 'rc', 'dev'];
  
  for (let i = 0; i < count; i++) {
    // 生成随机主版本、次版本和修订号
    const major = getRandomInt(range.min.major, range.max.major);
    const minor = getRandomInt(range.min.minor, range.max.minor);
    const patch = getRandomInt(range.min.patch, range.max.patch);
    
    let version = `${major}.${minor}.${patch}`;
    
    // 根据类型决定是否添加预发布标识
    if (type === 'all' && Math.random() > 0.6 || type === 'prerelease') {
      let identifier;
      if (preId === 'random') {
        identifier = preIds[Math.floor(Math.random() * preIds.length)];
      } else {
        identifier = preId;
      }
      
      const preNum = Math.floor(Math.random() * 10);
      version += `-${identifier}.${preNum}`;
    } else if (type === 'major') {
      // 只生成主要版本
      version = `${major}.0.0`;
    } else if (type === 'minor') {
      // 只生成次要版本
      version = `${range.min.major}.${minor}.0`;
    }
    
    // 有时添加构建元信息
    if (Math.random() > 0.8) {
      const buildNum = Math.floor(Math.random() * 1000).toString(16);
      version += `+build.${buildNum}`;
    }
    
    result.push(version);
  }
  
  generatedVersions.value = result;
}

function copyGeneratedVersions() {
  const text = generatedVersions.value.join('\n');
  navigator.clipboard.writeText(text).then(() => {
    copySuccess.value = true;
    setTimeout(() => {
      copySuccess.value = false;
    }, 2000);
  });
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 工具函数
function isValid(version) {
  return version && semver.isValid(version);
}

// 版本解析功能
const parserInput = ref('');
const parsedVersion = ref(null);
const parserError = ref(null);

function parseVersion() {
  try {
    parserError.value = null;
    if (!parserInput.value) {
      parsedVersion.value = null;
      return;
    }
    parsedVersion.value = semver.parse(parserInput.value);
  } catch (e) {
    parserError.value = e.message;
    parsedVersion.value = null;
  }
}
</script>

<style scoped>
.semver-tester {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  color: #333;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #1a1a1a;
}

h2 {
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
  margin-top: 0;
  color: #2c3e50;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #ddd;
  margin-bottom: 20px;
}

.tab {
  padding: 10px 15px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

.tab:hover {
  background-color: #f9f9f9;
}

.tab.active {
  border-bottom: 2px solid #42b983;
  font-weight: bold;
}

.tab-content {
  background-color: #fff;
  border-radius: 4px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.input-group {
  margin-bottom: 20px;
}

.input-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.input-row label {
  width: 100px;
  flex-shrink: 0;
}

.input-row input, .input-row select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.input-row textarea {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: monospace;
}

.input-row.full-width {
  display: block;
}

.input-row.full-width label {
  display: block;
  margin-bottom: 5px;
}

.validity {
  margin-left: 10px;
  padding: 3px 6px;
  border-radius: 3px;
  font-size: 12px;
  background-color: #f44336;
  color: white;
}

.validity.valid {
  background-color: #4caf50;
}

.actions {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

button {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #3aa876;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.result-box {
  margin-top: 20px;
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 4px;
  border-left: 4px solid #42b983;
}

.result-row {
  margin-bottom: 8px;
}

.result, .diff {
  font-weight: bold;
  color: #2c3e50;
}

.success {
  color: #4caf50;
}

.error {
  color: #f44336;
}

.diff-tag {
  background-color: #e0f7fa;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 8px;
  font-size: 12px;
  color: #00838f;
}

.version-list, .gap-list, .pattern-analysis {
  margin-top: 15px;
}

.version-item, .gap-item, .pattern-row {
  padding: 6px 0;
  border-bottom: 1px dashed #eee;
}

.cache-item {
  padding: 4px 0;
  font-family: monospace;
}

.sub-section {
  margin-bottom: 25px;
}

.sub-section h3 {
  margin-top: 0;
  color: #34495e;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .tabs {
    flex-wrap: wrap;
  }
  
  .input-row {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .input-row label {
    width: 100%;
    margin-bottom: 5px;
  }
  
  .input-row input, .input-row select {
    width: 100%;
  }
  
  .validity {
    margin-left: 0;
    margin-top: 5px;
  }
}

.range-inputs {
  display: flex;
  align-items: center;
  gap: 5px;
}

.range-inputs input {
  width: 60px;
  text-align: center;
}

.version-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.copy-success {
  background-color: #4caf50;
  color: white;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-left: 10px;
  opacity: 1;
  transition: opacity 0.5s;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.result-header h3 {
  margin: 0;
}

.parsed-version {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 10px;
}

.parsed-row {
  display: contents;
}

.parsed-row strong {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.parsed-row span {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.version-part {
  font-family: monospace;
  padding: 2px 6px;
  border-radius: 3px;
}

.version-part.major {
  background-color: #ffcdd2;
  color: #b71c1c;
}

.version-part.minor {
  background-color: #c8e6c9;
  color: #1b5e20;
}

.version-part.patch {
  background-color: #bbdefb;
  color: #0d47a1;
}

.version-part.prerelease {
  background-color: #fff9c4;
  color: #f57f17;
}

.version-part.build {
  background-color: #e1bee7;
  color: #4a148c;
}

.error-box {
  margin-top: 20px;
  padding: 15px;
  background-color: #ffebee;
  border-radius: 4px;
  border-left: 4px solid #f44336;
}

.error-message {
  color: #b71c1c;
}
</style>
