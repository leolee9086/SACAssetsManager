<template>
  <div class="lcs-tester">
    <h1>最长公共子序列(LCS)算法测试</h1>
    
    <div class="main-container">
      <!-- 左侧输入区域 -->
      <div class="left-panel">
        <div class="settings">
          <div class="algorithm-selector">
            <span>算法选择：</span>
            <label>
              <input type="radio" v-model="algorithm" value="auto" />
              自动
            </label>
            <label>
              <input type="radio" v-model="algorithm" value="myers" />
              Myers算法
            </label>
            <label>
              <input type="radio" v-model="algorithm" value="dp" />
              动态规划
            </label>
          </div>
          
          <div class="input-mode">
            <label>
              <input type="radio" v-model="inputMode" value="text" />
              文本模式
            </label>
            <label>
              <input type="radio" v-model="inputMode" value="array" />
              数组模式
            </label>
          </div>
        </div>
        
        <div class="input-area">
          <div class="sequence-input">
            <h3>序列A</h3>
            <textarea v-model="sequenceAInput" placeholder="输入第一个序列..."></textarea>
          </div>
          
          <div class="sequence-input">
            <h3>序列B</h3>
            <textarea v-model="sequenceBInput" placeholder="输入第二个序列..."></textarea>
          </div>
        </div>
        
        <button @click="compareLCS" class="compare-btn">比较序列</button>
        
        <div class="performance-testing">
          <button @click="showPerformanceOptions = !showPerformanceOptions" class="toggle-btn">
            {{ showPerformanceOptions ? '隐藏' : '显示' }}性能测试选项
          </button>
          
          <div v-if="showPerformanceOptions" class="performance-options">
            <div class="option-group">
              <label>数据类型：</label>
              <select v-model="dataType">
                <option value="text">文本</option>
                <option value="number">数字</option>
                <option value="mixed">混合</option>
              </select>
            </div>
            
            <div class="option-group">
              <label>数据量：</label>
              <input type="range" v-model.number="dataSize" min="100" max="10000" step="100" />
              <span>{{ dataSize }}项</span>
            </div>
            
            <div class="option-group">
              <label>相似度：</label>
              <input type="range" v-model.number="similarityLevel" min="0" max="100" />
              <span>{{ similarityLevel }}%</span>
            </div>
            
            <button @click="generateTestData" class="generate-btn">生成测试数据</button>
          </div>
        </div>
      </div>
      
      <!-- 右侧结果区域 -->
      <div class="right-panel" v-if="result">
        <div class="result-section">
          <h2>比较结果</h2>
          
          <div class="result-cards">
            <div class="result-card algorithm">
              <h3>算法信息</h3>
              <p>使用算法: <strong>{{ result.algorithm }}</strong></p>
              <p>执行时间: <strong>{{ result.executionTime ? result.executionTime.toFixed(2) + ' ms' : '未测量' }}</strong></p>
              <p v-if="result.error" class="error">错误: {{ result.error }}</p>
            </div>
            
            <div class="result-card statistics">
              <h3>序列统计</h3>
              <p>序列A长度: <strong>{{ parseInput(sequenceAInput, inputMode).length }}</strong></p>
              <p>序列B长度: <strong>{{ parseInput(sequenceBInput, inputMode).length }}</strong></p>
              <p>LCS长度: <strong>{{ result.length }}</strong></p>
              <p>相似度: <strong>{{ calculateSimilarity(result).toFixed(2) }}%</strong></p>
            </div>
            
            <div class="result-card edits-stat">
              <h3>编辑统计</h3>
              <div class="stat-item">
                <span class="stat-label equal">相同</span>
                <div class="stat-bar">
                  <div class="stat-value equal" 
                       :style="{width: `${calculatePercentage(result.stats.equal, getTotalEdits(result.stats))}%`}">
                  </div>
                </div>
                <span class="stat-number">{{ result.stats.equal }}</span>
              </div>
              
              <div class="stat-item">
                <span class="stat-label add">添加</span>
                <div class="stat-bar">
                  <div class="stat-value add" 
                       :style="{width: `${calculatePercentage(result.stats.add, getTotalEdits(result.stats))}%`}">
                  </div>
                </div>
                <span class="stat-number">{{ result.stats.add }}</span>
              </div>
              
              <div class="stat-item">
                <span class="stat-label del">删除</span>
                <div class="stat-bar">
                  <div class="stat-value del" 
                       :style="{width: `${calculatePercentage(result.stats.del, getTotalEdits(result.stats))}%`}">
                  </div>
                </div>
                <span class="stat-number">{{ result.stats.del }}</span>
              </div>
            </div>
          </div>
          
          <div class="performance-warning" v-if="parseInput(sequenceAInput, inputMode).length > 1000 || parseInput(sequenceBInput, inputMode).length > 1000">
            <p>⚠️ 注意：大数据量比较可能会影响性能，请耐心等待结果</p>
          </div>
          
          <div class="visualization">
            <div class="sequence-display">
              <h3>序列A</h3>
              <div class="items">
                <div 
                  v-for="(edit, index) in result.edits.filter(e => e.type !== 'add')" 
                  :key="`a-${index}`"
                  :class="['item', edit.type]"
                >
                  {{ edit.text }}
                </div>
              </div>
            </div>
            
            <div class="sequence-display">
              <h3>序列B</h3>
              <div class="items">
                <div 
                  v-for="(edit, index) in result.edits.filter(e => e.type !== 'del')" 
                  :key="`b-${index}`"
                  :class="['item', edit.type]"
                >
                  {{ edit.text }}
                </div>
              </div>
            </div>
          </div>
          
          <div class="edits-list">
            <h3>编辑详情</h3>
            <div class="edit-item" v-for="(edit, index) in result.edits" :key="`edit-${index}`">
              <span :class="['edit-type', edit.type]">{{ getEditTypeName(edit.type) }}</span>
              <span class="edit-content">{{ edit.text }}</span>
              <span class="edit-position" v-if="edit.type !== 'add'">
                A[{{ edit.oldIndex }}]
              </span>
              <span class="edit-position" v-if="edit.type !== 'del'">
                B[{{ edit.newIndex }}]
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { computeLCS } from '../../../../src/toolBox/base/useEcma/useString/useLCS.js';

// 状态管理
const algorithm = ref('auto');
const inputMode = ref('text');
const sequenceAInput = ref('');
const sequenceBInput = ref('');
const result = ref(null);

// 性能测试参数
const showPerformanceOptions = ref(false);
const dataSize = ref(1000);
const similarityLevel = ref(70); // 相似度百分比
const dataType = ref('text'); // 'text', 'number', 'mixed'

// 将输入转换为数组
const parseInput = (input, mode) => {
  if (mode === 'text') {
    return input.split('\n');
  } else { // 数组模式
    try {
      const trimmedInput = input.trim();
      if (!trimmedInput) return [];
      
      // 处理简单的数组表示，如 1,2,3 或 a,b,c
      if (!trimmedInput.includes('[')) {
        return trimmedInput.split(',').map(item => item.trim());
      }
      
      // 处理JSON数组
      return JSON.parse(trimmedInput);
    } catch (error) {
      alert('数组格式解析错误，请检查输入');
      return [];
    }
  }
};

// 执行LCS比较
const compareLCS = () => {
  const seqA = parseInput(sequenceAInput.value, inputMode.value);
  const seqB = parseInput(sequenceBInput.value, inputMode.value);
  
  const options = {
    algorithm: algorithm.value,
    maxSize: 10000,
    timeout: 10000, // 10秒超时
    measurePerformance: true // 启用性能测量
  };
  
  // 记录开始时间
  const startTime = performance.now();
  
  try {
    result.value = computeLCS(seqA, seqB, options);
    
    // 记录结束时间并计算耗时
    const endTime = performance.now();
    result.value.executionTime = endTime - startTime;
    
    // 计算统计信息
    const stats = calculateStats(result.value.edits);
    result.value.stats = stats;
    
  } catch (error) {
    result.value = {
      algorithm: algorithm.value,
      error: error.message,
      length: 0,
      edits: [],
      executionTime: 0,
      stats: { equal: 0, add: 0, del: 0 }
    };
  }
};

// 计算统计信息
const calculateStats = (edits) => {
  const stats = {
    equal: 0,
    add: 0,
    del: 0
  };
  
  edits.forEach(edit => {
    stats[edit.type]++;
  });
  
  return stats;
};

// 编辑类型名称转换
const getEditTypeName = (type) => {
  const typeMap = {
    'equal': '相同',
    'add': '添加',
    'del': '删除'
  };
  return typeMap[type] || type;
};

// 随机生成测试数据
const generateTestData = () => {
  // 根据数据类型生成基础元素
  const generateElement = () => {
    switch (dataType.value) {
      case 'text':
        // 生成随机字符（中英文混合）
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789我是中文字符示例';
        return chars.charAt(Math.floor(Math.random() * chars.length));
      case 'number':
        // 生成随机数字
        return Math.floor(Math.random() * 1000).toString();
      case 'mixed':
        // 随机选择生成文本或数字
        return Math.random() > 0.5 ? 
          generateElement('text') : 
          generateElement('number');
      default:
        return Math.random().toString(36).substring(2, 8);
    }
  };

  // 生成基准序列
  const baseSequence = Array.from({ length: dataSize.value }, () => generateElement());
  
  // 生成有差异的第二个序列
  const generateDifferentSequence = (base) => {
    // 复制基准序列
    const result = [...base];
    
    // 计算需要修改的元素数量
    const changesToMake = Math.floor(base.length * (1 - similarityLevel.value / 100));
    
    for (let i = 0; i < changesToMake; i++) {
      const changeType = Math.random();
      const position = Math.floor(Math.random() * result.length);
      
      if (changeType < 0.33 && result.length > 10) {
        // 删除元素
        result.splice(position, 1);
      } else if (changeType < 0.66) {
        // 修改元素
        result[position] = generateElement();
      } else {
        // 添加元素
        result.splice(position, 0, generateElement());
      }
    }
    
    return result;
  };

  // 生成两个序列
  const seqA = baseSequence;
  const seqB = generateDifferentSequence(seqA);
  
  // 根据输入模式设置值
  if (inputMode.value === 'text') {
    sequenceAInput.value = seqA.join('\n');
    sequenceBInput.value = seqB.join('\n');
  } else {
    sequenceAInput.value = JSON.stringify(seqA);
    sequenceBInput.value = JSON.stringify(seqB);
  }
};

// 计算相似度
const calculateSimilarity = (result) => {
  if (!result || !result.stats) return 0;
  
  const total = getTotalEdits(result.stats);
  if (total === 0) return 0;
  
  return (result.stats.equal / total) * 100;
};

// 计算百分比
const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return (value / total) * 100;
};

// 获取编辑总数
const getTotalEdits = (stats) => {
  if (!stats) return 0;
  return stats.equal + stats.add + stats.del;
};
</script>

<style scoped>
.lcs-tester {
  margin: 0 auto;
  padding: 20px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

.main-container {
  display: flex;
  gap: 20px;
  height: calc(100vh - 100px);
  overflow: hidden;
}

.left-panel {
  width: 40%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding-right: 10px;
}

.right-panel {
  width: 60%;
  overflow-y: auto;
  border-left: 1px solid #eee;
  padding-left: 20px;
}

.settings {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.input-area {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 20px;
}

.sequence-input {
  width: 100%;
}

textarea {
  width: 100%;
  height: 150px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-family: monospace;
}

.compare-btn {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-bottom: 20px;
}

.compare-btn:hover {
  background-color: #45a049;
}

.result-section {
  padding-top: 10px;
}

.result-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.result-card {
  background-color: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.result-card h3 {
  margin-top: 0;
  color: #455A64;
  font-size: 16px;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
  margin-bottom: 10px;
}

.algorithm {
  background-color: #F3F8FF;
}

.statistics {
  background-color: #F5F5F5;
}

.edits-stat {
  background-color: #FFFDE7;
}

.stat-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 10px;
}

.stat-label {
  width: 50px;
  text-align: center;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 12px;
}

.stat-bar {
  flex: 1;
  height: 20px;
  background-color: #f1f1f1;
  border-radius: 10px;
  overflow: hidden;
}

.stat-value {
  height: 100%;
  transition: width 0.5s ease;
}

.stat-number {
  width: 40px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.performance-warning {
  background-color: #FFF3E0;
  border-left: 4px solid #FF9800;
  padding: 10px 15px;
  margin-bottom: 20px;
  border-radius: 0 4px 4px 0;
  font-size: 14px;
}

.visualization {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.sequence-display {
  flex: 1;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 10px;
}

.items {
  font-family: monospace;
}

.item {
  padding: 2px 5px;
  margin: 2px 0;
  border-radius: 3px;
}

.equal {
  background-color: #E8F5E9;
}

.add {
  background-color: #E3F2FD;
}

.del {
  background-color: #FFEBEE;
  text-decoration: line-through;
}

.edits-list {
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 10px;
}

.edit-item {
  padding: 5px;
  border-bottom: 1px solid #f5f5f5;
  display: flex;
  align-items: center;
}

.edit-type {
  display: inline-block;
  width: 60px;
  padding: 2px 5px;
  border-radius: 3px;
  margin-right: 10px;
  text-align: center;
}

.edit-content {
  flex: 1;
  font-family: monospace;
  margin: 0 10px;
  overflow-wrap: break-word;
}

.edit-position {
  color: #757575;
  font-size: 0.9em;
  margin-left: 5px;
}

.performance-testing {
  margin-bottom: 20px;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 10px;
}

.toggle-btn {
  background-color: #607D8B;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}

.performance-options {
  margin-top: 10px;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.option-group {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.generate-btn {
  background-color: #FF9800;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.generate-btn:hover {
  background-color: #F57C00;
}
</style>
