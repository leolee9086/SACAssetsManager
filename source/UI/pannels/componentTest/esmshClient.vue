<template>
  <div class="component-test">
    <div class="input-section">
      <input 
        v-model="packageName" 
        placeholder="请输入包名"
        @keyup.enter="handleAnalyze"
        class="package-input"
      >
      <button class="analyze-btn" @click="handleAnalyze">分析依赖</button>
    </div>
    
    <div class="result-section" v-if="dependencies.length">
      <h3>依赖列表：</h3>
      <div class="dependency-tree">
        <tree-node
          v-for="dep in dependencies"
          :key="dep.id"
          :node="dep"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { init, parse } from '../../../../static/esModuleLexer.js';
import MagicString from '../../../../static/magic-string.mjs';
import { defineComponent, h } from 'vue';

// 修改 TreeNode 组件定义为 defineComponent 形式
const TreeNode = defineComponent({
  name: 'TreeNode',
  props: {
    node: {
      type: Object,
      required: true,
      default: () => ({})
    }
  },
  setup(props) {
    return () => h('div', { class: 'tree-node' }, [
      h('div', { class: 'node-content' }, [
        h('span', { class: 'node-name' }, props.node.name),
        h('span', { 
          class: ['status-tag', props.node.status || 'pending']
        }, (props.node.status || 'pending') === 'success' ? '已下载' : '未下载')
      ]),
      props.node.deps?.length ? h('div', { class: 'node-children' },
        props.node.deps.map(child => h(TreeNode, {
          key: child.id,
          node: child
        }))
      ) : null
    ]);
  }
});

// 响应式状态
const packageName = ref('');
const dependencies = ref([]);
const baseUrl = 'https://esm.sh';

// 方法定义
const handleAnalyze = async () => {
  if (!packageName.value) {
    alert('请输入包名');
    return;
  }
  
  try {
    await analyzeDependencies(packageName.value);
  } catch (error) {
    alert(`分析依赖失败：${error.message}`);
  }
};

const analyzeDependencies = async (pkgName, parentId = null) => {
  // 检查是否已存在该依赖
  const existingDep = findDependency(pkgName);
  if (existingDep) return;

  // 创建新的依赖节点
  const depNode = {
    id: Date.now() + Math.random(),
    name: pkgName,
    status: 'pending',
    deps: []
  };

  // 修复：确保响应式更新
  if (parentId) {
    addDependencyToParent(parentId, depNode);
  } else {
    dependencies.value = [...dependencies.value, depNode];
  }

  try {
    await init;
    const normalizedPkgName = pkgName.replace(/^\/+/, '');
    const entryUrl = `${baseUrl}/${normalizedPkgName}`;
    
    const response = await fetch(entryUrl);
    
    if (!response.ok) {
      // 修复：创建新的依赖树副本来触发更新
      dependencies.value = dependencies.value.map(dep => ({
        ...dep,
        deps: [...dep.deps]
      }));
      throw new Error(`无法下载 ${pkgName}`);
    }

    const content = await response.text();
    
    // 修复：更新状态并创建新的依赖树副本
    const updateNode = (nodes) => {
      return nodes.map(node => {
        if (node.id === depNode.id) {
          return { ...node, status: 'success' };
        }
        if (node.deps.length) {
          return { ...node, deps: updateNode(node.deps) };
        }
        return node;
      });
    };
    
    dependencies.value = updateNode(dependencies.value);

    const magicString = new MagicString(content);
    const [imports] = parse(content);

    const depSet = new Set();
    for (const imp of imports) {
      const importStatement = magicString.slice(imp.s, imp.e);
      const moduleName = importStatement.replace(/^['"]|['"]$/g, '');
      if (!moduleName.startsWith('.')) {
        depSet.add(moduleName);
      }
    }

    for (const dep of depSet) {
      await analyzeDependencies(dep, depNode.id);
    }
  } catch (error) {
    // 修复：更新错误状态并创建新的依赖树副本
    const updateNode = (nodes) => {
      return nodes.map(node => {
        if (node.id === depNode.id) {
          return { ...node, status: 'error' };
        }
        if (node.deps.length) {
          return { ...node, deps: updateNode(node.deps) };
        }
        return node;
      });
    };
    
    dependencies.value = updateNode(dependencies.value);
    console.error(`处理 ${pkgName} 时出错:`, error);
  }
};

const findDependency = (name, deps = dependencies.value) => {
  for (const dep of deps) {
    if (dep.name === name) return dep;
    if (dep.deps.length) {
      const found = findDependency(name, dep.deps);
      if (found) return found;
    }
  }
  return null;
};

const addDependencyToParent = (parentId, depNode) => {
  const updateNode = (nodes) => {
    return nodes.map(node => {
      if (node.id === parentId) {
        return { ...node, deps: [...node.deps, depNode] };
      }
      if (node.deps.length) {
        return { ...node, deps: updateNode(node.deps) };
      }
      return node;
    });
  };
  
  dependencies.value = updateNode(dependencies.value);
};
</script>

<style scoped>
.component-test {
  padding: 20px;
}

.input-section {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.package-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.analyze-btn {
  padding: 8px 16px;
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.analyze-btn:hover {
  background-color: #357abd;
}

.result-section {
  margin-top: 20px;
}

.tree-node {
  margin-left: 20px;
}

.node-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.node-name {
  font-size: 14px;
}

.status-tag {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 3px;
}

.status-tag.success {
  background-color: #e6f3e6;
  color: #2c7a2c;
}

.status-tag.error {
  background-color: #fbe9e7;
  color: #c62828;
}

.status-tag.pending {
  background-color: #fff3e0;
  color: #ef6c00;
}

.node-children {
  margin-left: 20px;
}
</style>
