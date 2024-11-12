/**
 * 将JSDoc解析结果转换为节点定义
 * @param {Object} jsDocResult JSDoc解析结果
 * @param {Object} module 模块对象
 * @param {string} exportName 导出函数名
 * @returns {Object} 节点定义
 */
export function jsDoc2NodeDefine(jsDocResult, module, exportName) {
    const {inputTypes, outputTypes, defaultValues} = jsDocResult;
    const nodeDefine = module[exportName];
    
    // 如果模块直接导出了完整的节点定义，优先使用它
    if (nodeDefine && typeof nodeDefine === 'object' && nodeDefine.process) {
        return nodeDefine;
    }
    
    // 如果没有输入定义，根据函数参数数量自动生成
    let finalInputs = inputTypes;
    if (!inputTypes || Object.keys(inputTypes).length === 0) {
        const paramCount = module[exportName].length;
        console.warn(`警告: 函数 ${exportName} 未定义输入端口类型，将自动生成 ${paramCount} 个输入端口`);
        
        finalInputs = Array(paramCount).fill(0).reduce((acc, _, index) => {
            acc[`input${index + 1}`] = {
                type: 'any',
                label: `输入${index + 1}`
            };
            return acc;
        }, {});
    }
    
    // 验证输出定义
    if (!outputTypes || Object.keys(outputTypes).length === 0) {
        console.warn(`警告: 函数 ${exportName} 未定义输出端口类型，这可能会导致节点无法正常工作`);
    }
    
    return {
        flowType: 'process', // 默认流程类型
        inputs: finalInputs,
        outputs: outputTypes || {},
        process: module[exportName],
        // 可以添加更多默认属性
        description: jsDocResult.description || '',
        category: jsDocResult.category || 'default'
    }
}

/**
 * 将节点定义转换为Vue单文件组件字符串
 * @param {Object} nodeDefine 节点定义
 * @returns {string} Vue单文件组件字符串
 */
export const wrapSFCStringFromNodeDefine = (nodeDefine,url,exportName) => {
    // 生成基础模板
    const sfc =  `<template>
  <div class="node-control">
    <slot></slot>
  </div>
</template>

<script nodeDefine>
import { ref } from 'vue';
import {${exportName}} from '${url}'

const outputValue = ref(${nodeDefine.outputs?.number?.default || 0})

export const getDefaultInput = () => {
  return outputValue
}

const nodeDefine = ${JSON.stringify(nodeDefine, null, 2)}
nodeDefine.process =async(input)=>{ 
  try{
    outputValue.value=await ${exportName}(input)
    return outputValue.value
  }catch(e){
    console.error(e)
    return {}
  }
}
</script>

<script setup>
import { defineProps, defineEmits, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['update:modelValue']);

watch(outputValue, () => {
  emit('update:modelValue', outputValue.value);
});
</script>

<style scoped>
.node-control {
  padding: 8px;
}
</style>`
  // 创建Blob并生成URL
  const blob = new Blob([sfc], { type: 'text/plain' });
  const blobUrl = URL.createObjectURL(blob);

  return {
      sfcString: sfc,
      blobUrl: blobUrl
  };



}