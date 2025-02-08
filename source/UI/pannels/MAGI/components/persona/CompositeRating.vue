<template>
  <div class="composite-rating">
    <p v-if="question.hint" class="question-hint">{{ question.hint }}</p>
    <div class="sub-questions">
      <div v-for="(subQuestion, index) in question.subQuestions" :key="index" class="sub-question">
        <p>{{ subQuestion.text }}</p>
        <div class="options">
          <div v-for="(option, optIndex) in subQuestion.options" :key="optIndex" class="option-item"
            :class="{ 'selected': subQuestion.selectedOptionIndex === optIndex }"
            @click="selectOption(subQuestion, optIndex)">
            {{ option }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- 添加评分显示 -->
    <div v-if="showScore" class="score-display">
      <div class="score-label">综合评分：</div>
      <div class="score-value">{{ currentScore }}%</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  question: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:question', 'update:score']);

const currentScore = ref(0);

const showScore = computed(() => {
  return props.question.subQuestions.every(subQ => subQ.selectedOptionIndex !== undefined);
});

const selectOption = (subQuestion, optionIndex) => {
  subQuestion.selectedOptionIndex = optionIndex;
  emit('update:question', props.question);
  calculateScore();
};

const calculateScore = () => {
  const answers = props.question.subQuestions
    .filter(subQ => subQ.selectedOptionIndex !== undefined)
    .map(subQ => ({
      selectedOptionIndex: subQ.selectedOptionIndex,
      weight: subQ.weight || 1
    }));

  if (answers.length === 0) return;

  const scores = answers.map(answer => answer.selectedOptionIndex * answer.weight);
  const totalWeight = answers.reduce((sum, answer) => sum + answer.weight, 0);
  const weightedSum = scores.reduce((sum, score) => sum + score, 0);
  currentScore.value = Math.round((weightedSum / (totalWeight * 4)) * 100);

  emit('update:score', currentScore.value);
};
</script>

<style scoped>
.composite-rating {
  margin: 1rem 0;
}

.sub-questions {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.sub-question {
  background: rgba(0, 255, 255, 0.05);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 255, 0.2);
}

.options {
  display: flex;
  gap: 0.8rem;
  margin-top: 0.8rem;
  flex-wrap: wrap;
}

.option-item {
  padding: 0.6rem 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-item:hover {
  background: rgba(0, 255, 255, 0.1);
  border-color: #0ff;
}

.option-item.selected {
  background: rgba(0, 255, 255, 0.2);
  border-color: #0ff;
  box-shadow: 0 0 8px rgba(0, 255, 255, 0.3);
}

.question-hint {
  color: rgba(0, 255, 255, 0.7);
  font-style: italic;
  margin-bottom: 1rem;
}

.score-display {
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.score-label {
  color: rgba(0, 255, 255, 0.8);
  font-weight: bold;
}

.score-value {
  color: #0ff;
  font-size: 1.2rem;
  font-weight: bold;
}
</style> 