<template>
  <div class="questionnaire-overlay">
    <div class="questionnaire">
      <div class="close-button" @click="$emit('close')">×</div>
      <header>
        <h1>{{ currentSection.systemTitle.startsWith('Marduk') ? currentSection.systemTitle + '-DUMMYSYS-PERSONA-520207'
          : currentSection.systemTitle }}</h1>
        <div class="progress-bar">
          <div class="progress" :style="{ width: progress + '%' }"></div>
        </div>
      </header>

      <main class="three-column-layout">
        <!-- 左侧：结构化问题 -->
        <div class="left-column">
          <div v-for="(section, sectionIndex) in sections" :key="sectionIndex" class="section-container">
            <h2>{{ section.systemTitle }}</h2>
            <div v-for="(question, questionIndex) in section.questions" :key="questionIndex" class="question-container">
              <h3>{{ question.text }}</h3>
              <div class="question">
                <template v-if="question.type === 'composite_rating'">
                  <CompositeRating 
                    :question="question" 
                    @update:question="handleQuestionUpdate"
                    @update:score="(score) => handleScoreUpdate(question, score)"
                  />
                </template>

                <!-- 根据问题类型显示不同的输入方式 -->
                <template v-else-if="question.type === 'text'">
                  <input v-model="question.value" class="text-input"
                    :placeholder="question.placeholder || `请输入${question.text}`">
                </template>

                <!-- 多行文本输入 -->
                <template v-else-if="question.type === 'multiple_text'">
                  <div class="multiple-text">
                    <div v-for="(value, index) in question.values" :key="index" class="multiple-text-item">
                      <input v-model="question.values[index]" class="text-input"
                        :placeholder="`请输入${question.text} #${index + 1}`">
                      <button @click="removeTextValue(question, index)" class="remove-button">删除</button>
                    </div>
                    <button @click="addTextValue(question)" class="add-button">添加新条目</button>
                  </div>
                </template>

                <!-- 选择题选项 -->
                <template v-else-if="question.type === 'single' || question.type === 'multiple'">
                  <p v-if="question.hint" class="question-hint">{{ question.hint }}</p>
                  <div class="options">
                    <div v-for="(option, index) in question.options" :key="index" class="option-item" :class="{
                      'selected': question.type === 'single'
                        ? question.selectedOption === option
                        : (question.selectedOptions && question.selectedOptions.includes(option))
                    }" @click="toggleOption(option, question)">
                      {{ option }}
                    </div>
                  </div>
                </template>

                <!-- 五级评分选项 -->
                <template v-if="question.type === 'rating'">
                  <div class="rating-options">
                    <div class="rating-scale">
                      <div v-for="score in 5" :key="score" class="rating-item"
                        :class="{ 'selected': question.score === score }" @click="setScore(score, question)">
                        {{ score }}
                      </div>
                    </div>
                    <div class="rating-labels">
                      <span>很低</span>
                      <span>较低</span>
                      <span>一般</span>
                      <span>较高</span>
                      <span>很高</span>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- 中间：补充描述系统 -->
        <div class="middle-column">
          <div class="additional-notes-section">
            <div class="notes-header">
              <h3>补充描述</h3>
              <button @click="addNote" class="add-note-button">
                <i class="icon-plus"></i> 添加说明
              </button>
            </div>
            
            <!-- 直接内联显示输入区域 -->
            <div class="inline-note-editor" v-if="currentNote.content !== undefined">
              <textarea
                v-model="currentNote.content"
                class="note-textarea"
                placeholder="请输入补充说明内容..."
                rows="3"
              ></textarea>
              <div class="system-selection">
                <h4>关联系统：</h4>
                <div class="system-checkboxes">
                  <label v-for="system in ['trinity', 'melchior', 'balthazar', 'casper']" :key="system">
                    <input
                      type="checkbox"
                      v-model="currentNote.systems[system]"
                    >
                    {{ system.toUpperCase() }}
                  </label>
                </div>
              </div>
              <div class="inline-editor-buttons">
                <button class="cancel-button" @click="cancelNote">取消</button>
                <button class="save-button" @click="saveNote">保存</button>
              </div>
            </div>

            <!-- 现有笔记列表显示 -->
            <div v-for="(note, index) in additionalNotes" :key="index" class="note-item">
              <div class="note-content">{{ note.content }}</div>
              <div class="note-systems">
                <span v-for="(enabled, system) in note.systems" :key="system" 
                      :class="['system-tag', { 'enabled': enabled }]">
                  {{ system.toUpperCase() }}
                </span>
              </div>
              <button @click="editNote(index)" class="edit-button">编辑</button>
            </div>
          </div>
        </div>

        <!-- 右侧：AI提示词输出区域 -->
        <div class="right-column">
          <div class="summary-section">
            <h3>AI 提示词输出</h3>
            <SSETextDisplay 
              v-for="(summary, system) in sectionSummaries" 
              :key="system"
              :systemName="system.toUpperCase()"
              :promptContent="generateSystemPrompt(system)"
              @generationComplete="handleGenerationComplete"
            />
          </div>
        </div>
      </main>



    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { questionnaireSections } from '../../data/questionnaire-sections.js';
import { summaryPrompts } from '../../data/questionnaire-sections.js';
import CompositeRating from './CompositeRating.vue';
import SSETextDisplay from './SSETextDisplay.vue';

// 添加 emit 定义
const emit = defineEmits(['close', 'complete']);

// 修改sections的初始化，确保它是一个数组
const sections = ref([...questionnaireSections]);

const currentSectionIndex = ref(0);
const currentQuestionIndex = ref(0);
const isComplete = ref(false);

// 修改计算属性以正确访问ref值
const currentSection = computed(() => sections.value[currentSectionIndex.value]);

// 修改 sectionSummaries 的初始化
const sectionSummaries = ref({
  trinity: { promptContent: '', loading: false },
  melchior: { promptContent: '', loading: false },
  balthazar: { promptContent: '', loading: false },
  casper: { promptContent: '', loading: false }
});

// 添加 calculateCompositeScore 函数
const calculateCompositeScore = (question) => {
  if (!question.subQuestions || question.subQuestions.length === 0) {
    return 0;
  }

  // 计算所有已选择选项的分数总和
  const totalScore = question.subQuestions.reduce((sum, subQ) => {
    if (subQ.selectedOptionIndex !== undefined && subQ.weights) {
      // 使用权重计算分数，如果没有权重则使用选项索引作为分数
      const weight = subQ.weights ? subQ.weights[subQ.selectedOptionIndex] : subQ.selectedOptionIndex + 1;
      return sum + weight;
    }
    return sum;
  }, 0);

  // 计算平均分（四舍五入到一位小数）
  const averageScore = Math.round((totalScore / question.subQuestions.length) * 10) / 10;
  
  return averageScore;
};

// 修改 generatePersonaData 方法
const generatePersonaData = () => {
  const data = {
    // 基础信息
    姓名: '',
    年龄: '',
    性别: '',
    所属组织: '',
    职责定位: '',
    体态: '',
    显著标记: [],
    内向程度: '',
    表达方式: '',
    
    // 情感调节评估相关数据
    情绪识别得分: 0,
    自我觉察表现: '',
    他人识别表现: '',
    情境理解表现: '',
    
    情绪调节得分: 0,
    强度调节表现: '',
    持续管理表现: '',
    转换能力表现: '',
    
    社交互动得分: 0,
    主动性表现: '',
    回应性表现: '',
    适应性表现: '',
    
    关系处理得分: 0,
    亲密度调节表现: '',
    界限维持表现: ''
  };
  
  // 遍历所有章节收集数据
  sections.value.forEach(section => {
    section.questions.forEach(question => {
      if (question.type === 'composite_rating') {
        // 计算总分
        const totalScore = calculateCompositeScore(question);
        
        // 根据问题文本设置对应的得分
        if (question.text === '情绪识别能力评估') {
          data.情绪识别得分 = totalScore;
        } else if (question.text === '情绪调节能力评估') {
          data.情绪调节得分 = totalScore;
        } else if (question.text === '社交互动能力评估') {
          data.社交互动得分 = totalScore;
        } else if (question.text === '关系处理能力评估') {
          data.关系处理得分 = totalScore;
        }
        
        // 收集子问题的选项
        question.subQuestions.forEach(subQ => {
          if (subQ.selectedOptionIndex !== undefined && subQ.path) {
            const value = subQ.options[subQ.selectedOptionIndex];
            // 根据path设置对应的表现值
            const pathParts = subQ.path.split('.');
            const key = pathParts[pathParts.length - 1] + '表现';
            data[key] = value;
          }
        });
      } else if (question.type === 'text' || question.type === 'single') {
        // 处理基础信息
        if (question.path) {
          const pathParts = question.path.split('.');
          const key = pathParts[pathParts.length - 1];
          if (question.type === 'text') {
            data[key] = question.value || '';
          } else {
            data[key] = question.selectedOption || '';
          }
        }
      } else if (question.type === 'multiple_text') {
        // 处理多行文本(如显著标记)
        if (question.path) {
          const pathParts = question.path.split('.');
          const key = pathParts[pathParts.length - 1];
          data[key] = question.values || [];
        }
      }
    });
  });
  
  console.log('收集的数据:', data);
  return data;
};

// 计算进度
const progress = computed(() => {
  const totalQuestions = sections.value.reduce((acc, section) =>
    acc + section.questions.length, 0
  );
  const completedQuestions = sections.value.slice(0, currentSectionIndex.value)
    .reduce((acc, section) => acc + section.questions.length, 0)
    + currentQuestionIndex.value;
  return (completedQuestions / totalQuestions) * 100;
});


// 添加错误处理相关的响应式状态
const showErrorDialog = ref(false);
const errorTitle = ref('');
const errorMessage = ref('');
const errorShowRetry = ref(false);
const errorShowSkip = ref(false);
const errorShowConfirm = ref(false);

// 修改错误对话框相关方法
const showError = ({ title, message, showRetry = false, showSkip = false, showConfirm = false }) => {
  errorTitle.value = title;
  errorMessage.value = message;
  errorShowRetry.value = showRetry;
  errorShowSkip.value = showSkip;
  errorShowConfirm.value = showConfirm;
  showErrorDialog.value = true;
};



// 添加用于处理多行文本输入的方法
const addTextValue = (question) => {
  if (!question.values) {
    question.values = [];
  }
  question.values.push('');
};

const removeTextValue = (question, index) => {
  question.values.splice(index, 1);
};


// 添加 getErrorDialogContent 计算属性
const getErrorDialogContent = computed(() => {
  return {
    title: errorTitle.value || '错误',
    message: errorMessage.value || '发生未知错误',
    showRetry: errorShowRetry.value || false,
    showSkip: errorShowSkip.value || false,
    showConfirm: errorShowConfirm.value || false
  };
});


// 添加额外说明相关的响应式状态
const additionalNotes = ref([]);
const currentNote = ref({
  content: '',
  systems: {
    trinity: false,
    melchior: false,
    balthazar: false,
    casper: false
  },
  visibility: {
    trinity: true,
    melchior: true,
    balthazar: true,
    casper: true
  }
});

// 修改添加/取消笔记方法
const addNote = () => {
  currentNote.value = {
    content: '',
    systems: {
      trinity: false,
      melchior: false,
      balthazar: false,
      casper: false
    }
  };
};

const cancelNote = () => {
  currentNote.value = { content: undefined };
};

const editNote = (index) => {
  currentNote.value = {
    ...additionalNotes.value[index],
    originalIndex: index // 记录原始索引用于保存时更新
  };
};

const saveNote = () => {
  if (currentNote.value.content?.trim()) {
    // 确保至少选择一个系统
    if (Object.values(currentNote.value.systems).some(v => v)) {
      if (typeof currentNote.value.originalIndex === 'number') {
        // 更新现有笔记
        additionalNotes.value[currentNote.value.originalIndex] = {
          content: currentNote.value.content.trim(),
          systems: { ...currentNote.value.systems }
        };
      } else {
        // 添加新笔记
        additionalNotes.value.push({ 
          content: currentNote.value.content.trim(),
          systems: { ...currentNote.value.systems }
        });
      }
      currentNote.value = { content: undefined };
    } else {
      showError({
        title: '请选择至少一个系统',
        message: '每个额外说明必须至少关联一个子系统',
        showConfirm: true
      });
    }
  }
};


// 修改 generateSystemPrompt 方法
const generateSystemPrompt = (system) => {
  const systemKey = system.toLowerCase();
  const personaData = generatePersonaData();
  const promptGenerator = summaryPrompts[systemKey];
  
  if (!promptGenerator) {
    throw new Error(`未找到${system}系统的提示词配置`);
  }

  const relevantNotes = additionalNotes.value
    .filter(note => note.systems[systemKey])
    .map(note => note.content)
    .join('\n');

  return promptGenerator(personaData) + 
    (relevantNotes ? `\n\n额外特殊说明，必须优先关注：\n${relevantNotes}` : '');
};

// 处理生成完成的事件
const handleGenerationComplete = ({ system, content }) => {
  console.log(`${system} 系统生成完成:`, content);
  // 这里可以添加其他需要的处理逻辑
};

const handleQuestionUpdate = (updatedQuestion) => {
  // 更新question对象
  const section = sections.value.find(s => s.questions.includes(updatedQuestion));
  if (section) {
    const questionIndex = section.questions.indexOf(updatedQuestion);
    section.questions[questionIndex] = updatedQuestion;
  }
};

const handleScoreUpdate = (question, score) => {
  question.score = score;
};

const toggleOption = (option, question) => {
  if (question.type === 'single') {
    question.selectedOption = question.selectedOption === option ? null : option;
  } else if (question.type === 'multiple') {
    if (!question.selectedOptions) {
      question.selectedOptions = [];
    }
    const index = question.selectedOptions.indexOf(option);
    if (index === -1) {
      question.selectedOptions.push(option);
    } else {
      question.selectedOptions.splice(index, 1);
    }
  }
};

</script>

<style scoped>
.questionnaire-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.questionnaire {
  position: relative;
  background: rgba(20, 20, 30, 0.95);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
  max-height: 90vh;
  width: 90%;
  max-width: 800px;
  overflow-y: auto;
  color: #fff;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.2),
    inset 0 0 20px rgba(0, 255, 255, 0.1);
  padding: 2rem;
}

.close-button {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #0ff;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
}

.close-button:hover {
  background: rgba(0, 255, 255, 0.2);
  transform: scale(1.1);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
}

header h1 {
  color: #0ff;
  text-align: center;
  font-size: 1.8rem;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
  margin-bottom: 1.5rem;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(0, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress {
  height: 100%;
  background: linear-gradient(90deg, #0ff, #00f);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
  transition: width 0.3s ease;
}

.question-container {
  background: rgba(0, 255, 255, 0.05);
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  margin: 1rem 0;
}

.question {
  margin-bottom: 30px;
}

.options {
  margin-top: 20px;
}

.slider {
  width: 100%;
  margin: 10px 0;
}

.value-display {
  text-align: center;
  font-size: 1.2em;
  color: #666;
}

.navigation {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.nav-button {
  padding: 0.8rem 1.5rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-button:hover {
  background: rgba(0, 255, 255, 0.1);
  border-color: #0ff;
}

.nav-button.primary {
  background: rgba(0, 255, 255, 0.2);
  border-color: #0ff;
}

.nav-button.primary:hover {
  background: rgba(0, 255, 255, 0.3);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
}

.results {
  padding: 2rem;
}

.result-sections {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.result-section {
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  padding: 1.5rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.result-section h3 {
  color: #0ff;
  margin-bottom: 1rem;
}

.result-items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.result-item {
  display: flex;
  align-items: center;
  margin: 0.5rem 0;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.result-label {
  min-width: 150px;
  color: rgba(0, 255, 255, 0.8);
}

.result-bar {
  flex: 1;
  height: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  margin: 0 1rem;
  overflow: hidden;
}

.result-value {
  height: 100%;
  background: linear-gradient(90deg, #0ff, #00f);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.result-percentage {
  min-width: 50px;
  text-align: right;
  color: #0ff;
}

.result-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
}

.option-item {
  padding: 0.8rem 1.2rem;
  margin: 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #fff;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.option-item:hover {
  background: rgba(0, 255, 255, 0.1);
  border-color: #0ff;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
}

.option-item.selected {
  background: rgba(0, 255, 255, 0.2);
  border-color: #0ff;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
}

.option-item.selected::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  border: 2px solid #0ff;
  border-radius: 4px;
  animation: pulse 2s infinite;
  pointer-events: none;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(1.02);
    opacity: 0.5;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
  margin: 1rem 0;
}

.rating-options {
  margin: 1.5rem 0;
}

.rating-scale {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.rating-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #fff;
  font-weight: bold;
}

.rating-item:hover {
  background: rgba(0, 255, 255, 0.1);
  border-color: #0ff;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
}

.rating-item.selected {
  background: rgba(0, 255, 255, 0.2);
  border-color: #0ff;
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
}

.rating-labels {
  display: flex;
  justify-content: space-between;
  padding: 0 1rem;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9em;
}

.rating-labels span {
  flex: 1;
  text-align: center;
}

.rating-item.selected::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  border: 2px solid #0ff;
  border-radius: 50%;
  animation: pulse 2s infinite;
  pointer-events: none;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(1.02);
    opacity: 0.5;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.section-intro {
  text-align: center;
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
}

.section-intro h2 {
  color: #4CAF50;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
}

.section-intro p {
  color: #666;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.section-intro .nav-button {
  font-size: 1.1rem;
  padding: 12px 30px;
}

.text-input {
  width: 100%;
  padding: 0.8rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 4px;
  color: #fff;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.text-input:focus {
  outline: none;
  border-color: #0ff;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
}

.multiple-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.multiple-text-item {
  display: flex;
  gap: 8px;
}

.add-button,
.remove-button {
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.add-button {
  background-color: #4CAF50;
  color: white;
  margin-top: 8px;
}

.remove-button {
  background-color: #ff4444;
  color: white;
}

.add-button:hover {
  background-color: #45a049;
}

.remove-button:hover {
  background-color: #cc0000;
}

/* 添加滚动条样式 */
.questionnaire::-webkit-scrollbar {
  width: 8px;
}

.questionnaire::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
}

.questionnaire::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 255, 0.3);
  border-radius: 4px;
}

.questionnaire::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 255, 255, 0.5);
}

.result-text {
  flex: 1;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 4px;
  margin-left: 1rem;
  color: #fff;
}

.result-text:empty::after {
  content: '未填写';
  color: rgba(255, 255, 255, 0.5);
}

.result-text>div {
  padding: 0.2rem 0;
}

.result-text>div:not(:last-child) {
  border-bottom: 1px solid rgba(0, 255, 255, 0.1);
}

.sub-questions {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin: 1rem 0;
}

.sub-question {
  background: rgba(0, 255, 255, 0.05);
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 255, 0.2);
}

.question-hint {
  color: rgba(0, 255, 255, 0.7);
  font-style: italic;
  margin: 0.5rem 0;
}

.composite-result {
  margin: 1rem 0;
}

.composite-result h4 {
  color: rgba(0, 255, 255, 0.9);
  margin-bottom: 0.5rem;
}

/* 添加错误对话框样式 */
.error-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.error-content {
  background: #1a1a1a;
  padding: 2rem;
  border-radius: 8px;
  min-width: 300px;
  max-width: 500px;
}

.error-content h3 {
  color: #e6e6e6;
  margin-bottom: 1rem;
}

.error-content p {
  color: #cccccc;
  margin-bottom: 1.5rem;
}

.error-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.error-buttons button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
}

.retry-button {
  background: #4a90e2;
  color: white;
}

.skip-button {
  background: #666;
  color: white;
}

.confirm-button {
  background: #4a90e2;
  color: white;
}

/* 添加加载状态的样式 */
.loading-indicator {
  color: rgba(0, 255, 255, 0.7);
  font-style: italic;
  padding: 1rem;
  text-align: center;
}

.summary-section {
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  padding: 1.5rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.summary-content {
  margin-top: 1rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
}

.additional-notes {
  margin-top: 2rem;
  padding: 1rem;
  background: rgba(0, 255, 255, 0.05);
  border-radius: 8px;
}

.notes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.add-note-button {
  padding: 0.5rem 1rem;
  background: rgba(0, 255, 255, 0.2);
  border: 1px solid #0ff;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
}

.note-item {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 4px;
  padding: 1rem;
  margin: 0.5rem 0;
  position: relative;
}

.note-content {
  margin-bottom: 0.5rem;
  color: #fff;
}

.note-systems {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  color: rgba(255, 255, 255, 0.7);
}

.system-tag {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8em;
  background: rgba(0, 0, 0, 0.3);
  opacity: 0.5;
}

.system-tag.enabled {
  background: rgba(0, 255, 255, 0.2);
  opacity: 1;
}

.remove-note-button {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.2rem 0.5rem;
  background: rgba(255, 0, 0, 0.2);
  border: none;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
}

.note-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1100;
}

.note-dialog {
  background: #1a1a1a;
  padding: 2rem;
  border-radius: 8px;
  min-width: 400px;
  max-width: 600px;
}

.note-textarea {
  width: 100%;
  min-height: 100px;
  margin: 1rem 0;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 4px;
  color: #fff;
  resize: vertical;
}

.system-selection {
  margin: 1rem 0;
}

.system-checkboxes {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.system-checkboxes label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #fff;
}

.dialog-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.cancel-button,
.save-button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
}

.save-button {
  background: rgba(0, 255, 255, 0.2);
  border: 1px solid #0ff;
  color: #fff;
}

.summary-preparation {
  margin: 2rem 0;
}

.preparation-hint {
  text-align: center;
  color: rgba(0, 255, 255, 0.7);
  margin: 1.5rem 0;
}

.preparation-actions {
  margin-top: 2rem;
  text-align: center;
}

.start-generation-button {
  padding: 0.8rem 2rem;
  background: rgba(0, 255, 255, 0.2);
  border: 1px solid #0ff;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.3s ease;
}

.start-generation-button:hover {
  background: rgba(0, 255, 255, 0.3);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
}

/* 添加额外说明按钮样式 */
.add-note-button {
  padding: 0.5rem 1rem;
  background: rgba(0, 255, 255, 0.2);
  border: 1px solid #0ff;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
}

.add-note-button:hover {
  background: rgba(0, 255, 255, 0.3);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
}

.notes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.additional-notes-section {
  margin-top: 2rem;
  padding: 1rem;
  background: rgba(0, 255, 255, 0.05);
  border-radius: 8px;
}

.three-column-layout {
  display: flex;
  gap: 2rem;
  margin-top: 2rem;
  height: calc(100% - 120px); /* 调整高度计算方式 */
  overflow: hidden;
}

.left-column,
.middle-column,
.right-column {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
  padding-right: 8px;
  padding-bottom: 1rem; /* 减少底部内边距 */
}

.left-column {
  flex: 2;
}

.middle-column {
  flex: 1.5;
}

.right-column {
  flex: 1.5;
}

.questionnaire {
  width: 95%;
  max-width: 1600px;
  height: 90vh;
  overflow: hidden;
  padding-bottom: 1rem; /* 减少底部内边距 */
}

.inline-note-editor {
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
}

.inline-editor-buttons {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

.note-textarea {
  width: 100%;
  min-height: 80px;
  margin: 1rem 0;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 4px;
  color: #fff;
  resize: vertical;
}

/* 添加编辑按钮样式 */
.edit-button {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.2rem 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
}
</style>