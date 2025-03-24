<template>
  <div class="test-container">
    <h3>测试浮动窗口组件</h3>
    
    <v-window 
      v-model:isFloating="isFloating" 
      :component-def="TaskManager" 
      title="任务管理器" 
      :tasks="tasks"
      :theme="currentTheme"
      @task-added="handleTaskAdded"
      @task-removed="handleTaskRemoved"
      @task-toggled="handleTaskToggled"
      @data-updated="handleDataUpdate"
    />
    
    <div class="controls">
      <button @click="toggleFloat">{{ isFloating ? '收回窗口' : '弹出窗口' }}</button>
      <button @click="addRandomTask">添加随机任务</button>
      <button @click="toggleTheme">切换主题</button>
    </div>
    
    <div class="stats">
      <p>当前任务数量: {{ tasks.length }}</p>
      <p>已完成任务: {{ completedCount }}</p>
      <p>主题: {{ currentTheme }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, h } from 'vue';
import VWindow from '../../components/VWindow.vue';

// 状态管理
const isFloating = ref(false);
const tasks = ref([
  { id: 1, text: '学习 Vue 3', completed: false },
  { id: 2, text: '测试浮动窗口', completed: true },
  { id: 3, text: '实现组件序列化', completed: false }
]);
const currentTheme = ref('light');

// 计算属性
const completedCount = computed(() => 
  tasks.value.filter(task => task.completed).length
);

// 事件处理函数
const toggleFloat = () => {
  isFloating.value = !isFloating.value;
};

const addRandomTask = () => {
  const randomTasks = [
    '优化性能',
    '修复错误',
    '重构代码',
    '编写测试',
    '更新文档',
    '设计界面'
  ];
  
  const randomId = Date.now();
  const randomText = randomTasks[Math.floor(Math.random() * randomTasks.length)];
  
  tasks.value.push({
    id: randomId,
    text: randomText,
    completed: false
  });
};

const toggleTheme = () => {
  currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light';
};

const handleTaskAdded = (newTask) => {
  tasks.value.push(newTask);
  console.log('任务已添加:', newTask);
};

const handleTaskRemoved = (taskId) => {
  tasks.value = tasks.value.filter(task => task.id !== taskId);
  console.log('任务已删除:', taskId);
};

const handleTaskToggled = (taskId) => {
  const task = tasks.value.find(t => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    console.log('任务状态已切换:', taskId, task.completed);
  }
};

const handleDataUpdate = (data) => {
  console.log('窗口数据更新:', data);
};

// 复杂组件定义 - 使用函数式组件
const TaskManager = (props, { emit }) => {
  // 内部状态
  let newTaskText = ref('');
  
  // 样式对象 - 根据主题变化
  const getStyles = (theme) => ({
    container: {
      padding: '16px',
      backgroundColor: theme === 'light' ? '#ffffff' : '#333333',
      color: theme === 'light' ? '#333333' : '#ffffff',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.3s ease'
    },
    header: {
      marginBottom: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    taskInput: {
      display: 'flex',
      marginBottom: '16px',
      gap: '8px'
    },
    input: {
      flex: 1,
      padding: '8px 12px',
      borderRadius: '4px',
      border: theme === 'light' ? '1px solid #ddd' : '1px solid #555',
      backgroundColor: theme === 'light' ? '#fff' : '#444',
      color: theme === 'light' ? '#333' : '#fff'
    },
    button: {
      padding: '8px 16px',
      borderRadius: '4px',
      border: 'none',
      backgroundColor: '#0078d7',
      color: '#fff',
      cursor: 'pointer'
    },
    list: {
      listStyle: 'none',
      padding: 0,
      margin: 0
    },
    taskItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 8px',
      borderBottom: theme === 'light' ? '1px solid #eee' : '1px solid #444',
      transition: 'background-color 0.2s'
    },
    taskText: (completed) => ({
      textDecoration: completed ? 'line-through' : 'none',
      opacity: completed ? 0.6 : 1
    }),
    actions: {
      display: 'flex',
      gap: '8px'
    }
  });
  
  // 添加新任务
  const addTask = () => {
    if (newTaskText.value.trim() === '') return;
    
    const newTask = {
      id: Date.now(),
      text: newTaskText.value.trim(),
      completed: false
    };
    
    emit('task-added', newTask);
    newTaskText.value = '';
  };
  
  // 删除任务
  const removeTask = (taskId) => {
    emit('task-removed', taskId);
  };
  
  // 切换任务状态
  const toggleTask = (taskId) => {
    emit('task-toggled', taskId);
  };
  
  // 渲染任务列表
  const renderTasks = (tasks, styles) => {
    if (!tasks || !tasks.length) {
      return h('div', { style: { textAlign: 'center', padding: '20px' } }, '暂无任务');
    }
    
    return h('ul', { style: styles.list }, 
      tasks.map(task => h('li', { 
        key: task.id,
        style: styles.taskItem
      }, [
        h('span', { 
          style: styles.taskText(task.completed),
          onClick: () => toggleTask(task.id)
        }, task.text),
        h('div', { style: styles.actions }, [
          h('button', { 
            style: {
              ...styles.button,
              backgroundColor: task.completed ? '#28a745' : '#6c757d'
            },
            onClick: () => toggleTask(task.id)
          }, task.completed ? '已完成' : '未完成'),
          h('button', { 
            style: {
              ...styles.button,
              backgroundColor: '#dc3545'
            },
            onClick: () => removeTask(task.id)
          }, '删除')
        ])
      ]))
    );
  };
  
  // 主渲染函数
  const styles = getStyles(props.theme || 'light');
  
  return h('div', { style: styles.container }, [
    h('div', { style: styles.header }, [
      h('h3', null, '任务管理器'),
      h('span', null, `共 ${props.tasks.length} 个任务`)
    ]),
    h('div', { style: styles.taskInput }, [
      h('input', {
        style: styles.input,
        value: newTaskText.value,
        placeholder: '输入新任务...',
        onChange: (e) => { newTaskText.value = e.target.value }
      }),
      h('button', {
        style: styles.button,
        onClick: addTask
      }, '添加')
    ]),
    renderTasks(props.tasks, styles)
  ]);
};
</script>

<style scoped>
.test-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.controls {
  margin: 20px 0;
  display: flex;
  gap: 10px;
}

.controls button {
  padding: 8px 16px;
  background-color: #0078d7;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.stats {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 6px;
  margin-top: 20px;
}
</style>