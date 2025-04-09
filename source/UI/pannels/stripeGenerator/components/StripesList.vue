<template>
  <div class="stripes-editor">
    <div class="editor-header">
      <div class="section-title">条纹设置 <span class="count-badge">{{ stripes.length }}</span></div>
      <div class="header-actions">
        <button @click="$emit('add-stripe')" class="icon-btn success-btn" title="添加新条纹">+</button>
        <button @click="$emit('reverse-stripes')" class="icon-btn" title="反向排序">⇅</button>
        <button @click="$emit('move-all', 'up')" class="icon-btn" title="上移全部">⟲</button>
        <button @click="$emit('move-all', 'down')" class="icon-btn" title="下移全部">⟳</button>
      </div>
    </div>
    
    <div class="control-group stripe-opacity-control">
      <label>条纹透明度:</label>
      <input type="range" v-model.number="opacityValue" min="0" max="1" step="0.05" @input="updateOpacity">
      <span>{{ Math.round(opacityValue * 100) }}%</span>
    </div>
    
    <div class="stripes-list">
      <div v-for="(_, index) in stripes" :key="`stripe-${index}`" class="stripe-row">
        <div class="stripe-preview" :style="{ backgroundColor: stripeColors[index], width: `${computeStripePercent(index)}%` }"></div>
        <span class="stripe-index">{{ index + 1 }}</span>
        <div class="col-color">
          <input type="color" v-model="stripeColors[index]" @change="colorChanged" @click.right.prevent="pickColor(index)" title="左键选择颜色，右键屏幕取色">
        </div>
        <div class="col-width">
          <input type="range" v-model.number="stripes[index]" min="5" max="200" step="5" @change="widthChanged">
          <div class="width-info">
            <span>{{ stripes[index] }}px</span>
            <span class="stripe-percent">{{ computeStripePercent(index) }}%</span>
          </div>
        </div>
        <div class="action-group">
          <button @click="$emit('move-stripe', index, 'up')" class="icon-btn" title="上移此条纹" v-if="index > 0">↑</button>
          <button @click="$emit('move-stripe', index, 'down')" class="icon-btn" title="下移此条纹" v-if="index < stripes.length - 1">↓</button>
          <button @click="$emit('reset-width', index)" class="icon-btn" title="重置到默认宽度">↺</button>
          <button @click="$emit('duplicate-stripe', index)" class="icon-btn" title="复制此条纹">⎘</button>
          <button @click="$emit('add-stripe-after', index)" class="icon-btn" title="在此条纹后插入">⊕</button>
          <button @click="$emit('remove-stripe', index)" class="icon-btn danger-btn" title="删除此条纹" v-if="stripes.length > 1">✕</button>
        </div>
      </div>
      <div v-if="stripes.length === 0" class="empty-list">
        <p>没有条纹，请添加一些条纹</p>
        <button @click="$emit('add-stripe')" class="action-btn">添加条纹</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StripesList',
  props: {
    stripes: {
      type: Array,
      required: true
    },
    stripeColors: {
      type: Array,
      required: true
    },
    stripeOpacity: {
      type: Number,
      default: 1
    }
  },
  emits: [
    'add-stripe',
    'add-stripe-after',
    'reverse-stripes',
    'move-stripe',
    'move-all',
    'reset-width',
    'duplicate-stripe',
    'remove-stripe',
    'pick-color',
    'stripe-width-changed',
    'stripe-color-changed',
    'update:stripe-opacity'
  ],
  data() {
    return {
      opacityValue: this.stripeOpacity
    }
  },
  watch: {
    stripeOpacity(newVal) {
      this.opacityValue = newVal;
    }
  },
  methods: {
    computeStripePercent(index) {
      const totalWidth = this.stripes.reduce((sum, width) => sum + width, 0);
      if (totalWidth === 0) return 0;
      
      const percent = (this.stripes[index] / totalWidth) * 100;
      return percent.toFixed(1);
    },
    
    async pickColor(index) {
      this.$emit('pick-color', index);
    },
    
    widthChanged() {
      this.$emit('stripe-width-changed');
    },
    
    colorChanged() {
      this.$emit('stripe-color-changed');
    },
    
    updateOpacity() {
      this.$emit('update:stripe-opacity', this.opacityValue);
    }
  }
}
</script>

<style scoped>
.stripes-editor {
  background-color: white;
  border-radius: 4px;
  padding: 15px;
  border: 1px solid #eee;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.header-actions {
  display: flex;
  gap: 5px;
}

.stripe-opacity-control {
  margin-bottom: 15px;
  padding: 6px 10px;
  background-color: #f9f9f9;
  border-radius: 4px;
  border: 1px solid #eee;
}

.control-group {
  display: flex;
  align-items: center;
}

.control-group label {
  width: 80px;
  display: inline-block;
  font-size: 14px;
  white-space: nowrap;
}

.control-group input[type="range"] {
  flex: 1;
  max-width: 150px;
  margin: 0 10px;
}

.control-group span {
  min-width: 40px;
  text-align: right;
  font-size: 13px;
}

.section-title {
  font-weight: bold;
  margin-bottom: 15px;
  padding-bottom: 5px;
  border-bottom: 1px solid #eee;
  font-size: 14px;
}

.count-badge {
  background-color: #1890ff;
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 12px;
  margin-left: 5px;
  display: inline-block;
}

.stripes-list {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 15px;
  padding-right: 5px;
}

.stripe-row {
  display: flex;
  align-items: center;
  padding: 5px 0;
  margin-bottom: 3px;
  position: relative;
  border-radius: 4px;
  background-color: white;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  overflow: hidden;
}

.stripe-row:hover {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stripe-preview {
  position: absolute;
  top: 0;
  left: 0;
  height: 4px;
  min-width: 5px;
  background-color: red;
  transition: width 0.3s ease;
}

.stripe-index {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #666;
  margin: 0 5px 0 5px;
  flex-shrink: 0;
}

.col-color {
  display: flex;
  align-items: center;
  min-width: 40px;
  position: relative;
}

.col-color input[type="color"] {
  width: 24px;
  height: 24px;
  margin: 0 5px;
  border: 1px solid #ddd;
  border-radius: 3px;
  padding: 0;
  cursor: pointer;
}

.col-color input[type="color"]:hover {
  border-color: #1890ff;
}

.col-width {
  display: flex;
  align-items: center;
  flex: 1;
  margin: 0 5px;
}

.col-width input[type="range"] {
  flex: 1;
  min-width: 60px;
  max-width: 120px;
  margin-right: 8px;
}

.width-info {
  display: flex;
  flex-direction: column;
  min-width: 60px;
}

.width-info span {
  font-size: 12px;
  line-height: 1.2;
}

.stripe-percent {
  color: #888;
  font-size: 10px;
}

.action-group {
  display: flex;
  gap: 2px;
  margin-left: auto;
  padding-right: 5px;
}

.icon-btn {
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid #ddd;
  background-color: #f5f5f5;
  border-radius: 3px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.icon-btn:hover {
  background-color: #e6f7ff;
  border-color: #91d5ff;
}

.success-btn {
  background-color: #f6ffed;
  border-color: #b7eb8f;
  color: #52c41a;
}

.success-btn:hover {
  background-color: #f6ffed;
  border-color: #73d13d;
}

.danger-btn {
  background-color: #fff1f0;
  border-color: #ffccc7;
  color: #f5222d;
}

.danger-btn:hover {
  background-color: #fff1f0;
  border-color: #ff7875;
}

.empty-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 0;
  color: #999;
  gap: 15px;
}

.action-btn {
  padding: 5px 12px;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 13px;
}

.action-btn:hover {
  background-color: #40a9ff;
}
</style> 