<template>
  <div class="markdown-input-control">
    <div class="input-header">
      <div class="input-label">{{ label }}</div>
      <div class="tab-toggle">
        <button 
          :class="['tab-button', { active: currentTab === 'edit' }]" 
          @click="currentTab = 'edit'"
        >
          编辑
        </button>
        <button 
          :class="['tab-button', { active: currentTab === 'preview' }]" 
          @click="currentTab = 'preview'"
        >
          预览
        </button>
      </div>
    </div>
    
    <div class="content-area">
      <textarea 
        v-if="currentTab === 'edit'"
        :value="inputValue" 
        @input="handleInput" 
        class="b3-text-field markdown-textarea" 
        :placeholder="placeholder"
        :rows="rows"
      ></textarea>
      
      <div 
        v-else 
        class="markdown-preview"
        v-html="renderedMarkdown"
      ></div>
    </div>
  </div>
</template>

<script nodeDefine>
import { ref, computed } from 'vue';
const inputValue = ref('')
const outputText = ref('')
const currentTab = ref('edit')

//这个函数可以在定义函数模式下没有执行时输入时的输入
export const getDefaultInput=()=>{
  return outputText
}

// 简单的Markdown渲染函数
const renderMarkdown = (text) => {
  if (!text) return '';
  
  // 转义HTML特殊字符
  const escapeHtml = (str) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };
  
  // 简单的Markdown解析
  return escapeHtml(text)
    // 标题
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    // 加粗和斜体
    .replace(/\*\*(.*?)\*\*/gm, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gm, '<em>$1</em>')
    // 链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gm, '<a href="$2" target="_blank">$1</a>')
    // 无序列表
    .replace(/^\s*-\s+(.*$)/gm, '<li>$1</li>')
    // 代码块和行内代码
    .replace(/```([^`]+)```/gm, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/gm, '<code>$1</code>')
    // 换行
    .replace(/\n/gm, '<br>');
};

// 渲染后的Markdown
const renderedMarkdown = computed(() => {
  return renderMarkdown(inputValue.value);
});

const nodeDefine = {
  geom: {
    size: 'fixed',
    width: 300,
    height: 250,
  },
  type:'start',
  outputs: {
    "markdown": {
      type: "string",
      default: '',
      side:'right'
    },
    "html": {
      type: "string",
      default: '',
      side:'right'
    }
  },
  process(input) {
    const text = input.value || input;
    outputText.value = text;
    
    return {
      markdown: text,
      html: renderMarkdown(text)
    }
  }
}
</script>

<script setup>
import { defineProps, defineEmits, watch, ref as vueRef } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: 'Markdown'
  },
  placeholder: {
    type: String,
    default: '请输入Markdown文本...'
  },
  rows: {
    type: Number,
    default: 10
  }
});

const emit = defineEmits(['update:modelValue']);

watch(outputText, () => {
  if(outputText.value !== inputValue.value){
    inputValue.value = outputText.value
  }
});

const handleInput = (e) => {
  const value = e.target.value;
  nodeDefine.process({value});
};
</script>

<style scoped>
.markdown-input-control {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  height: 100%;
  width: 100%;
  padding: 8px;
}

.input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.input-label {
  font-size: 14px;
  color: var(--b3-theme-on-surface);
}

.tab-toggle {
  display: flex;
  gap: 4px;
}

.tab-button {
  padding: 2px 8px;
  font-size: 12px;
  border: 1px solid var(--b3-border-color);
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
}

.tab-button.active {
  background: var(--b3-theme-primary);
  color: white;
  border-color: var(--b3-theme-primary);
}

.content-area {
  flex: 1;
  border: 1px solid var(--b3-border-color);
  border-radius: 4px;
  overflow: auto;
}

.markdown-textarea {
  height: 100%;
  width: 100%;
  resize: none;
  border: none;
  padding: 8px;
  font-family: var(--b3-font-family-code);
}

.markdown-preview {
  padding: 8px;
  overflow: auto;
  height: 100%;
}

/* Markdown预览样式 */
.markdown-preview :deep(h1) {
  font-size: 1.8em;
  margin: 0.5em 0;
}

.markdown-preview :deep(h2) {
  font-size: 1.5em;
  margin: 0.5em 0;
}

.markdown-preview :deep(h3) {
  font-size: 1.2em;
  margin: 0.5em 0;
}

.markdown-preview :deep(code) {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 4px;
  border-radius: 3px;
  font-family: var(--b3-font-family-code);
}

.markdown-preview :deep(pre) {
  background: rgba(0, 0, 0, 0.05);
  padding: 8px;
  border-radius: 4px;
  overflow: auto;
}

.markdown-preview :deep(pre code) {
  background: none;
  padding: 0;
}

.markdown-preview :deep(a) {
  color: var(--b3-theme-primary);
  text-decoration: none;
}

.markdown-preview :deep(a:hover) {
  text-decoration: underline;
}
</style> 