<template>
  <div class="download-options">
    <button @click="$emit('download')" class="action-btn">
      <span class="icon">↓</span> 下载条纹贴图
    </button>
    <div class="download-settings">
      <div class="control-group">
        <label>文件格式:</label>
        <select v-model="formatValue" @change="updateFormat">
          <option value="png">PNG</option>
          <option value="jpeg">JPEG</option>
          <option value="webp">WebP</option>
        </select>
      </div>
      <div class="control-group" v-if="formatValue === 'jpeg' || formatValue === 'webp'">
        <label>质量:</label>
        <input type="range" v-model.number="qualityValue" min="0.1" max="1" step="0.1" @input="updateQuality">
        <span>{{ Math.round(qualityValue * 100) }}%</span>
      </div>
      <div class="control-group">
        <label>文件名:</label>
        <input type="text" v-model="filenameValue" @input="updateFilename" placeholder="条纹贴图">
      </div>
      <div class="control-group">
        <label>自定义尺寸:</label>
        <div class="switch-container">
          <input type="checkbox" id="customSizeSwitch" v-model="useCustomSizeValue" @change="updateUseCustomSize">
          <label for="customSizeSwitch" class="switch-label"></label>
        </div>
      </div>
      <div v-if="useCustomSizeValue" class="custom-size-controls">
        <div class="control-group">
          <label>宽度:</label>
          <input type="number" v-model.number="customWidthValue" @input="updateCustomWidth" min="10" max="4096">
          <span>px</span>
        </div>
        <div class="control-group">
          <label>高度:</label>
          <input type="number" v-model.number="customHeightValue" @input="updateCustomHeight" min="10" max="4096">
          <span>px</span>
        </div>
        <div class="control-group">
          <label>保持比例:</label>
          <div class="switch-container">
            <input type="checkbox" id="aspectRatioSwitch" v-model="keepRatioValue" @change="updateKeepRatio">
            <label for="aspectRatioSwitch" class="switch-label"></label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DownloadOptions',
  props: {
    format: {
      type: String,
      default: 'png'
    },
    quality: {
      type: Number,
      default: 0.8
    },
    filename: {
      type: String,
      default: '条纹贴图'
    },
    useCustomSize: {
      type: Boolean,
      default: false
    },
    customWidth: {
      type: Number,
      default: 500
    },
    customHeight: {
      type: Number,
      default: 300
    },
    keepAspectRatio: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      formatValue: this.format,
      qualityValue: this.quality,
      filenameValue: this.filename,
      useCustomSizeValue: this.useCustomSize,
      customWidthValue: this.customWidth,
      customHeightValue: this.customHeight,
      keepRatioValue: this.keepAspectRatio
    }
  },
  watch: {
    format(newVal) {
      this.formatValue = newVal;
    },
    quality(newVal) {
      this.qualityValue = newVal;
    },
    filename(newVal) {
      this.filenameValue = newVal;
    },
    useCustomSize(newVal) {
      this.useCustomSizeValue = newVal;
    },
    customWidth(newVal) {
      this.customWidthValue = newVal;
    },
    customHeight(newVal) {
      this.customHeightValue = newVal;
    },
    keepAspectRatio(newVal) {
      this.keepRatioValue = newVal;
    }
  },
  methods: {
    updateFormat() {
      this.$emit('update:format', this.formatValue);
    },
    updateQuality() {
      this.$emit('update:quality', this.qualityValue);
    },
    updateFilename() {
      this.$emit('update:filename', this.filenameValue);
    },
    updateUseCustomSize() {
      this.$emit('update:useCustomSize', this.useCustomSizeValue);
    },
    updateCustomWidth() {
      this.$emit('update:customWidth', this.customWidthValue);
    },
    updateCustomHeight() {
      this.$emit('update:customHeight', this.customHeightValue);
    },
    updateKeepRatio() {
      this.$emit('update:keepAspectRatio', this.keepRatioValue);
    }
  }
}
</script>

<style scoped>
.download-options {
  margin-top: 15px;
  border: 1px solid #eee;
  padding: 15px;
  border-radius: 4px;
  background-color: #f9f9f9;
}

.download-settings {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px dashed #ddd;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 8px 16px;
  font-size: 14px;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.action-btn:hover {
  background-color: #40a9ff;
}

.icon {
  margin-right: 6px;
  font-weight: bold;
}

.control-group {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  margin-bottom: 10px;
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

select {
  padding: 4px 8px;
  border-radius: 3px;
  border: 1px solid #ddd;
  background-color: white;
}

input[type="text"] {
  padding: 5px 8px;
  border-radius: 3px;
  border: 1px solid #ddd;
  width: 150px;
}

.custom-size-controls {
  margin-top: 15px;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 4px;
  background-color: white;
}

.custom-size-controls .control-group {
  margin-bottom: 10px;
}

.custom-size-controls .control-group label {
  width: 80px;
  display: inline-block;
  font-size: 13px;
}

.custom-size-controls .control-group input[type="number"] {
  width: 120px;
  margin: 0 8px;
}

.custom-size-controls .control-group span {
  margin-left: 8px;
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
</style> 