<template>
  <div class="background-controls">
    <div class="section-title">底纹设置</div>
    <div class="image-row">
      <button @click="triggerFileInput" class="mini-btn">选择图片</button>
      <input type="file" accept="image/*" @change="handleImageChange" ref="fileInput" style="display:none">
      <button @click="clearBackground" class="mini-btn" v-if="hasBackground">清除</button>
    </div>
    
    <div class="control-row" v-if="hasBackground">
      <div class="control-group">
        <label>混合:</label>
        <select v-model="blendModeValue" @change="updateBlendMode" class="blend-select">
          <option v-for="mode in blendModes" :key="mode.value" :value="mode.value">{{ mode.label }}</option>
        </select>
      </div>
      
      <div class="control-group">
        <label>透明度:</label>
        <input type="range" v-model.number="opacityValue" min="0" max="1" step="0.05" @input="updateOpacity">
        <span>{{ Math.round(opacityValue * 100) }}%</span>
      </div>
    </div>
    
    <div class="background-preview" v-if="hasBackground">
      <img :src="previewUrl" alt="底纹预览" class="preview-img" />
    </div>
  </div>
</template>

<script>
export default {
  name: 'BackgroundSettings',
  props: {
    blendMode: {
      type: String,
      default: 'normal'
    },
    opacity: {
      type: Number,
      default: 1
    },
    blendModes: {
      type: Array,
      required: true
    },
    hasBackground: {
      type: Boolean,
      default: false
    },
    previewUrl: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      blendModeValue: this.blendMode,
      opacityValue: this.opacity
    }
  },
  watch: {
    blendMode(newVal) {
      this.blendModeValue = newVal;
    },
    opacity(newVal) {
      this.opacityValue = newVal;
    }
  },
  methods: {
    handleImageChange(event) {
      this.$emit('image-change', event);
    },
    clearBackground() {
      this.$emit('clear-background');
    },
    updateBlendMode() {
      this.$emit('update:blendMode', this.blendModeValue);
    },
    updateOpacity() {
      this.$emit('update:opacity', this.opacityValue);
    },
    triggerFileInput() {
      this.$refs.fileInput.click();
    }
  }
}
</script>

<style scoped>
.background-controls {
  background-color: white;
  border-radius: 4px;
  padding: 12px;
  border: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  font-weight: bold;
  margin-bottom: 10px;
  padding-bottom: 4px;
  border-bottom: 1px solid #eee;
  font-size: 14px;
}

.image-row {
  display: flex;
  gap: 8px;
  margin-bottom: 5px;
}

.control-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.control-group {
  flex: 1;
  min-width: 180px;
  display: flex;
  align-items: center;
}

.control-group label {
  width: 50px;
  display: inline-block;
  font-size: 14px;
  white-space: nowrap;
}

.control-group input[type="range"] {
  flex: 1;
  max-width: 120px;
  margin: 0 8px;
}

.blend-select {
  padding: 3px 6px;
  border: 1px solid #ddd;
  border-radius: 3px;
  background-color: white;
  min-width: 100px;
}

.background-preview {
  margin-top: 5px;
  border: 1px solid #eee;
  padding: 5px;
  border-radius: 4px;
}

.preview-img {
  width: 100%;
  height: auto;
  max-height: 120px;
  object-fit: contain;
  border-radius: 2px;
}

.mini-btn {
  padding: 3px 8px;
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