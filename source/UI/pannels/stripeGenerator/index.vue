<template>
    <div class="stripe-pattern-container">
      <div class="layout">
        <div class="canvas-area">
          <canvas ref="canvasRef" :width="canvasWidth" :height="canvasHeight"></canvas>
          <div class="preview-container" v-if="showPreview">
            <div class="preview-title">平铺预览:</div>
            <div class="preview" :style="previewStyle"></div>
          </div>
          
          <DownloadOptions
            :format="downloadFormat"
            :quality="downloadQuality"
            :filename="fileName"
            :use-custom-size="useCustomSize"
            :custom-width="customWidth"
            :custom-height="customHeight"
            :keep-aspect-ratio="keepAspectRatio"
            @update:format="downloadFormat = $event"
            @update:quality="downloadQuality = $event"
            @update:filename="fileName = $event"
            @update:use-custom-size="useCustomSize = $event"
            @update:custom-width="customWidth = $event"
            @update:custom-height="customHeight = $event"
            @update:keep-aspect-ratio="keepAspectRatio = $event"
            @download="downloadTexture"
          />
        </div>
        
        <div class="controls-area">
          <GlobalSettings
            :width="canvasWidth"
            :height="canvasHeight"
            :default-width="defaultStripeWidth"
            :symmetry="symmetryEnabled"
            :preview="showPreview"
            @update:width="canvasWidth = $event"
            @update:height="canvasHeight = $event"
            @update:default-width="defaultStripeWidth = $event"
            @update:symmetry="symmetryEnabled = $event"
            @update:preview="showPreview = $event"
            @reset-all="resetAllStripeWidths"
          />
          
          <BackgroundSettings
            :blend-mode="blendMode"
            :opacity="backgroundOpacity"
            :blend-modes="availableBlendModes"
            :has-background="!!backgroundImage"
            :preview-url="backgroundPreviewUrl"
            @update:blend-mode="blendMode = $event"
            @update:opacity="backgroundOpacity = $event"
            @image-change="handleBackgroundImage"
            @clear-background="clearBackground"
          />
          
          <StripesList
            :stripes="stripeWidths"
            :stripe-colors="stripeColors"
            :stripe-opacity="stripeOpacity"
            @update:stripe-opacity="stripeOpacity = $event"
            @add-stripe="insertStripeAfter(-1)"
            @add-stripe-after="insertStripeAfter"
            @reverse-stripes="reverseStripes"
            @move-stripe="moveStripe"
            @move-all="moveAllStripes"
            @reset-width="resetStripeWidth"
            @duplicate-stripe="duplicateStripe"
            @remove-stripe="removeStripe"
            @pick-color="pickColor"
            @stripe-width-changed="drawStripes"
            @stripe-color-changed="drawStripes"
          />
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { ref, computed } from 'vue';
  import { useStripeRenderer } from './composables/useStripeRenderer.js';
  import GlobalSettings from './components/GlobalSettings.vue';
  import BackgroundSettings from './components/BackgroundSettings.vue';
  import StripesList from './components/StripesList.vue';
  import DownloadOptions from './components/DownloadOptions.vue';
  
  export default {
    name: 'StripePattern',
    components: {
      GlobalSettings,
      BackgroundSettings,
      StripesList,
      DownloadOptions
    },
    setup() {
      // 下载选项
      const downloadFormat = ref('png');
      const downloadQuality = ref(0.8);
      const fileName = ref('条纹贴图');
      const useCustomSize = ref(false);
      const customWidth = ref(500);
      const customHeight = ref(300);
      const keepAspectRatio = ref(true);
      
      // 预览切片的显示控制
      const showPreview = ref(false);
      
      // 可用的混合模式
      const availableBlendModes = [
        { value: 'normal', label: '正常' },
        { value: 'multiply', label: '正片叠底' },
        { value: 'screen', label: '滤色' },
        { value: 'overlay', label: '叠加' },
        { value: 'darken', label: '变暗' },
        { value: 'lighten', label: '变亮' },
        { value: 'color-dodge', label: '颜色减淡' },
        { value: 'color-burn', label: '颜色加深' },
        { value: 'hard-light', label: '强光' },
        { value: 'soft-light', label: '柔光' },
        { value: 'difference', label: '差值' },
        { value: 'exclusion', label: '排除' },
        { value: 'hue', label: '色相' },
        { value: 'saturation', label: '饱和度' },
        { value: 'color', label: '颜色' },
        { value: 'luminosity', label: '亮度' }
      ];
      
      // 使用条纹渲染组合函数
      const {
        canvas, 
        width: canvasWidth, 
        height: canvasHeight,
        stripeWidth: defaultStripeWidth,
        stripeWidths,
        stripeColors,
        symmetryEnabled,
        backgroundImage,
        backgroundPreviewUrl,
        blendMode,
        backgroundOpacity,
        stripeOpacity,
        drawStripes,
        downloadTexture: doDownloadTexture,
        handleBackgroundImage: onFileChange,
        clearBackground,
        resetStripeWidth,
        resetAllStripeWidths,
        insertStripeAfter,
        duplicateStripe,
        moveStripe,
        moveAllStripes,
        reverseStripes,
        removeStripe
      } = useStripeRenderer({
        initialWidth: 500,
        initialHeight: 300,
        initialStripeWidth: 50
      });
      
      // 给canvas元素的ref起个新名字避免冲突
      const canvasRef = computed({
        get: () => canvas.value,
        set: (val) => { canvas.value = val; }
      });
      
      // 生成预览样式
      const previewStyle = computed(() => {
        if (!canvas.value) return {};
        
        return {
          backgroundImage: `url(${canvas.value.toDataURL()})`,
          backgroundSize: `100% 100%`,
          width: '100%',
          height: '100px'
        };
      });
      
      // 处理文件上传
      const handleBackgroundImage = (event) => {
        const file = event.target.files[0];
        if (file) {
          onFileChange(file);
        }
      };
      
      // 处理颜色选择器
      const pickColor = async (index) => {
        try {
          const eyeDropper = new EyeDropper();
          const { sRGBHex } = await eyeDropper.open();
          stripeColors.value[index] = sRGBHex;
          drawStripes();
        } catch (e) {
          console.error('取色失败:', e);
          alert('取色功能失败，请确保您的浏览器支持 EyeDropper API');
        }
      };
      
      // 执行下载
      const downloadTexture = () => {
        doDownloadTexture({
          format: downloadFormat.value,
          quality: downloadQuality.value,
          filename: fileName.value,
          useCustomSize: useCustomSize.value,
          customWidth: customWidth.value,
          customHeight: customHeight.value
        });
      };
      
      return {
        // 基础状态
        canvasRef,
        canvasWidth,
        canvasHeight,
        defaultStripeWidth,
        stripeWidths,
        stripeColors,
        showPreview,
        symmetryEnabled,
        
        // 背景相关
        backgroundImage,
        backgroundPreviewUrl,
        blendMode,
        backgroundOpacity,
        availableBlendModes,
        
        // 条纹透明度
        stripeOpacity,
        
        // 下载相关
        downloadFormat,
        downloadQuality,
        fileName,
        useCustomSize,
        customWidth,
        customHeight,
        keepAspectRatio,
        
        // 计算属性
        previewStyle,
        
        // 方法
        drawStripes,
        handleBackgroundImage,
        clearBackground,
        pickColor,
        downloadTexture,
        resetStripeWidth,
        resetAllStripeWidths,
        insertStripeAfter,
        duplicateStripe,
        moveStripe,
        moveAllStripes,
        reverseStripes,
        removeStripe
      };
    }
  };
  </script>
  
  <style scoped>
  .stripe-pattern-container {
    max-width: 100%;
    padding: 10px;
  }
  
  .layout {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  
  @media (min-width: 1024px) {
    .layout {
      flex-direction: row;
    }
    
    .canvas-area {
      flex: 1;
    }
    
    .controls-area {
      width: 600px;
    }
  }
  
  .canvas-area {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  canvas {
    border: 1px solid #ccc;
    max-width: 100%;
    border-radius: 4px;
  }
  
  .controls-area {
    background-color: #f9f9f9;
    border-radius: 4px;
    padding: 15px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  
  .global-controls, .stripes-editor {
    background-color: white;
    border-radius: 4px;
    padding: 15px;
    border: 1px solid #eee;
  }
  
  .control-row {
    display: flex;
    gap: 20px;
    margin-bottom: 15px;
    flex-wrap: wrap;
  }
  
  .control-group {
    flex: 1;
    min-width: 200px;
    display: flex;
    align-items: center;
  }
  
  .size-inputs {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .size-inputs input[type="number"] {
    width: 70px;
    padding: 4px 8px;
    border: 1px solid #ddd;
    border-radius: 3px;
  }
  
  .switch-row {
    display: flex;
    gap: 20px;
  }
  
  .switch-group {
    display: flex;
    align-items: center;
    gap: 10px;
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
  
  .empty-list {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 30px 0;
    color: #999;
    gap: 15px;
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
  
  .section-title {
    font-weight: bold;
    margin-bottom: 15px;
    padding-bottom: 5px;
    border-bottom: 1px solid #eee;
    font-size: 14px;
  }
  
  /* 条纹编辑器样式 */
  .stripes-list {
    max-height: 400px;
    overflow-y: auto;
    margin-bottom: 15px;
    padding-right: 5px;
  }
  
  .stripe-row {
    display: flex;
    align-items: center;
    padding: 10px 0;
    margin-bottom: 4px;
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
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background-color: #f0f0f0;
    font-size: 12px;
    color: #666;
    margin: 0 8px 0 8px;
    flex-shrink: 0;
  }
  
  .col-color {
    display: flex;
    align-items: center;
    min-width: 100px;
    position: relative;
  }
  
  .color-preview {
    width: 20px;
    height: 20px;
    border-radius: 3px;
    border: 1px solid #ddd;
    margin-right: 5px;
  }
  
  .col-color input[type="color"] {
    width: 24px;
    height: 24px;
    margin-right: 5px;
    border: none;
    border-radius: 3px;
    padding: 0;
    cursor: pointer;
    opacity: 0.8;
  }
  
  .col-color input[type="color"]:hover {
    opacity: 1;
  }
  
  .col-width {
    display: flex;
    align-items: center;
    flex: 1;
    margin: 0 10px;
  }
  
  .col-width input[type="range"] {
    flex: 1;
    min-width: 80px;
    max-width: 120px;
    margin-right: 8px;
  }
  
  .width-info {
    display: flex;
    flex-direction: column;
    min-width: 70px;
  }
  
  .width-info span {
    font-size: 13px;
  }
  
  .stripe-percent {
    color: #888;
    font-size: 11px;
  }
  
  .col-actions {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-left: auto;
    padding-right: 8px;
  }
  
  .action-group {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  
  .icon-btn {
    width: 24px;
    height: 24px;
    padding: 0;
    border: 1px solid #ddd;
    background-color: #f5f5f5;
    border-radius: 3px;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  
  .icon-btn:hover {
    background-color: #e6f7ff;
    border-color: #91d5ff;
  }
  
  .mini-btn {
    padding: 2px 6px;
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
  
  .danger-btn {
    background-color: #fff1f0;
    border-color: #ffccc7;
    color: #f5222d;
  }
  
  .danger-btn:hover {
    background-color: #fff1f0;
    border-color: #ff7875;
  }
  
  .stripe-controls {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .sub-controls {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
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
  
  button {
    cursor: pointer;
  }
  
  .tool-btn {
    margin-left: 5px;
    padding: 2px 6px;
    border: 1px solid #ddd;
    background-color: #f5f5f5;
    border-radius: 3px;
    font-size: 12px;
    white-space: nowrap;
  }
  
  .tool-btn:hover {
    background-color: #e6f7ff;
    border-color: #91d5ff;
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
  
  /* 下载选项样式 */
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
  
  .download-options .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 8px 16px;
    font-size: 14px;
  }
  
  .download-options .icon {
    margin-right: 6px;
    font-weight: bold;
  }
  
  .download-options select {
    padding: 4px 8px;
    border-radius: 3px;
    border: 1px solid #ddd;
    background-color: white;
  }
  
  .download-options input[type="text"] {
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
  
  /* 开关样式 */
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
  
  /* 添加预览样式 */
  .preview-container {
    margin-top: 5px;
    border: 1px solid #eee;
    padding: 10px;
    border-radius: 4px;
    background-color: #f9f9f9;
  }
  
  .preview-title {
    margin-bottom: 10px;
    font-weight: bold;
    font-size: 14px;
  }
  
  .preview {
    border: 1px solid #eee;
    background-repeat: repeat;
    height: 100px;
    border-radius: 4px;
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
  
  .background-controls {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .background-options {
    border: 1px solid #ddd;
    padding: 10px;
    border-radius: 4px;
    margin-top: 10px;
  }
  </style>