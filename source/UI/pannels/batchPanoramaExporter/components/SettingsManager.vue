<template>
  <div class="settings-manager-section">
    <div class="section-header">
      <h3>导出设置</h3>
      <div class="header-actions">
        <button class="action-btn" @click="addProfile">
          <i class="icon">➕</i>
          添加配置
        </button>
      </div>
    </div>
    
    <div class="settings-profiles-container">
      <SettingProfile 
        v-for="(profile, index) in profiles" 
        :key="index"
        :profile="profile"
        :profileIndex="index"
        :canRemove="profiles.length > 1"
        :availableFonts="availableFonts"
        :canGeneratePreview="canGeneratePreview"
        @remove="removeProfile(index)"
        @update-profile="updateProfile(index, $event)"
        @generate-preview="$emit('generate-preview', index)"
      />
    </div>
    
    <OutputSettings
      v-model:outputDir="localOutputDir"
      v-model:createSubDirs="localCreateSubDirs"
    />
  </div>
</template>

<script setup>
import { defineProps, defineEmits, ref, watch } from 'vue';
import SettingProfile from './SettingProfile.vue';
import OutputSettings from './OutputSettings.vue';
import { getDefaultProfile } from '../utils/common.js';

const props = defineProps({
  settingProfiles: {
    type: Array,
    required: true
  },
  outputDir: {
    type: String,
    default: ''
  },
  createSubDirs: {
    type: Boolean,
    default: true
  },
  availableFonts: {
    type: Array,
    default: () => []
  },
  canGeneratePreview: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'update:settingProfiles', 
  'update:outputDir', 
  'update:createSubDirs',
  'generate-preview'
]);

// 本地引用
const profiles = ref(props.settingProfiles);
const localOutputDir = ref(props.outputDir);
const localCreateSubDirs = ref(props.createSubDirs);

// 监听属性变化，同步到本地变量
watch(() => props.outputDir, (newValue) => {
  console.log('SettingsManager: 收到新的输出目录:', newValue);
  localOutputDir.value = newValue;
}, { immediate: true });

watch(() => props.createSubDirs, (newValue) => {
  localCreateSubDirs.value = newValue;
}, { immediate: true });

// 监听本地变量变化，向上同步
watch(localOutputDir, (newValue) => {
  console.log('SettingsManager: 输出目录已更新，通知父组件:', newValue);
  emit('update:outputDir', newValue);
});

watch(localCreateSubDirs, (newValue) => {
  emit('update:createSubDirs', newValue);
});

// 添加配置
const addProfile = () => {
  const newProfile = JSON.parse(JSON.stringify(getDefaultProfile()));
  profiles.value.push(newProfile);
  emit('update:settingProfiles', profiles.value);
};

// 移除配置
const removeProfile = (index) => {
  if (profiles.value.length > 1) {
    profiles.value.splice(index, 1);
    emit('update:settingProfiles', profiles.value);
  }
};

// 更新特定配置
const updateProfile = (index, updatedProfile) => {
  profiles.value[index] = updatedProfile;
  emit('update:settingProfiles', [...profiles.value]);
};

// 监听属性变化
watch(() => props.settingProfiles, (newProfiles) => {
  profiles.value = newProfiles;
}, { deep: true });
</script>

<style scoped>
.settings-manager-section {
  background: var(--cc-theme-surface);
  border-radius: 8px;
  border: 1px solid var(--cc-border-color);
}

.section-header {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--cc-border-color);
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  background: var(--cc-theme-surface-light);
  border: 1px solid var(--cc-border-color);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.action-btn:hover {
  background: var(--cc-theme-surface-hover);
}

.settings-profiles-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.icon {
  display: inline-block;
  width: 20px;
  text-align: center;
}
</style>