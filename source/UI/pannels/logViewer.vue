<!--
  日志查看器组件
  提供高性能的日志查看、过滤、搜索和导出功能
-->
<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { shallowRef } from 'vue'
import { 数据库, 格式化器 } from '../../../source/server/utils/logs/index.js'
import LogEntry from '../components/logEntry.vue'
import LogControls from '../components/logControls.vue'
import ImageViewer from '../components/imageViewer.vue'

// 状态定义
const 日志列表 = shallowRef([])
const 最大内存日志数 = ref(Number(1000))
const 每页日志数 = ref(100)
const 自动滚动 = ref(true)
const 暂停接收 = ref(false)
const 选中级别 = ref('')
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
    if (选中级别.value === '' && 搜索文本.value === '' && 选中标签.value === '') {
        return 日志列表.value
    }
    
    let 结果 = 日志列表.value
    
    if (选中级别.value !== '') {
        结果 = 结果.filter(日志 => 日志.级别 === 选中级别.value)
    }
    
    if (搜索文本.value) {
        const 搜索词 = 搜索文本.value.toLowerCase()
        结果 = 结果.filter(日志 => {
            try {
                const 内容字段 = 获取内容字段(日志)
                return (内容字段 && String(内容字段).toLowerCase().includes(搜索词)) ||
                       (日志.来源 && 日志.来源.toLowerCase().includes(搜索词))
            } catch (e) {
                console.error('搜索过滤时出错:', e)
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
        
        // 获取日志的元素ID
        const 元素ID = 获取元素ID(日志);
        
        // 调试输出当前复制的日志对象
        console.log('正在复制日志对象:', 元素ID, 日志.id, 日志.级别, 日志.时间);
        
        // 直接构建简单格式避免依赖格式化器
        let 文本;
        try {
            // 使用格式化器中的日志转文本函数格式化日志
            文本 = 格式化器.日志转文本(日志);
        } catch (formatError) {
            console.error('使用格式化器格式化失败:', formatError);
            // 备用格式化方法
            const 内容 = 获取内容字段(日志);
            const 内容文本 = typeof 内容 === 'object' 
                ? JSON.stringify(内容, null, 2) 
                : String(内容 || '');
            文本 = `[${日志.时间 || ''}] ${(日志.级别 || '').toUpperCase()}: [${日志.来源 || ''}] ${内容文本}`;
        }
        
        // 检查是否有Navigator API
        if (navigator.clipboard) {
            navigator.clipboard.writeText(文本)
                .then(() => {
                    显示消息(`已复制日志 #${元素ID}`);
                })
                .catch(err => {
                    console.error('复制失败:', err);
                    // 备用复制方法
                    使用备用复制方法(文本, 元素ID);
                });
        } else {
            // 环境不支持clipboard API时使用备用方法
            使用备用复制方法(文本, 元素ID);
        }
    } catch (e) {
        console.error('复制日志失败:', e, '日志对象:', 日志);
        显示消息('复制日志失败: ' + e.message);
    }
};

// 备用复制方法，使用临时textarea元素
const 使用备用复制方法 = (文本, 操作ID) => {
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
            显示消息(`已复制日志 #${操作ID}`);
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
const 复制部分内容 = (内容, 标识 = '内容', 事件, 日志) => {
    try {
        // 阻止事件冒泡
        if (事件) {
            事件.stopPropagation();
        }
        
        // 创建操作ID，优先使用日志元素ID
        const 操作ID = 日志 ? 获取元素ID(日志) : (Date.now().toString(36).slice(-4) + Math.random().toString(36).substring(2, 4));
        
        // 调试信息
        console.log('复制部分内容:', 操作ID, 标识, typeof 内容);
        
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
                    显示消息(`已复制${标识} #${操作ID}`);
                })
                .catch(err => {
                    console.error('复制失败:', err);
                    // 使用备用方法
                    使用备用复制部分内容(复制文本, 标识, 操作ID);
                });
        } else {
            // 环境不支持clipboard API时使用备用方法
            使用备用复制部分内容(复制文本, 标识, 操作ID);
        }
    } catch (e) {
        console.error('复制部分内容失败:', e);
        显示消息('复制失败: ' + e.message);
    }
};

// 备用复制部分内容方法
const 使用备用复制部分内容 = (复制文本, 标识, 操作ID) => {
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
            显示消息(`已复制${标识} #${操作ID}`);
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
            
            // 确保新加载的日志有唯一的ID
            const 新日志 = 较早日志.map(日志 => {
                // 强制重新生成ID
                日志._elId = undefined
                return 日志
            })
            
            // 将较早的日志添加到列表前面
            日志列表.value = [...新日志, ...日志列表.value]
            
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

// 获取内容字段
const 获取内容字段 = (日志) => {
    // 先检查内容字段
    if (日志.内容) {
        if (typeof 日志.内容 === 'object' && 日志.内容 !== null) {
            return 日志.内容;
        }
        return 日志.内容;
    }
    
    // 再检查content字段
    if (日志.content) {
        if (typeof 日志.content === 'object' && 日志.content !== null) {
            return 日志.content;
        }
        return 日志.content;
    }
    
    // 都不存在时返回空对象
    return {};
};

// 获取唯一的元素ID，用于识别日志元素
const 获取元素ID = (日志) => {
    if (!日志._elId) {
        // 使用时间戳+随机数+递增计数器的组合来确保唯一性
        const 时间戳 = Date.now()
        const 随机数 = Math.random().toString(36).substring(2, 8)
        const 计数器 = (Math.floor(Math.random() * 10000)).toString(36).padStart(4, '0')
        日志._elId = `${时间戳.toString(36)}${随机数}${计数器}`
    }
    return 日志._elId;
};
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
        
        <div class="log-container" ref="日志容器" @scroll="处理滚动事件">
            <div v-if="正在加载更多" class="log-loading">正在加载日志...</div>
            
            <!-- 无日志提示 -->
            <div v-if="过滤后的日志.length === 0" class="no-logs-message">
                暂无匹配的日志记录
            </div>
            
            <!-- 日志列表 -->
            <LogEntry v-for="日志 in 过滤后的日志"
                     :key="获取元素ID(日志)"
                     :日志="日志"
                     :显示时间戳="显示时间戳"
                     :显示级别="显示级别"
                     @复制内容="复制部分内容"
                     @设置标签过滤="设置标签过滤"
                     @打开图片="打开图片"
                     @图片加载失败="图片加载失败" />
            
            <div v-if="可以加载更多" class="log-more">
                <button @click="加载更多日志">加载更早的日志</button>
            </div>
        </div>
        
        <ImageViewer :当前查看图片="当前查看图片"
                    @关闭="关闭图片查看器"
                    @复制URL="复制部分内容"
                    @新窗口打开="在新窗口打开图片" />
        
        <!-- 状态消息 -->
        <div v-if="显示操作消息" 
             class="status-message" 
             :class="{ 'visible': 显示操作消息 }">
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

.log-container {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    position: relative;
}

.log-loading {
    text-align: center;
    padding: 16px;
    color: #8b949e;
}

.no-logs-message {
    text-align: center;
    padding: 32px;
    color: #8b949e;
    font-style: italic;
}

.log-more {
    text-align: center;
    padding: 16px;
}

.log-more button {
    padding: 8px 16px;
    background-color: #21262d;
    border: 1px solid #30363d;
    border-radius: 4px;
    color: #c9d1d9;
    cursor: pointer;
}

.log-more button:hover {
    background-color: #30363d;
}

.status-message {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background-color: #21262d;
    border: 1px solid #30363d;
    border-radius: 4px;
    padding: 8px 16px;
    color: #c9d1d9;
    font-size: 14px;
    opacity: 0;
    transition: all 0.3s ease;
}

.status-message.visible {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
}
</style> 