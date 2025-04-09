<template>
  <div class="global-controls">
    <div class="section-title">基本设置</div>
    <div class="control-row">
      <div class="control-group">
        <label>画布:</label>
        <div class="size-inputs">
          <input type="number" :value="width" @input="updateWidth" min="100" max="1000" step="10">
          <span>×</span>
          <input type="number" :value="height" @input="updateHeight" min="100" max="1000" step="10">
        </div>
      </div>
      
      <div class="control-group">
        <label>默认宽度:</label>
        <input type="range" :value="defaultWidth" @input="updateDefaultWidth" min="5" max="100" step="5">
        <span>{{ defaultWidth }}</span>
        <button @click="$emit('reset-all')" class="mini-btn">重置</button>
      </div>
    </div>
    
    <div class="switch-row">
      <div class="switch-group">
        <label>中轴对称</label>
        <div class="switch-container">
          <input type="checkbox" id="symmetrySwitch" :checked="symmetry" @change="toggleSymmetry">
          <label for="symmetrySwitch" class="switch-label"></label>
        </div>
      </div>
      
      <div class="switch-group">
        <label>平铺预览</label>
        <div class="switch-container">
          <input type="checkbox" id="previewSwitch" :checked="preview" @change="togglePreview">
          <label for="previewSwitch" class="switch-label"></label>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GlobalSettings',
  props: {
    width: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    },
    defaultWidth: {
      type: Number,
      required: true
    },
    symmetry: {
      type: Boolean,
      default: false
    },
    preview: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    updateWidth(event) {
      this.$emit('update:width', parseInt(event.target.value, 10) || 100);
    },
    updateHeight(event) {
      this.$emit('update:height', parseInt(event.target.value, 10) || 100);
    },
    updateDefaultWidth(event) {
      this.$emit('update:defaultWidth', parseInt(event.target.value, 10) || 5);
    },
    toggleSymmetry(event) {
      this.$emit('update:symmetry', event.target.checked);
    },
    togglePreview(event) {
      this.$emit('update:preview', event.target.checked);
    }
  }
}
</script>

<style scoped>
.global-controls {
  background-color: white;
  border-radius: 4px;
  padding: 12px;
  border: 1px solid #eee;
}

.section-title {
  font-weight: bold;
  margin-bottom: 10px;
  padding-bottom: 4px;
  border-bottom: 1px solid #eee;
  font-size: 14px;
}

.control-row {
  display: flex;
  gap: 15px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.control-group {
  flex: 1;
  min-width: 180px;
  display: flex;
  align-items: center;
}

.size-inputs {
  display: flex;
  align-items: center;
  gap: 5px;
}

.size-inputs input[type="number"] {
  width: 60px;
  padding: 3px 6px;
  border: 1px solid #ddd;
  border-radius: 3px;
}

.switch-row {
  display: flex;
  gap: 15px;
}

.switch-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.switch-container {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}

.switch-container input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 20px;
}

.switch-label:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .switch-label {
  background-color: #1890ff;
}

input:checked + .switch-label:before {
  transform: translateX(20px);
}

.control-group label {
  width: 70px;
  display: inline-block;
  font-size: 14px;
  white-space: nowrap;
}

.control-group input[type="range"] {
  flex: 1;
  max-width: 120px;
  margin: 0 8px;
}

.mini-btn {
  padding: 1px 5px;
  border: 1px solid #ddd;
  background-color: #f5f5f5;
  border-radius: 3px;
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
}

.mini-btn:hover {
  background-color: #e6f7ff;
  border-color: #91d5ff;
}
</style> 