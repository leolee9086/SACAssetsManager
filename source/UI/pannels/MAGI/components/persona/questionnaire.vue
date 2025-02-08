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

      <main>
        <!-- 章节介绍 -->
        <div v-if="showSectionIntro" class="section-intro">
          <h2>{{ currentSection.systemTitle }}</h2>
          <p>{{ currentSection.description }}</p>
          <button @click="startSection" class="nav-button primary">开始评估</button>
        </div>

        <!-- 问题内容 -->
        <div v-else>
          <h2>{{ currentSection.title }}</h2>
          <div class="question-container" v-if="!isComplete">
            <div class="question">
              <template v-if="currentQuestion.type === 'composite_rating'">
                <h3>{{ currentQuestion.text }}</h3>
                <p v-if="currentQuestion.hint" class="question-hint">{{ currentQuestion.hint }}</p>
                <div class="sub-questions">
                  <div v-for="(subQuestion, index) in currentQuestion.subQuestions" :key="index" class="sub-question">
                    <p>{{ subQuestion.text }}</p>
                    <div class="options">
                      <div v-for="(option, optIndex) in subQuestion.options" :key="optIndex" class="option-item"
                        :class="{ 'selected': subQuestion.selectedOptionIndex === optIndex }"
                        @click="selectSubQuestionOption(subQuestion, optIndex)">
                        {{ option }}
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <!-- 根据问题类型显示不同的输入方式 -->
              <template v-else-if="currentQuestion.type === 'text'">
                <input v-model="currentQuestion.value" class="text-input"
                  :placeholder="currentQuestion.placeholder || `请输入${currentQuestion.text}`">
              </template>

              <!-- 多行文本输入 -->
              <template v-else-if="currentQuestion.type === 'multiple_text'">
                <div class="multiple-text">
                  <div v-for="(value, index) in currentQuestion.values" :key="index" class="multiple-text-item">
                    <input v-model="currentQuestion.values[index]" class="text-input"
                      :placeholder="`请输入${currentQuestion.text} #${index + 1}`">
                    <button @click="removeTextValue(currentQuestion, index)" class="remove-button">删除</button>
                  </div>
                  <button @click="addTextValue(currentQuestion)" class="add-button">添加新条目</button>
                </div>
              </template>

              <!-- 选择题选项 -->
              <template v-else-if="currentQuestion.type === 'single' || currentQuestion.type === 'multiple'">
                <h3>{{ currentQuestion.text }}</h3>
                <p v-if="currentQuestion.hint" class="question-hint">{{ currentQuestion.hint }}</p>
                <div class="options">
                  <div v-for="(option, index) in currentQuestion.options" :key="index" class="option-item" :class="{
                    'selected': currentQuestion.type === 'single'
                      ? currentQuestion.selectedOption === option
                      : (currentQuestion.selectedOptions && currentQuestion.selectedOptions.includes(option))
                  }" @click="toggleOption(option)">
                    {{ option }}
                  </div>
                </div>
              </template>

              <!-- 五级评分选项 -->
              <template v-if="currentQuestion.type === 'rating'">
                <div class="rating-options">
                  <div class="rating-scale">
                    <div v-for="score in 5" :key="score" class="rating-item"
                      :class="{ 'selected': currentQuestion.score === score }" @click="setScore(score)">
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

            <div class="navigation">
              <button @click="previousQuestion" :disabled="currentQuestionIndex === 0" class="nav-button">上一题</button>
              <button @click="nextQuestion" class="nav-button primary">{{ isLastQuestion ? '完成' : '下一题' }}</button>
            </div>
          </div>

          <div class="results" v-else>
            <h2>评估结果</h2>
            <div class="result-sections">
              <div v-for="(section, index) in sections" :key="index" class="result-section">
                <h3>{{ section.title }}</h3>
                <div class="result-items">
                  <template v-for="(question, qIndex) in section.questions" :key="qIndex">
                    <div v-if="question.type === 'composite_rating'" class="composite-result">
                      <h4>{{ question.text }}</h4>
                      <div class="result-bar">
                        <div class="result-value" :style="{ width: calculateCompositeScore(question) + '%' }"></div>
                      </div>
                      <div class="result-percentage">
                        {{ calculateCompositeScore(question) }}%
                      </div>
                    </div>
                    <div v-else-if="question.type === 'rating'" class="result-item">
                      <div class="result-label">{{ question.text }}</div>
                      <div class="result-bar">
                        <div class="result-value" :style="{ width: ((question.score || 3) / 5 * 100) + '%' }"></div>
                      </div>
                      <div class="result-percentage">{{ ((question.score || 3) / 5 * 100).toFixed(0) }}%</div>
                    </div>
                    <template v-else-if="question.type === 'single'">
                      <div class="result-text">{{ question.selectedOption || '未选择' }}</div>
                    </template>
                    <template v-else-if="question.type === 'multiple'">
                      <div class="result-text">{{ (question.selectedOptions || []).join(', ') || '未选择' }}</div>
                    </template>
                    <template v-else-if="question.type === 'text'">
                      <div class="result-text">{{ question.value || '未填写' }}</div>
                    </template>
                    <template v-else-if="question.type === 'multiple_text'">
                      <div class="result-text">
                        <div v-for="(value, vIndex) in question.values" :key="vIndex">
                          {{ value }}
                        </div>
                      </div>
                    </template>
                  </template>
                </div>
              </div>
            </div>

            <!-- 添加额外说明准备页面 -->
            <div v-if="showSummaryPreparation" class="summary-preparation">
              <div class="additional-notes">
                <div class="notes-header">
                  <h3>添加额外说明</h3>
                  <button @click="addNote" class="add-note-button">添加说明</button>
                </div>
                
                <div class="notes-list">
                  <div v-for="(note, index) in additionalNotes" :key="index" class="note-item">
                    <div class="note-content">{{ note.content }}</div>
                    <div class="note-systems">
                      适用于：
                      <span v-for="(enabled, system) in note.systems" :key="system" 
                            :class="{ 'system-tag': true, 'enabled': enabled }">
                        {{ system.toUpperCase() }}
                      </span>
                    </div>
                    <button @click="removeNote(index)" class="remove-note-button">删除</button>
                  </div>
                </div>

                <div class="preparation-actions">
                  <p class="preparation-hint">请添加所需的额外说明，完成后点击下方按钮开始生成系统总结</p>
                  <button @click="startGeneratingSummaries" class="start-generation-button">
                    开始生成系统总结
                  </button>
                </div>
              </div>
            </div>

            <!-- 系统总结显示部分 -->
            <div v-else class="system-summaries">
              <h3>DummySys模拟指令</h3>
              
              <div v-for="(summary, system) in sectionSummaries" :key="system" class="summary-section">
                <h4>{{ system.toUpperCase() }}子线程模拟指令</h4>
                <div class="summary-content">
                  <div v-if="summary.loading" class="loading-indicator">
                    正在生成总结...
                  </div>
                  <div v-else>
                    {{ summary.content }}
                  </div>
                </div>
              </div>
            </div>

            <div class="result-actions">
              <button @click="restartQuestionnaire" class="nav-button">重新评估</button>
              <button @click="$emit('close')" class="nav-button primary">完成</button>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- 修改错误提示对话框 -->
    <div v-if="showErrorDialog" class="error-dialog">
      <div class="error-content">
        <h3>{{ getErrorDialogContent.title }}</h3>
        <p>{{ getErrorDialogContent.message }}</p>
        <div class="error-buttons">
          <button v-if="getErrorDialogContent.showRetry" 
                  @click="retryGenerateSummary" 
                  class="retry-button">重试</button>
          <button v-if="getErrorDialogContent.showSkip" 
                  @click="skipSummary" 
                  class="skip-button">跳过</button>
          <button v-if="getErrorDialogContent.showConfirm" 
                  @click="confirmError" 
                  class="confirm-button">确定</button>
        </div>
      </div>
    </div>

    <!-- 添加说明对话框 -->
    <div v-if="showAddNoteDialog" class="note-dialog-overlay">
      <div class="note-dialog">
        <h3>添加额外说明</h3>
        <textarea v-model="currentNote.content" 
                  placeholder="请输入额外说明内容..."
                  class="note-textarea"></textarea>
        
        <div class="system-selection">
          <div class="system-checkboxes">
            <label v-for="(_, system) in currentNote.systems" :key="system">
              <input type="checkbox" v-model="currentNote.systems[system]">
              {{ system.toUpperCase() }}
            </label>
          </div>
        </div>
        
        <div class="dialog-buttons">
          <button @click="showAddNoteDialog = false" class="cancel-button">取消</button>
          <button @click="saveNote" class="save-button">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { questionnaireSections } from '../../data/questionnaire-sections.js';
import { summaryPrompts } from '../../data/questionnaire-sections.js';
import { AISSEConversation } from '../../core/openAISSEAPI.js';

// 添加 emit 定义
const emit = defineEmits(['close', 'complete']);

// 修改sections的初始化，确保它是一个数组
const sections = ref([...questionnaireSections]);

const currentSectionIndex = ref(0);
const currentQuestionIndex = ref(0);
const isComplete = ref(false);

// 修改计算属性以正确访问ref值
const currentSection = computed(() => sections.value[currentSectionIndex.value]);
const currentQuestion = computed(() =>
  currentSection.value.questions[currentQuestionIndex.value]
);

// 在 setup 中添加
const aiConversation = new AISSEConversation({
  apiKey: 'sk-aqvyijgfetcswtdfofouewfrwdezezcpmfacweaerlhpwkeg', // 需要从配置或环境变量中获取
  model: 'deepseek-ai/DeepSeek-V3',
  temperature: 0.7,
  max_tokens: 4096
});

// 添加处理选项改变的方法
const handleOptionChange = (question, option) => {
  question.selectedOption = option;
  // 如果存在onChange处理器，则调用它
  if (question.onChange) {
    const currentSection = sections.value.find(s =>
      s.questions.includes(question)
    );
    question.onChange(option, currentSection.questions);
  }
};

// 修改toggleOption方法
const toggleOption = (option) => {
  if (currentQuestion.value.type === 'single') {
    currentQuestion.value.selectedOption = option;
    // 调用handleOptionChange
    handleOptionChange(currentQuestion.value, option);
  } else if (currentQuestion.value.type === 'multiple') {
    if (!currentQuestion.value.selectedOptions) {
      currentQuestion.value.selectedOptions = [];
    }
    const index = currentQuestion.value.selectedOptions.indexOf(option);
    if (index === -1) {
      currentQuestion.value.selectedOptions.push(option);
    } else {
      currentQuestion.value.selectedOptions.splice(index, 1);
    }
  }
};

// 添加评分处理方法
const setScore = (score) => {
  if (currentQuestion.value.type === 'rating') {
    currentQuestion.value.score = score;
    // 转换为0-1范围的值
    currentQuestion.value.value = score / 5;
  }
};

// 添加处理复合评分的方法
const selectSubQuestionOption = (subQuestion, optionIndex) => {
  subQuestion.selectedOptionIndex = optionIndex;
};

const calculateCompositeScore = (question) => {
  if (!question.subQuestions) return 0;
  
  const scores = question.subQuestions.map(subQ => {
    const score = subQ.selectedOptionIndex !== undefined ? subQ.selectedOptionIndex : 0;
    return score * (subQ.weight || 1);
  });
  
  const totalWeight = question.subQuestions.reduce((sum, subQ) => 
    sum + (subQ.weight || 1), 0
  );
  
  const weightedSum = scores.reduce((sum, score) => sum + score, 0);
  return Math.round((weightedSum / (totalWeight * 4)) * 100); // 4是选项数量-1
};

// 修改初始化方法
const initializeQuestions = () => {
  sections.value.forEach(section => {
    section.questions.forEach(question => {
      if (question.type === 'composite_rating') {
        question.subQuestions.forEach(subQuestion => {
          subQuestion.selectedOptionIndex = null;
        });
      } else if (question.type === 'rating') {
        question.score = 3;
        question.value = 0.5;
      }
      // 保持其他类型的初始化
    });
  });
};

// 修改 sectionSummaries 的结构，添加 loading 状态
const sectionSummaries = ref({
  trinity: { content: '', loading: false },
  melchior: { content: '', loading: false },
  balthazar: { content: '', loading: false },
  casper: { content: '', loading: false }
});

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

// 判断是否为最后一个问题
const isLastQuestion = computed(() => {
  return currentSectionIndex.value === sections.value.length - 1 &&
    currentQuestionIndex.value === currentSection.value.questions.length - 1;
});

// 添加错误处理相关的响应式状态
const showErrorDialog = ref(false);
const errorTitle = ref('');
const errorMessage = ref('');
const errorShowRetry = ref(false);
const errorShowSkip = ref(false);
const errorShowConfirm = ref(false);

// 添加一个状态来控制流程
const showSummaryPreparation = ref(true);

// 修改 nextQuestion 方法
const nextQuestion = async () => {
  if (!isQuestionComplete(currentQuestion.value)) {
    showError({
      title: '请完成当前问题',
      message: '所有问题都需要完整填写才能继续',
      showConfirm: true
    });
    return;
  }

  const isLastQuestionInSection = currentQuestionIndex.value === currentSection.value.questions.length - 1;
  const isLastSection = currentSectionIndex.value === sections.value.length - 1;
  
  if (isLastQuestionInSection && isLastSection) {
    // 显示额外说明准备页面，而不是直接生成总结
    isComplete.value = true;
    showSummaryPreparation.value = true;
  } else if (isLastQuestionInSection) {
    currentSectionIndex.value++;
    currentQuestionIndex.value = 0;
  } else {
    currentQuestionIndex.value++;
  }
};

// 修改 isQuestionComplete 方法
const isQuestionComplete = (question) => {
  if (!question) return false;

  switch (question.type) {
    case 'text':
      return !!question.value && question.value.trim() !== '';
    case 'multiple_text':
      return question.values && 
             question.values.length > 0 && 
             question.values.every(v => v && v.trim() !== '');
    case 'single':
      return !!question.selectedOption;
    case 'multiple':
      return question.selectedOptions && question.selectedOptions.length > 0;
    case 'rating':
      return question.score !== undefined;
    case 'composite_rating':
      return question.subQuestions && 
             question.subQuestions.every(sq => 
               sq.selectedOptionIndex !== undefined
             );
    default:
      return true; // 对于未知类型的问题，默认返回 true
  }
};

// 修改错误对话框相关方法
const showError = ({ title, message, showRetry = false, showSkip = false, showConfirm = false }) => {
  errorTitle.value = title;
  errorMessage.value = message;
  errorShowRetry.value = showRetry;
  errorShowSkip.value = showSkip;
  errorShowConfirm.value = showConfirm;
  showErrorDialog.value = true;
};

const confirmError = () => {
  showErrorDialog.value = false;
};

const retryGenerateSummary = async () => {
  showErrorDialog.value = false;
  try {
    await generateAllSummaries();
    isComplete.value = true;
  } catch (error) {
    showError({
      title: '生成总结失败',
      message: error.message,
      showRetry: true,
      showSkip: true
    });
  }
};

const skipSummary = () => {
  showErrorDialog.value = false;
  isComplete.value = true;
};

// 修改 previousQuestion 方法
const previousQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--;
  } else if (currentSectionIndex.value > 0) {
    currentSectionIndex.value--;
    currentQuestionIndex.value = sections.value[currentSectionIndex.value].questions.length - 1;
  }
};

const restartQuestionnaire = () => {
  currentSectionIndex.value = 0;
  currentQuestionIndex.value = 0;
  isComplete.value = false;
  sections.value.forEach(section => {
    section.questions.forEach(question => {
      question.value = 0.5;
    });
  });
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

// 添加章节显示控制
const showSectionIntro = ref(true);

// 添加开始章节的方法
const startSection = () => {
  showSectionIntro.value = false;
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

// 修改 generateAllSummaries 方法
const generateAllSummaries = async () => {
  const personaData = generatePersonaData();
  
  // 并行生成所有总结，但独立处理每个结果
  const systems = ['trinity', 'melchior', 'balthazar', 'casper'];
  
  systems.forEach(async (system) => {
    sectionSummaries.value[system].loading = true;
    try {
      const summary = await generateSystemSummary(system.toUpperCase(), personaData);
      sectionSummaries.value[system].content = summary;
    } catch (error) {
      console.error(`生成${system}总结失败:`, error);
      sectionSummaries.value[system].content = `生成失败: ${error.message}`;
    } finally {
      sectionSummaries.value[system].loading = false;
    }
  });
  
  // 立即显示结果页面
  isComplete.value = true;
};

// 添加额外说明相关的响应式状态
const additionalNotes = ref([]);
const showAddNoteDialog = ref(false);
const currentNote = ref({
  content: '',
  systems: {
    trinity: false,
    melchior: false,
    balthazar: false,
    casper: false
  }
});

// 添加处理额外说明的方法
const addNote = () => {
  showAddNoteDialog.value = true;
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

const saveNote = () => {
  if (currentNote.value.content.trim()) {
    additionalNotes.value.push({ ...currentNote.value });
    showAddNoteDialog.value = false;
  }
};

const removeNote = (index) => {
  additionalNotes.value.splice(index, 1);
};

// 修改 generateSystemSummary 方法以包含额外说明
const generateSystemSummary = async (system, data) => {
  try {
    const systemKey = system.toLowerCase();
    const promptGenerator = summaryPrompts[systemKey];
    
    if (!promptGenerator) {
      throw new Error(`未找到${system}系统的提示词配置`);
    }

    // 收集适用于当前系统的额外说明
    const relevantNotes = additionalNotes.value
      .filter(note => note.systems[systemKey])
      .map(note => note.content)
      .join('\n');

    const promptContent = promptGenerator(data) + 
      (relevantNotes ? `\n\n额外特殊说明，必须优先关注：\n${relevantNotes}` : '');

    const response = await aiConversation.getCompletion({
      messages: [
     
        {
          role: 'user',
          content: promptContent
        }
      ]
    });

    if (!response || !response.content) {
      throw new Error('AI 响应异常');
    }

    return response.content.trim();
  } catch (error) {
    console.error(`生成${system}总结失败:`, error);
    throw new Error(`生成${system}系统总结时发生错误: ${error.message}`);
  }
};

// 添加开始生成总结的方法
const startGeneratingSummaries = async () => {
  showSummaryPreparation.value = false;
  await generateAllSummaries();
};

// 在组件挂载时初始化
onMounted(() => {
  initializeQuestions();
});
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
</style>