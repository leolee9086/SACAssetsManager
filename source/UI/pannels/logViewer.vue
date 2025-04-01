<!--
  日志查看器组件
  提供高性能的日志查看、过滤、搜索和导出功能
-->
<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import LogControls from '../components/logControls.vue'
import ImageViewer from '../components/imageViewer.vue'
import LogContainer from '../components/logViewer/LogContainer.vue'
import Notification from '../components/logViewer/Notification.vue'
import { useLogData } from '../components/logViewer/useLogData.js'
import { 复制到剪贴板 } from '../components/logViewer/logUtils.js'

// 使用日志数据钩子创建所有日志相关状态和方法
const {
  // 状态
  日志列表,
  最大内存日志数,
  每页日志数,
  自动滚动,
  暂停接收,
  选中级别,
  搜索文本,
  选中标签,
  日志统计,
  数据库日志计数,
  可以加载更多,
  正在加载更多,
  丢弃日志数,
  
  // 计算属性
  过滤后的日志,
  可用标签,
  
  // 方法
  初始化数据库,
  添加日志,
  清空日志,
  加载更多日志,
  导出日志,
  应用最大日志数
} = useLogData()

// UI相关状态
const 显示时间戳 = ref(true)
const 显示级别 = ref(true)
const 当前查看图片 = ref(null)
const 日志容器引用 = ref(null)

// 操作消息
const 操作消息 = ref('')
const 显示操作消息 = ref(false)

// 显示通知消息
const 显示消息 = (消息) => {
  操作消息.value = 消息
  显示操作消息.value = true
}

// 设置标签过滤
const 设置标签过滤 = (标签) => {
  选中标签.value = 标签
}

// 处理自动滚动状态更新
const 更新自动滚动状态 = (状态) => {
  自动滚动.value = 状态
}

// 处理加载更多日志
const 处理加载更多日志 = (当前滚动高度) => {
  if (日志容器引用.value) {
    日志容器引用.value.设置滚动保存点(当前滚动高度)
  }
  加载更多日志()
}

// 复制部分内容
const 复制部分内容 = (内容, 标识 = '内容', 事件, 日志) => {
  // 阻止事件冒泡
  if (事件) {
    事件.stopPropagation()
  }
  
  复制到剪贴板(内容, 标识, 显示消息)
}

// 图片相关方法
const 打开图片 = (url) => {
  当前查看图片.value = url
}

const 关闭图片查看器 = () => {
  当前查看图片.value = null
}

const 在新窗口打开图片 = (url) => {
  window.open(url, '_blank')
}

const 图片加载失败 = (事件, 日志) => {
  事件.target.src = '' // 清除错误的图片URL
  事件.target.classList.add('image-load-error')
  事件.target.alt = '图片加载失败'
  
  // 可以记录图片加载失败的日志
  console.warn('图片加载失败:', 日志.内容?.值)
}

// 监听最大日志数变化
watch(最大内存日志数, () => {
  应用最大日志数()
})

// 生命周期钩子
onMounted(async () => {
  // 初始化数据库
  await 初始化数据库()
  
  // 监听消息事件
  window.addEventListener('message', (事件) => {
    if (事件.data && 事件.data.type === 'log' && 事件.data.log) {
      添加日志(事件.data.log)
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('message', 添加日志)
})

// 导出接口
defineExpose({
  添加日志,
  清空日志,
  批量添加日志: (列表) => {
    // 批量添加多个日志
    for (const 日志 of 列表) {
      添加日志(日志)
    }
  }
})
</script>

<template>
  <div class="log-viewer">
    <LogControls :日志列表="日志列表"
                :最大内存日志数="最大内存日志数"
                :可用标签="可用标签"
                :选中标签="选中标签"
                :搜索文本="搜索文本"
                :自动滚动="自动滚动"
                :暂停接收="暂停接收"
                :数据库日志计数="数据库日志计数"
                :选中级别="选中级别"
                @更新最大日志数="最大内存日志数 = $event"
                @清空日志="清空日志"
                @切换自动滚动="自动滚动 = !自动滚动"
                @导出日志="导出日志"
                @切换暂停接收="暂停接收 = !暂停接收"
                @更新搜索文本="搜索文本 = $event"
                @更新选中标签="选中标签 = $event"
                @更新选中级别="选中级别 = $event" />
    
    <LogContainer 
      ref="日志容器引用"
      :日志列表="过滤后的日志"
      :可以加载更多="可以加载更多"
      :正在加载更多="正在加载更多"
      :显示时间戳="显示时间戳"
      :显示级别="显示级别"
      :自动滚动="自动滚动"
      @更新自动滚动状态="更新自动滚动状态"
      @加载更多日志="处理加载更多日志"
      @复制内容="复制部分内容"
      @设置标签过滤="设置标签过滤"
      @打开图片="打开图片"
      @图片加载失败="图片加载失败" />
    
    <ImageViewer :当前查看图片="当前查看图片"
                @关闭="关闭图片查看器"
                @复制URL="复制部分内容"
                @新窗口打开="在新窗口打开图片" />
    
    <Notification 
      :message="操作消息"
      :visible="显示操作消息"
      @close="显示操作消息 = false" />
  </div>
</template>

<style scoped>
.log-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #0d1117;
  color: #c9d1d9;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style> 