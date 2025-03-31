<!--
  日志查看器组件
  提供高性能的日志查看、过滤、搜索和导出功能
-->
<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { shallowRef } from 'vue'
import { 数据库, 格式化器 } from '../../../source/server/utils/logs/index.js'

// 状态定义
const 日志列表 = shallowRef([])
const 最大内存日志数 = ref(1000)
const 每页日志数 = ref(100)
const 自动滚动 = ref(true)
const 暂停接收 = ref(false)
const 过滤级别 = ref('')
const 搜索文本 = ref('')
const 日志容器 = ref(null)
const 显示时间戳 = ref(true)
const 显示级别 = ref(true)
const 日志统计 = ref({
    total: 0,
    info: 0,
    warn: 0,
    error: 0,
    debug: 0
})

// 移除虚拟列表相关代码，改用性能优化的常规列表
const 分页大小 = 200 // 每次最多显示的日志数量

// 标签过滤功能
const 选中标签 = ref('')
const 可用标签 = computed(() => {
    const 标签集合 = new Set()
    // 性能优化：限制遍历的数量
    const 最大遍历数 = Math.min(日志列表.value.length, 200)
    for (let i = 0; i < 最大遍历数; i++) {
        const 日志 = 日志列表.value[i]
        if (日志.标签 && Array.isArray(日志.标签)) {
            日志.标签.forEach(标签 => 标签集合.add(标签))
        }
    }
    return Array.from(标签集合).sort()
})

// 设置标签过滤
const 设置标签过滤 = (标签) => {
    选中标签.value = 标签
}

// 图片查看器状态
const 当前查看图片 = ref(null)

// 分页和加载状态
const 数据库日志计数 = ref(0)
const 最早加载的时间戳 = ref(null)
const 最新加载的时间戳 = ref(null)
const 正在加载更多 = ref(false)
const 可以加载更多 = ref(true)
const 最近一次滚动时间 = ref(0)
const 待处理日志 = ref([])
const 正在处理 = ref(false)
const 丢弃日志数 = ref(0)

// 异步初始化数据库
const 初始化数据库 = async () => {
    try {
        // 获取数据库中的日志计数
        数据库日志计数.value = await 数据库.获取日志计数()
        
        // 加载最新的日志
        const 最新日志 = await 数据库.加载日志(0, Math.min(分页大小, 最大内存日志数.value))
        
        if (最新日志.length > 0) {
            日志列表.value = 最新日志
            
            // 更新时间戳范围
            最新加载的时间戳.value = 最新日志[0].时间
            最早加载的时间戳.value = 最新日志[最新日志.length - 1].时间
            
            // 更新统计
            最新日志.forEach(日志 => {
                日志统计.value.total++
                if (日志.级别) {
                    日志统计.value[日志.级别]++
                }
            })
            
            // 设置可以加载更多的标志
            可以加载更多.value = 最新日志.length < 数据库日志计数.value
        }
        
        // 自动滚动到底部
        nextTick(() => {
            if (日志容器.value) {
                日志容器.value.scrollTop = 日志容器.value.scrollHeight
            }
        })
    } catch (错误) {
        console.error('初始加载日志失败:', 错误)
    }
}

// 计算属性：过滤后的日志
const 过滤后的日志 = computed(() => {
    if (过滤级别.value === '' && 搜索文本.value === '' && 选中标签.value === '') {
        return 日志列表.value
    }
    
    let 结果 = 日志列表.value
    
    if (过滤级别.value !== '') {
        结果 = 结果.filter(日志 => 日志.级别 === 过滤级别.value)
    }
    
    if (搜索文本.value) {
        const 搜索词 = 搜索文本.value.toLowerCase()
        结果 = 结果.filter(日志 => {
            try {
                return (日志.内容 && String(日志.内容).toLowerCase().includes(搜索词)) ||
                       (日志.来源 && 日志.来源.toLowerCase().includes(搜索词))
            } catch (e) {
                return false
            }
        })
    }
    
    if (选中标签.value !== '') {
        结果 = 结果.filter(日志 => {
            return 日志.标签 && Array.isArray(日志.标签) && 日志.标签.includes(选中标签.value)
        })
    }
    
    return 结果.slice(0, 分页大小) // 限制最大显示数量以提高性能
})

// 批量处理日志
const 批量处理日志 = async () => {
    正在处理.value = true
    
    // 使用更高效的批处理方式
    const 处理批次 = () => {
        const 批次日志 = 待处理日志.value.splice(0, Math.min(20, 待处理日志.value.length))
        if (批次日志.length === 0) {
            正在处理.value = false
            return
        }
        
        const 处理后日志 = []
        const 数据库日志 = 批次日志.map(日志 => {
            // 确保日志格式正确
            const 新日志 = {
                id: 日志.id || (Date.now() + Math.random().toString(36).substr(2, 9)),
                时间: 日志.时间 || new Date().toISOString(),
                级别: 日志.级别 || 'info',
                内容: 日志.内容 || '',
                来源: 日志.来源 || 'Console'
            }
            
            处理后日志.push(新日志)
            
            // 更新统计
            日志统计.value.total++
            if (新日志.级别) {
                日志统计.value[新日志.级别]++
            }
            
            return 新日志
        })
        
        // 使用Promise.all更高效地处理保存操作
        Promise.all([
            数据库.保存日志(数据库日志),
            数据库.获取日志计数().then(计数 => 数据库日志计数.value = 计数)
        ]).then(() => {
            // 更新内存中的日志列表
            日志列表.value = [...日志列表.value, ...处理后日志]
            
            // 应用最大内存日志数限制
            if (日志列表.value.length > 最大内存日志数.value) {
                日志列表.value = 日志列表.value.slice(日志列表.value.length - 最大内存日志数.value)
            }
            
            // 更新时间戳范围
            if (处理后日志.length > 0) {
                const 最新日志 = 处理后日志[处理后日志.length - 1]
                最新加载的时间戳.value = 最新日志.时间
                
                if (!最早加载的时间戳.value) {
                    最早加载的时间戳.value = 最新日志.时间
                }
            }
            
            // 如果启用了自动滚动，滚动到底部
            if (自动滚动.value) {
                nextTick(() => {
                    if (日志容器.value) {
                        日志容器.value.scrollTop = 日志容器.value.scrollHeight
                    }
                })
            }
            
            // 继续处理队列中的日志
            if (待处理日志.value.length > 0) {
                setTimeout(处理批次, 50)
            } else {
                正在处理.value = false
            }
        }).catch(错误 => {
            console.error('保存日志到数据库失败:', 错误)
            正在处理.value = false
        })
    }
    
    // 使用requestAnimationFrame确保UI流畅
    requestAnimationFrame(处理批次)
}

// 添加日志到处理队列
const 添加日志 = (日志) => {
    // 如果暂停接收，则丢弃日志
    if (暂停接收.value) {
        丢弃日志数.value++
        return
    }
    
    // 如果队列过长，丢弃一些日志
    if (待处理日志.value.length > 500) {
        丢弃日志数.value += (待处理日志.value.length - 500)
        待处理日志.value = 待处理日志.value.slice(待处理日志.value.length - 500)
    }
    
    // 将日志添加到待处理队列
    待处理日志.value.push(日志)
    
    // 如果未启动处理，则启动批量处理
    if (!正在处理.value) {
        批量处理日志()
    }
}

// 清空日志
const 清空日志 = async () => {
    try {
        // 清空内存中的日志
        日志列表.value = []
        待处理日志.value = []
        
        // 清空数据库中的日志
        await 数据库.清空日志数据库()
        
        // 重置统计和状态
        日志统计.value = {
            total: 0,
            info: 0,
            warn: 0,
            error: 0,
            debug: 0
        }
        数据库日志计数.value = 0
        最早加载的时间戳.value = null
        最新加载的时间戳.value = null
        可以加载更多.value = false
        丢弃日志数.value = 0
    } catch (错误) {
        console.error('清空日志数据库失败:', 错误)
    }
}

// 切换自动滚动
const 切换自动滚动 = () => {
    自动滚动.value = !自动滚动.value
}

// 格式化时间显示
const 格式化时间 = (时间字符串) => {
    return 格式化器.格式化时间(时间字符串)
}

// 导出日志
const 导出日志 = async () => {
    try {
        // 从数据库导出所有日志
        let 所有日志 = []
        let 页码 = 0
        const 每页数量 = 10000
        let 继续导出 = true
        
        while (继续导出) {
            const 日志批次 = await 数据库.加载日志(页码, 每页数量)
            所有日志 = [...所有日志, ...日志批次]
            
            if (日志批次.length < 每页数量) {
                继续导出 = false
            } else {
                页码++
            }
            
            // 安全限制，最多导出100万条
            if (所有日志.length >= 1000000) {
                继续导出 = false
            }
        }
        
        // 将日志转换为文本格式
        const 文本 = 格式化器.日志列表转文本(所有日志)
        
        // 创建并下载文件
        const blob = new Blob([文本], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `日志_${new Date().toLocaleDateString().replace(/[\/\s:]/g, '_')}.txt`
        a.click()
        URL.revokeObjectURL(url)
    } catch (e) {
        console.error('导出日志失败:', e)
    }
}

// 复制日志到剪贴板 (完整日志)
const 复制日志 = (日志, 事件) => {
    try {
        // 阻止事件冒泡
        if (事件) {
            事件.stopPropagation();
        }
        
        // 确保我们复制的是正确的日志对象
        console.log('开始复制日志:', 日志.id, 日志.级别, 日志.时间);
        
        // 使用格式化器中的日志转文本函数格式化日志
        const 文本 = 格式化器.日志转文本(日志);
        
        // 检查是否有Navigator API
        if (navigator.clipboard) {
            navigator.clipboard.writeText(文本)
                .then(() => {
                    显示消息(`已复制日志 (ID: ${日志.id.slice(-6)})`);
                })
                .catch(err => {
                    console.error('复制失败:', err);
                    // 备用复制方法
                    使用备用复制方法(文本, 日志);
                });
        } else {
            // 环境不支持clipboard API时使用备用方法
            使用备用复制方法(文本, 日志);
        }
    } catch (e) {
        console.error('复制日志失败:', e, '日志对象:', 日志);
        显示消息('复制日志失败: ' + e.message);
    }
};

// 备用复制方法，使用临时textarea元素
const 使用备用复制方法 = (文本, 日志) => {
    try {
        const textarea = document.createElement('textarea');
        textarea.value = 文本;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const 成功 = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (成功) {
            显示消息(`已复制日志 (ID: ${日志.id.slice(-6)})`);
        } else {
            显示消息('复制失败，请手动复制');
            console.log('需要复制的内容:', 文本);
        }
    } catch (e) {
        console.error('备用复制方法失败:', e);
        显示消息('复制失败: ' + e.message);
    }
};

// 复制日志的部分内容
const 复制部分内容 = (内容, 标签, 事件) => {
    try {
        // 阻止事件冒泡
        if (事件) {
            事件.stopPropagation();
        }
        
        let 复制文本 = 内容;
        
        // 处理对象
        if (typeof 内容 === 'object' && 内容 !== null) {
            try {
                复制文本 = JSON.stringify(内容, null, 2);
            } catch (e) {
                复制文本 = '[无法序列化的对象]';
                console.error('序列化对象失败:', e);
            }
        }
        
        // 处理undefined和null
        if (内容 === undefined) {
            复制文本 = 'undefined';
        } else if (内容 === null) {
            复制文本 = 'null';
        }
        
        // 检查是否有Navigator API
        if (navigator.clipboard) {
            navigator.clipboard.writeText(复制文本)
                .then(() => {
                    显示消息(`已复制 ${标签}`);
                })
                .catch(err => {
                    console.error('复制失败:', err);
                    // 使用备用方法
                    使用备用复制部分内容(复制文本, 标签);
                });
        } else {
            // 环境不支持clipboard API时使用备用方法
            使用备用复制部分内容(复制文本, 标签);
        }
    } catch (e) {
        console.error('复制部分内容失败:', e);
        显示消息('复制失败: ' + e.message);
    }
};

// 备用复制部分内容方法
const 使用备用复制部分内容 = (复制文本, 标签) => {
    try {
        const textarea = document.createElement('textarea');
        textarea.value = 复制文本;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const 成功 = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (成功) {
            显示消息(`已复制 ${标签}`);
        } else {
            显示消息('复制失败，请手动复制');
            console.log('需要复制的内容:', 复制文本);
        }
    } catch (e) {
        console.error('备用复制部分内容方法失败:', e);
        显示消息('复制失败: ' + e.message);
    }
};

// 图片相关方法
const 打开图片 = (url) => {
    当前查看图片.value = url;
};

const 关闭图片查看器 = () => {
    当前查看图片.value = null;
};

const 在新窗口打开图片 = (url) => {
    window.open(url, '_blank');
};

const 图片加载失败 = (事件, 日志) => {
    事件.target.src = ''; // 清除错误的图片URL
    事件.target.classList.add('image-load-error');
    事件.target.alt = '图片加载失败';
    
    // 可以记录图片加载失败的日志
    console.warn('图片加载失败:', 日志.内容?.值);
};

// 截断长URL
const 截断图片URL = (url) => {
    if (!url) return '';
    
    // 处理Base64图片
    if (url.startsWith('data:image/')) {
        return '图片数据 (Base64)';
    }
    
    // 处理普通URL
    if (url.length > 50) {
        return url.substring(0, 25) + '...' + url.substring(url.length - 25);
    }
    
    return url;
};

// 显示操作消息
const 消息计时器 = ref(null);
const 操作消息 = ref('');
const 显示操作消息 = ref(false);

const 显示消息 = (消息) => {
    操作消息.value = 消息;
    显示操作消息.value = true;
    
    // 清除之前的计时器
    if (消息计时器.value) {
        clearTimeout(消息计时器.value);
    }
    
    // 设置新计时器
    消息计时器.value = setTimeout(() => {
        显示操作消息.value = false;
    }, 2000);
};

// 加载更多日志
const 加载更多日志 = async () => {
    if (正在加载更多.value || !最早加载的时间戳.value) return
    
    正在加载更多.value = true
    
    try {
        // 加载早于最早时间戳的日志
        const 较早日志 = await 数据库.加载早于时间戳的日志(最早加载的时间戳.value, 每页日志数.value)
        
        if (较早日志.length > 0) {
            // 更新最早的时间戳
            最早加载的时间戳.value = 较早日志[较早日志.length - 1].时间
            
            // 将较早的日志添加到列表前面
            日志列表.value = [...较早日志, ...日志列表.value]
            
            // 限制内存中的日志总数
            if (日志列表.value.length > 最大内存日志数.value) {
                日志列表.value = 日志列表.value.slice(0, 最大内存日志数.value)
            }
        } else {
            // 没有更多日志了
            可以加载更多.value = false
        }
    } catch (错误) {
        console.error('加载更多日志失败:', 错误)
    } finally {
        正在加载更多.value = false
    }
}

// 处理滚动事件 - 简化版，不再需要计算虚拟列表的可视区域
const 处理滚动事件 = (事件) => {
    // 节流处理，避免频繁触发
    const 当前时间 = Date.now()
    if (当前时间 - 最近一次滚动时间.value < 100) return
    最近一次滚动时间.value = 当前时间
    
    if (!日志容器.value) return
    
    // 检测是否滚动到顶部附近，如果是，则加载更多日志
    if (日志容器.value.scrollTop < 50 && 可以加载更多.value && !正在加载更多.value) {
        // 记录当前滚动位置
        const 当前滚动高度 = 日志容器.value.scrollHeight
        
        // 异步加载更多日志
        加载更多日志().then(() => {
            // 加载完成后，调整滚动位置，保持相对位置不变
            nextTick(() => {
                const 新滚动高度 = 日志容器.value.scrollHeight
                const 高度差 = 新滚动高度 - 当前滚动高度
                日志容器.value.scrollTop = 高度差 + 50 // +50是为了避免触发新的加载
            })
        })
    }
    
    // 检测是否滚动到底部，用于设置自动滚动状态
    const 接近底部 = 日志容器.value.scrollHeight - 日志容器.value.scrollTop - 日志容器.value.clientHeight < 50
    自动滚动.value = 接近底部
}

// 应用最大日志数限制
const 应用最大日志数 = () => {
    if (日志列表.value.length > 最大内存日志数.value) {
        日志列表.value = 日志列表.value.slice(日志列表.value.length - 最大内存日志数.value)
    }
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
    批量添加日志: (日志列表) => {
        // 批量添加多个日志
        for (const 日志 of 日志列表) {
            添加日志(日志)
        }
    }
})

// 切换展开元数据
const 切换展开元数据 = (日志) => {
    if (!日志.展开元数据) {
        日志.展开元数据 = true;
    } else {
        日志.展开元数据 = false;
    }
};

// 格式化结构化数据值
const 格式化结构化值 = (值) => {
    if (值 === null) return 'null';
    if (值 === undefined) return 'undefined';
    
    if (typeof 值 === 'object') {
        try {
            return JSON.stringify(值);
        } catch (e) {
            return '[复杂对象]';
        }
    }
    
    if (typeof 值 === 'string' && 值.length > 100) {
        return 值.substring(0, 100) + '...';
    }
    
    return String(值);
};
</script>

<template>
    <div class="log-viewer">
        <div class="log-controls">
            <select v-model="过滤级别">
                <option value="">所有级别</option>
                <option value="info">信息</option>
                <option value="warn">警告</option>
                <option value="error">错误</option>
                <option value="debug">调试</option>
            </select>
            
            <!-- 添加标签过滤 -->
            <select v-if="可用标签.length > 0" v-model="选中标签">
                <option value="">所有标签</option>
                <option v-for="标签 in 可用标签" :key="标签" :value="标签">{{ 标签 }}</option>
            </select>
            
            <input type="number" v-model="最大内存日志数" min="100" max="10000" step="100" @change="应用最大日志数">
            <input type="text" v-model="搜索文本" placeholder="搜索日志...">
            <button @click="清空日志">清空</button>
            <button @click="切换自动滚动">{{ 自动滚动 ? '关闭自动滚动' : '开启自动滚动' }}</button>
            <button @click="导出日志">导出</button>
            <button @click="暂停接收 = !暂停接收" :class="{'pause-receiving': 暂停接收}">{{ 暂停接收 ? '恢复接收' : '暂停接收' }}</button>
            <span class="log-count-info">内存中: {{ 日志列表.length }}/{{ 最大内存日志数 }} | 数据库: {{ 数据库日志计数 }}</span>
        </div>
        
        <div class="log-stats">
            <span>总数: {{ 日志统计.total }}</span>
            <span>信息: {{ 日志统计.info }}</span>
            <span>警告: {{ 日志统计.warn }}</span>
            <span>错误: {{ 日志统计.error }}</span>
            <span>调试: {{ 日志统计.debug }}</span>
            <span v-if="待处理日志.length > 0" style="color: #e3b341;">队列中: {{ 待处理日志.length }}</span>
            <span v-if="丢弃日志数 > 0" style="color: #f85149;">已丢弃: {{ 丢弃日志数 }}</span>
        </div>
        
        <div class="log-container" ref="日志容器" @scroll="处理滚动事件">
            <div v-if="正在加载更多" class="log-loading">正在加载日志...</div>
            
            <!-- 无日志提示 -->
            <div v-if="过滤后的日志.length === 0" class="no-logs-message">
                暂无匹配的日志记录
            </div>
            
            <!-- 日志列表 -->
            <div v-for="日志 in 过滤后的日志" 
                 :key="日志.id || 日志.行号" 
                 class="log-entry"
                 :class="[日志.级别, 日志.包含图片 ? 'with-image' : '', 日志.包含结构化数据 ? 'with-structured-data' : '']">
                
                <!-- 日志元数据（时间、级别、来源）-->
                <div class="log-meta">
                    <span v-if="显示时间戳" class="log-time" @click="复制部分内容(格式化时间(日志.时间), '时间', $event)">
                        {{ 格式化时间(日志.时间) }}
                    </span>
                    <span v-if="显示级别" class="log-level" @click="复制部分内容(日志.级别, '级别', $event)">
                        {{ 日志.级别.toUpperCase() }}
                    </span>
                    <span class="log-source" @click="复制部分内容(日志.来源, '来源', $event)">
                        {{ 日志.来源 }}
                    </span>
                    
                    <!-- 显示标签 -->
                    <span v-if="日志.标签 && 日志.标签.length > 0" class="log-tags">
                        <span v-for="标签 in 日志.标签" 
                              :key="标签" 
                              class="log-tag"
                              @click="设置标签过滤(标签)">
                            {{ 标签 }}
                        </span>
                    </span>
                    
                    <span class="log-actions">
                        <button class="mini-button copy-all" @click="复制日志(日志, $event)" title="复制整条日志">
                            复制
                        </button>
                    </span>
                </div>
                
                <!-- 日志内容 -->
                <div class="log-content-wrapper">
                    <!-- 普通文本内容 -->
                    <div v-if="!日志.包含图片 && !日志.包含结构化数据" class="log-content" @click="复制部分内容(日志.内容, '内容', $event)">
                        {{ 日志.内容 }}
                    </div>
                    
                    <!-- 图片内容 -->
                    <div v-else-if="日志.包含图片" class="log-content log-image-content">
                        <!-- 图片标题和描述 -->
                        <div class="image-meta" @click="复制部分内容(日志.内容 && 日志.content.描述, '描述', $event)">
                            <strong>图片</strong>: {{ 日志.content && 日志.content.描述 || '' }}
                        </div>
                        
                        <!-- 图片预览 -->
                        <div class="image-preview">
                            <img v-if="日志.content && 日志.content.值" 
                                loading="lazy" 
                                :src="日志.content.值" 
                                alt="日志图片"
                                @click="打开图片(日志.content.值)"
                                @error="图片加载失败($event, 日志)" />
                            <div v-else class="image-error">图片资源不可用</div>
                        </div>
                        
                        <!-- 图片URL（可复制） -->
                        <div v-if="日志.content && 日志.content.值" 
                             class="image-url" 
                             @click="复制部分内容(日志.content.值, '图片URL', $event)">
                            <small>{{ 截断图片URL(日志.content.值) }}</small>
                        </div>
                    </div>
                    
                    <!-- 结构化数据内容 -->
                    <div v-else-if="日志.包含结构化数据" class="log-content log-structured-content">
                        <!-- 基本内容显示 -->
                        <div class="structured-basic" @click="复制部分内容(日志.内容, '内容', $event)">
                            {{ 日志.内容 }}
                        </div>
                        
                        <!-- 元数据展开控制 -->
                        <div class="structured-meta" @click="切换展开元数据(日志)">
                            <strong>结构化数据</strong>
                            <span class="expander-icon">{{ 日志.展开元数据 ? '▼' : '▶' }}</span>
                        </div>
                        
                        <!-- 元数据内容 -->
                        <div v-if="日志.展开元数据 && 日志.元数据" class="structured-data">
                            <div v-for="(值, 键) in 日志.元数据" :key="键" class="data-item">
                                <span class="data-key" @click="复制部分内容(键, '键名', $event)">{{ 键 }}:</span>
                                <span class="data-value" @click="复制部分内容(值, 键, $event)">
                                    {{ 格式化结构化值(值) }}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 对象内容 (带有格式化显示) -->
                    <div v-else-if="typeof 日志.内容 === 'object' && 日志.content !== null" class="log-content log-object-content">
                        <pre @click="复制部分内容(JSON.stringify(日志.content, null, 2), '对象内容', $event)">{{ JSON.stringify(日志.content, null, 2) }}</pre>
                    </div>
                </div>
            </div>
            
            <div v-if="可以加载更多" class="log-more">
                <button @click="加载更多日志">加载更早的日志</button>
            </div>
        </div>
        
        <!-- 图片查看器 -->
        <div v-if="当前查看图片" class="image-viewer" @click="关闭图片查看器">
            <div class="image-viewer-content" @click.stop>
                <img :src="当前查看图片" alt="查看大图" />
                <div class="image-viewer-toolbar">
                    <button @click="复制部分内容(当前查看图片, '大图URL', $event)">复制URL</button>
                    <button @click="在新窗口打开图片(当前查看图片)">新窗口打开</button>
                    <button @click="关闭图片查看器">关闭</button>
                </div>
            </div>
        </div>
        
        <!-- 状态消息 -->
        <div v-if="显示操作消息" class="status-message" :class="{ 'visible': 显示操作消息 }">
            {{ 操作消息 }}
        </div>
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

.log-controls {
    padding: 8px;
    background-color: #161b22;
    border-bottom: 1px solid #30363d;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
}

.log-controls select,
.log-controls input,
.log-controls button {
    padding: 4px 8px;
    background-color: #21262d;
    border: 1px solid #30363d;
    border-radius: 4px;
    color: #c9d1d9;
    font-size: 14px;
}

.log-controls select:hover,
.log-controls input:hover,
.log-controls button:hover {
    background-color: #30363d;
}

.log-controls button {
    cursor: pointer;
}

.log-count-info {
    margin-left: auto;
    padding: 6px 12px;
    color: #8b949e;
    font-size: 14px;
}

.log-stats {
    padding: 4px 8px;
    background-color: #161b22;
    border-bottom: 1px solid #30363d;
    display: flex;
    gap: 16px;
    font-size: 14px;
}

.log-container {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    font-family: Consolas, monospace;
    font-size: 14px;
    line-height: 1.5;
    position: relative; /* 为虚拟列表定位 */
}

/* 虚拟列表样式 */
.virtual-list-container {
    position: relative;
    width: 100%;
    will-change: transform; /* 提示浏览器此元素会频繁变化，优化性能 */
}

.log-entry {
    padding: 8px;
    margin-bottom: 4px;
    border-radius: 4px;
    background-color: #161b22;
    transition: background-color 0.1s;
    will-change: contents; /* 性能优化提示 */
}

.log-entry:hover {
    background-color: #1c2128;
}

.log-entry.with-image {
    padding: 12px;
}

.log-entry.with-structured-data {
    padding: 12px;
}

.log-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    flex-wrap: wrap;
}

.log-time {
    color: #8b949e;
    cursor: pointer;
}

.log-time:hover {
    text-decoration: underline;
}

.log-level {
    font-weight: bold;
    cursor: pointer;
}

.log-level:hover {
    text-decoration: underline;
}

.log-source {
    color: #7ee787;
    cursor: pointer;
}

.log-source:hover {
    text-decoration: underline;
}

/* 标签样式 */
.log-tags {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
}

.log-tag {
    padding: 2px 6px;
    background-color: #30363d;
    border-radius: 12px;
    font-size: 12px;
    color: #c9d1d9;
    cursor: pointer;
}

.log-tag:hover {
    background-color: #58a6ff;
    color: #ffffff;
}

.log-actions {
    margin-left: auto;
}

.mini-button {
    padding: 2px 6px;
    font-size: 12px;
    background-color: #21262d;
    border: 1px solid #30363d;
    border-radius: 3px;
    color: #c9d1d9;
    cursor: pointer;
}

.mini-button:hover {
    background-color: #30363d;
}

.log-content-wrapper {
    margin-left: 8px;
    padding-left: 8px;
    border-left: 2px solid #30363d;
}

.log-content {
    white-space: pre-wrap;
    word-break: break-word;
    cursor: pointer;
}

.log-content:hover {
    background-color: #1c2128;
}

/* 结构化数据样式 */
.log-structured-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.structured-basic {
    cursor: pointer;
}

.structured-meta {
    margin-top: 4px;
    padding: 4px 8px;
    background-color: #21262d;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
}

.structured-meta:hover {
    background-color: #30363d;
}

.structured-data {
    margin-top: 4px;
    padding: 8px;
    background-color: #21262d;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.data-item {
    display: flex;
    gap: 8px;
    padding: 2px 0;
    border-bottom: 1px solid #30363d;
}

.data-key {
    font-weight: bold;
    color: #7ee787;
    cursor: pointer;
    min-width: 150px;
}

.data-key:hover {
    text-decoration: underline;
}

.data-value {
    flex: 1;
    cursor: pointer;
}

.data-value:hover {
    background-color: #1c2128;
}

/* 图片日志样式 */
.log-image-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.image-meta {
    cursor: pointer;
}

.image-meta:hover {
    text-decoration: underline;
}

.image-preview {
    margin: 8px 0;
}

.image-preview img {
    max-width: 300px;
    max-height: 200px;
    border-radius: 4px;
    border: 1px solid #30363d;
    cursor: pointer;
}

.image-preview img:hover {
    border-color: #58a6ff;
}

.image-url {
    font-family: monospace;
    padding: 4px;
    background-color: #21262d;
    border-radius: 3px;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.image-url:hover {
    background-color: #30363d;
}

.image-error {
    padding: 8px;
    color: #f85149;
    background-color: rgba(248, 81, 73, 0.1);
    border-radius: 4px;
}

/* 对象内容样式 */
.log-object-content pre {
    margin: 0;
    padding: 8px;
    background-color: #21262d;
    border-radius: 4px;
    overflow: auto;
    max-height: 300px;
}

/* 图片查看器 */
.image-viewer {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.image-viewer-content {
    max-width: 90%;
    max-height: 90%;
    display: flex;
    flex-direction: column;
    background-color: #161b22;
    border-radius: 8px;
    overflow: hidden;
}

.image-viewer-content img {
    max-width: 100%;
    max-height: calc(90vh - 60px);
    object-fit: contain;
}

.image-viewer-toolbar {
    display: flex;
    justify-content: center;
    gap: 16px;
    padding: 12px;
    background-color: #21262d;
}

.image-viewer-toolbar button {
    padding: 6px 12px;
    background-color: #30363d;
    border: none;
    border-radius: 4px;
    color: #c9d1d9;
    cursor: pointer;
}

.image-viewer-toolbar button:hover {
    background-color: #58a6ff;
    color: #ffffff;
}

/* 状态消息 */
.status-message {
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 12px 16px;
    background-color: #2ea043;
    color: white;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1001;
    transition: all 0.3s ease;
    opacity: 0;
    transform: translateY(20px);
}

.status-message.visible {
    opacity: 1;
    transform: translateY(0);
}

.log-entry.info .log-level {
    color: #58a6ff;
}

.log-entry.warn .log-level {
    color: #e3b341;
}

.log-entry.error .log-level {
    color: #f85149;
}

.log-entry.debug .log-level {
    color: #8b949e;
}

/* 加载状态 */
.log-loading {
    padding: 12px;
    text-align: center;
    color: #8b949e;
    background-color: #21262d;
    border-radius: 4px;
    margin-bottom: 8px;
}

.log-more {
    padding: 12px;
    text-align: center;
    margin-top: 8px;
}

.log-more button {
    padding: 8px 16px;
    background-color: #21262d;
    color: #c9d1d9;
    border: 1px solid #30363d;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

.log-more button:hover {
    background-color: #30363d;
}

/* 暂停接收按钮特殊样式 */
button.pause-receiving {
    background-color: #6e7681;
}

button.pause-receiving:hover {
    background-color: #8b949e;
}

/* 图片加载失败样式 */
.image-load-error {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 200px;
    height: 150px;
    background-color: rgba(248, 81, 73, 0.1);
    color: #f85149;
    border-radius: 4px;
    border: 1px dashed #f85149;
}

/* 自定义滚动条样式 */
.log-container::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

.log-container::-webkit-scrollbar-track {
    background: #161b22;
}

.log-container::-webkit-scrollbar-thumb {
    background: #30363d;
    border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb:hover {
    background: #484f58;
}

/* 无日志提示样式 */
.no-logs-message {
    padding: 20px;
    text-align: center;
    color: #8b949e;
    font-size: 16px;
    background-color: #161b22;
    border-radius: 4px;
    margin: 20px 0;
}
</style> 