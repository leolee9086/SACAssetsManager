/***
 * 这个的作用是替换掉原本的require
 * 使服务能够使用require从自定义的node_modules中加载模块
*/
import '../utils/hack/hackRequire.js'
import { createVueInterface } from '../../src/toolBox/feature/useVue/vueComponentLoader.js'
import * as Vue from '../../static/vue.esm-browser.js'
import * as SfcLoader from '../../static/vue3-sfc-loader.esm.js'
import { 日志 } from './utils/logger.js'

const channel = new BroadcastChannel('SACAssets')
window.channel = channel
channel.onmessage = (e) => {
    const path = require('path')
    if (!window.siyuanConfig && e.data && e.data.type && e.data.type === 'siyuanConfig') {
        window.siyuanConfig = e.data.data
        window.appID = e.data.app
        window.siyuanPort = e.data.siyuanPort
        window.require.setExternalBase(path.join(siyuanConfig.system.workspaceDir, '/data/plugins/SACAssetsManager/node_modules/'))
        window.require.setExternalDeps(path.join(siyuanConfig.system.workspaceDir, '/data/plugins/SACAssetsManager/node_modules/'))
        window.externalBase = path.join(siyuanConfig.system.workspaceDir, '/data/plugins/SACAssetsManager/node_modules/')
        window.workspaceDir = siyuanConfig.system.workspaceDir
        window.port = e.data.port
        if (window.require) {
            import("./server.js")
        }
    }
}

const modifyWebview = async () => {
    const webview = document.querySelector('webview')
    if (webview.src !== 'about:blank') {
        return
    }
    if (window.externalBase) {
        try {
        webview.src = `./imageStaticService.html?externalBase=${window.externalBase.replace(/\\/g, '/')}&port=${window.port + 1}`
        webview.openDevTools();
    } catch (e) {
            console.error('启用静态图片服务器失败:', e);
        }
    } else {
        setTimeout(() => {
            modifyWebview()
        }, 100)
    }
}

// 创建日志组件
const 创建日志组件 = async () => {
    try {
        // 等待DOM元素存在
        const logApp = document.getElementById('logApp');
        if (!logApp) {
            throw new Error('找不到日志容器元素');
        }

        // 创建并挂载组件
        console.log("开始加载日志组件...");

        // 初始化日志数据库
        await 初始化日志数据库();

        // 监听消息事件，用于初始测试
        window.addEventListener('message', (事件) => {
            if (事件.data && 事件.data.type === 'log') {
                // 注释掉此行，防止形成循环日志
                // console.log("接收到日志消息:", 事件.data.log);
            }
        });

        // 使用Options API风格的组件
        const logViewerComponent = {
            template: `
                <div class="log-viewer">
                    <div class="log-controls">
                        <select v-model="过滤级别">
                            <option value="">所有级别</option>
                            <option value="info">信息</option>
                            <option value="warn">警告</option>
                            <option value="error">错误</option>
                            <option value="debug">调试</option>
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
                        <div v-for="日志 in 显示的日志" 
                             :key="日志.id || 日志.行号" 
                             class="log-entry"
                             :class="日志.级别"
                             @click="复制日志(日志)">
                            <span v-if="显示时间戳" class="log-time">{{ 格式化时间(日志.时间) }}</span>
                            <span v-if="显示级别" class="log-level">{{ 日志.级别.toUpperCase() }}</span>
                            <span class="log-source">{{ 日志.来源 }}</span>
                            <span class="log-content">{{ 日志.内容 }}</span>
                        </div>
                        <div v-if="可以加载更多" class="log-more">
                            <button @click="加载更多日志">加载更早的日志</button>
                        </div>
                    </div>
                </div>
            `,
            data() {
                return {
                    日志列表: [],
                    最大内存日志数: 1000,  // 内存中保留的最大日志数
                    每页日志数: 200,      // 每次从数据库加载的日志数
                    自动滚动: true,
                    暂停接收: false,      // 添加暂停接收功能
                    过滤级别: '',
                    搜索文本: '',
                    显示时间戳: true,
                    显示级别: true,
                    显示行号: true,
                    待处理日志: [],       // 批量处理队列
                    正在处理: false,      // 标记是否正在处理日志
                    渲染延迟: null,       // 用于延迟渲染
                    上次渲染时间: 0,      // 控制渲染频率
                    丢弃日志数: 0,        // 记录丢弃的日志数
                    日志统计: {
                        total: 0,
                        info: 0,
                        warn: 0,
                        error: 0,
                        debug: 0
                    },
                    数据库日志计数: 0,     // 数据库中的日志总数
                    最早加载的时间戳: null, // 当前加载的最早日志时间戳
                    最新加载的时间戳: null, // 当前加载的最新日志时间戳
                    正在加载更多: false,   // 是否正在加载更多日志
                    可以加载更多: true,    // 是否还有更多日志可以加载
                    最近一次滚动时间: 0,   // 记录最近滚动事件时间
                }
            },
            computed: {
                过滤后的日志() {
                    let 结果 = this.日志列表;
                    
                    if (this.过滤级别 !== '') {
                        结果 = 结果.filter(日志 => 日志.级别 === this.过滤级别);
                    }
                    
                    if (this.搜索文本) {
                        const 搜索词 = this.搜索文本.toLowerCase();
                        结果 = 结果.filter(日志 => {
                            try {
                                return (日志.内容 && 日志.内容.toLowerCase().includes(搜索词)) ||
                                       (日志.来源 && 日志.来源.toLowerCase().includes(搜索词));
                            } catch (e) {
                                return false;
                            }
                        });
                    }
                    
                    return 结果;
                },
                显示的日志() {
                    // 返回过滤后的所有日志，因为已经通过数据库实现了高效分页
                    return this.过滤后的日志;
                }
            },
            methods: {
                格式化时间(时间字符串) {
                    try {
                        // 只显示时间部分，简化显示
                        const 日期 = new Date(时间字符串);
                        return 日期.toLocaleTimeString();
                    } catch (e) {
                        return 时间字符串;
                    }
                },
                添加日志(日志) {
                    // 如果暂停接收，则不添加新日志
                    if (this.暂停接收) {
                        this.丢弃日志数++;
                        return;
                    }
                    
                    // 如果队列过长，丢弃一些日志
                    if (this.待处理日志.length > 500) {
                        this.丢弃日志数 += (this.待处理日志.length - 500);
                        this.待处理日志 = this.待处理日志.slice(this.待处理日志.length - 500);
                    }
                    
                    // 将日志添加到待处理队列
                    this.待处理日志.push(日志);
                    
                    // 如果未启动处理，则启动批量处理
                    if (!this.正在处理) {
                        this.批量处理日志();
                    }
                },
                async 批量处理日志() {
                    this.正在处理 = true;
                    
                    // 限制渲染频率，避免频繁渲染导致界面卡顿
                    const 当前时间 = Date.now();
                    const 距离上次渲染时间 = 当前时间 - this.上次渲染时间;
                    
                    // 如果距离上次渲染时间太短，延迟执行
                    if (距离上次渲染时间 < 300 && this.待处理日志.length < 50) {
                        clearTimeout(this.渲染延迟);
                        this.渲染延迟 = setTimeout(() => {
                            this.批量处理日志();
                        }, 300 - 距离上次渲染时间);
                        return;
                    }
                    
                    // 清除可能存在的延迟定时器
                    clearTimeout(this.渲染延迟);
                    this.渲染延迟 = null;
                    this.上次渲染时间 = 当前时间;
                    
                    // 使用requestAnimationFrame确保UI不会卡顿
                    requestAnimationFrame(async () => {
                        // 每次最多处理20条日志
                        const 批次日志 = this.待处理日志.splice(0, Math.min(20, this.待处理日志.length));
                        const 处理后日志 = [];
                        
                        if (批次日志.length > 0) {
                            // 准备批量保存到数据库
                            const 数据库日志 = 批次日志.map(日志 => {
                                const 新日志 = {
                                    id: Date.now() + Math.random().toString(36).substr(2, 9), // 生成唯一ID
                                    时间: 日志.时间 || new Date().toISOString(),
                                    级别: 日志.级别 || 'info',
                                    内容: 日志.内容 || '',
                                    来源: 日志.来源 || 'Console'
                                };
                                
                                处理后日志.push(新日志);
                                
                                // 更新统计
                                this.日志统计.total++;
                                if (新日志.级别) {
                                    this.日志统计[新日志.级别]++;
                                }
                                
                                return 新日志;
                            });
                            
                            // 保存到数据库
                            try {
                                await 保存日志到数据库(数据库日志);
                                
                                // 获取数据库日志数量
                                this.数据库日志计数 = await 获取日志计数();
                                
                                // 更新内存中的日志列表（新日志添加到前面以便显示最新的）
                                this.日志列表 = [...this.日志列表, ...处理后日志];
                                
                                // 限制内存中的日志数量
                                this.应用最大日志数();
                                
                                // 更新最新时间戳
                                if (处理后日志.length > 0) {
                                    const 最新日志 = 处理后日志[处理后日志.length - 1];
                                    this.最新加载的时间戳 = 最新日志.时间;
                                    
                                    // 如果还没有最早时间戳，也设置它
                                    if (!this.最早加载的时间戳) {
                                        this.最早加载的时间戳 = 最新日志.时间;
                                    }
                                }
                                
                                // 如果启用了自动滚动，滚动到底部
                                if (this.自动滚动) {
                                    this.$nextTick(() => {
                                        if (this.$refs.日志容器) {
                                            this.$refs.日志容器.scrollTop = this.$refs.日志容器.scrollHeight;
                                        }
                                    });
                                }
                            } catch (错误) {
                                console.error('保存日志到数据库失败:', 错误);
                            }
                            
                            // 如果还有待处理日志，继续批量处理
                            if (this.待处理日志.length > 0) {
                                // 使用setTimeout而不是立即递归，给UI线程留出时间
                                setTimeout(() => {
                                    this.批量处理日志();
                                }, 50);
                            } else {
                                this.正在处理 = false;
                            }
                        } else {
                            this.正在处理 = false;
                        }
                    });
                },
                应用最大日志数() {
                    // 当内存中日志数量超过最大数量时，从头部移除多余日志
                    if (this.日志列表.length > this.最大内存日志数) {
                        // 只从内存中移除，数据库中的日志保持不变
                        this.日志列表 = this.日志列表.slice(this.日志列表.length - this.最大内存日志数);
                    }
                },
                async 清空日志() {
                    try {
                        // 清空内存中的日志
                        this.日志列表 = [];
                        this.待处理日志 = [];
                        
                        // 清空数据库中的日志
                        await 清空日志数据库();
                        
                        // 重置统计和时间戳
                        this.日志统计 = {
                            total: 0,
                            info: 0,
                            warn: 0,
                            error: 0,
                            debug: 0
                        };
                        this.数据库日志计数 = 0;
                        this.最早加载的时间戳 = null;
                        this.最新加载的时间戳 = null;
                        this.可以加载更多 = false;
                    } catch (错误) {
                        console.error('清空日志数据库失败:', 错误);
                    }
                },
                切换自动滚动() {
                    this.自动滚动 = !this.自动滚动;
                },
                async 导出日志() {
                    try {
                        // 从数据库导出所有日志，每次最多导出10000条
                        let 所有日志 = [];
                        let 页码 = 0;
                        const 每页数量 = 10000;
                        let 继续导出 = true;
                        
                        while (继续导出) {
                            const 日志批次 = await 从数据库加载日志(页码, 每页数量);
                            所有日志 = [...所有日志, ...日志批次];
                            
                            if (日志批次.length < 每页数量) {
                                继续导出 = false;
                            } else {
                                页码++;
                            }
                            
                            // 安全限制，最多导出100万条
                            if (所有日志.length >= 1000000) {
                                继续导出 = false;
                            }
                        }
                        
                        const 文本 = 所有日志.map(日志 => 
                            `[${日志.时间 || ''}] ${(日志.级别 || '').toUpperCase()}: [${日志.来源 || ''}] ${日志.内容 || ''}`
                        ).join('\n');
                        
                        const blob = new Blob([文本], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `日志_${new Date().toLocaleDateString().replace(/[\/\s:]/g, '_')}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                    } catch (e) {
                        console.error('导出日志失败:', e);
                    }
                },
                复制日志(日志) {
                    try {
                        const 文本 = `[${日志.时间 || ''}] ${(日志.级别 || '').toUpperCase()}: [${日志.来源 || ''}] ${日志.内容 || ''}`;
                        navigator.clipboard.writeText(文本).catch(err => {
                            console.error('复制失败:', err);
                        });
                    } catch (e) {
                        console.error('复制日志失败:', e);
                    }
                },
                async 加载更多日志() {
                    if (this.正在加载更多 || !this.最早加载的时间戳) return;
                    
                    this.正在加载更多 = true;
                    
                    try {
                        // 加载早于最早时间戳的日志
                        const 较早日志 = await 加载早于时间戳的日志(this.最早加载的时间戳, this.每页日志数);
                        
                        if (较早日志.length > 0) {
                            // 更新最早的时间戳
                            this.最早加载的时间戳 = 较早日志[较早日志.length - 1].时间;
                            
                            // 将较早的日志添加到列表前面
                            this.日志列表 = [...较早日志, ...this.日志列表];
                            
                            // 限制内存中的日志总数
                            if (this.日志列表.length > this.最大内存日志数) {
                                this.日志列表 = this.日志列表.slice(0, this.最大内存日志数);
                            }
                        } else {
                            // 没有更多日志了
                            this.可以加载更多 = false;
                        }
                    } catch (错误) {
                        console.error('加载更多日志失败:', 错误);
                    } finally {
                        this.正在加载更多 = false;
                    }
                },
                处理滚动事件(事件) {
                    // 节流处理，避免频繁触发
                    const 当前时间 = Date.now();
                    if (当前时间 - this.最近一次滚动时间 < 200) return;
                    this.最近一次滚动时间 = 当前时间;
                    
                    const 容器 = this.$refs.日志容器;
                    if (!容器) return;
                    
                    // 检测是否滚动到顶部附近，如果是，则加载更多日志
                    if (容器.scrollTop < 50 && this.可以加载更多 && !this.正在加载更多) {
                        // 记录当前滚动位置
                        const 当前滚动高度 = 容器.scrollHeight;
                        
                        // 异步加载更多日志
                        this.加载更多日志().then(() => {
                            // 加载完成后，调整滚动位置，保持相对位置不变
                            this.$nextTick(() => {
                                const 新滚动高度 = 容器.scrollHeight;
                                const 高度差 = 新滚动高度 - 当前滚动高度;
                                容器.scrollTop = 高度差 + 50; // +50是为了避免触发新的加载
                            });
                        });
                    }
                    
                    // 检测是否滚动到底部，用于设置自动滚动状态
                    const 接近底部 = 容器.scrollHeight - 容器.scrollTop - 容器.clientHeight < 50;
                    this.自动滚动 = 接近底部;
                },
                handleMessage(事件) {
                    if (事件.data && 事件.data.type === 'log' && 事件.data.log) {
                        this.添加日志(事件.data.log);
                    }
                },
                async 初始加载日志() {
                    try {
                        // 获取数据库中的日志计数
                        this.数据库日志计数 = await 获取日志计数();
                        
                        // 加载最新的日志
                        const 最新日志 = await 从数据库加载日志(0, this.最大内存日志数);
                        
                        if (最新日志.length > 0) {
                            this.日志列表 = 最新日志;
                            
                            // 更新时间戳范围
                            this.最新加载的时间戳 = 最新日志[0].时间;
                            this.最早加载的时间戳 = 最新日志[最新日志.length - 1].时间;
                            
                            // 更新统计
                            最新日志.forEach(日志 => {
                                this.日志统计.total++;
                                if (日志.级别) {
                                    this.日志统计[日志.级别]++;
                                }
                            });
                            
                            // 设置可以加载更多的标志
                            this.可以加载更多 = 最新日志.length < this.数据库日志计数;
                        }
                    } catch (错误) {
                        console.error('初始加载日志失败:', 错误);
                    }
                }
            },
            async mounted() {
                window.addEventListener('message', this.handleMessage);
                
                // 初始加载日志
                await this.初始加载日志();
                
                // 设置自动滚动到底部
                this.$nextTick(() => {
                    if (this.$refs.日志容器) {
                        this.$refs.日志容器.scrollTop = this.$refs.日志容器.scrollHeight;
                    }
                });
            },
            beforeUnmount() {
                window.removeEventListener('message', this.handleMessage);
            }
        };

        // 创建Vue应用
        const app = Vue.createApp(logViewerComponent);
        app.mount(logApp);

        // 重写console方法
        const 原始console = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            debug: console.debug
        };

        // 标记是否正在处理日志，防止循环调用
        let 正在处理日志 = false;

        const 格式化参数 = (arg) => {
            if (arg === undefined) return 'undefined';
            if (arg === null) return 'null';
            
            if (typeof arg === 'string') {
                // 尝试检测已经是JSON字符串的情况，避免重复转义
                if (arg.startsWith('{') && arg.endsWith('}') || 
                    arg.startsWith('[') && arg.endsWith(']')) {
                    try {
                        // 尝试解析，如果成功，说明已经是有效的JSON字符串
                        JSON.parse(arg);
                        return arg; // 直接返回原始字符串，不再二次转义
                    } catch (e) {
                        // 解析失败，说明不是有效JSON，按普通字符串处理
                    }
                }
                // 检测是否已有连续多个反斜杠，可能已经被转义过
                if (arg.includes('\\\\')) {
                    try {
                        // 尝试解除一层转义
                        return JSON.parse(`"${arg}"`);
                    } catch (e) {
                        // 解析失败，保持原样
                    }
                }
                return arg;
            }
            
            if (typeof arg === 'number' || typeof arg === 'boolean') return arg.toString();
            
            try {
                // 对于对象和数组，限制其内容长度，避免超大对象
                if (typeof arg === 'object' && arg !== null) {
                    // 如果是Error对象，特殊处理
                    if (arg instanceof Error) {
                        return `Error: ${arg.message}`;
                    }
                    
                    // 限制数组长度
                    if (Array.isArray(arg) && arg.length > 100) {
                        arg = arg.slice(0, 100);
                        arg.push('...(已截断)');
                    }
                    
                    // 预防循环引用
                    const seen = new WeakSet();
                    
                    // 避免循环引用和复杂对象导致的问题
                    return JSON.stringify(arg, (key, value) => {
                        // 忽略特别长的字符串值
                        if (typeof value === 'string' && value.length > 500) {
                            return value.substring(0, 500) + '...(已截断)';
                        }
                        
                        // 处理特殊值
                        if (value !== value) return 'NaN'; // 处理NaN
                        if (value === Infinity) return 'Infinity';
                        if (value === -Infinity) return '-Infinity';
                        if (typeof value === 'function') return '[Function]';
                        if (typeof value === 'symbol') return value.toString();
                        
                        // 检测循环引用
                        if (typeof value === 'object' && value !== null) {
                            if (seen.has(value)) {
                                return '[循环引用]';
                            }
                            seen.add(value);
                            
                            // 限制对象的属性数量
                            if (Object.keys(value).length > 20) {
                                const limitedObj = {};
                                let count = 0;
                                for (const k in value) {
                                    if (count >= 20) break;
                                    limitedObj[k] = value[k];
                                    count++;
                                }
                                limitedObj['...(已截断)'] = `还有${Object.keys(value).length - 20}个属性`;
                                return limitedObj;
                            }
                        }
                        
                        return value;
                    }, 2);
                }
                
                return String(arg);
            } catch (e) {
                return `[无法序列化的对象: ${e.message}]`;
            }
        };

        const 发送日志 = (级别, args) => {
            try {
                // 如果已经在处理日志中，不再发送消息，防止循环
                if (正在处理日志) {
                    return;
                }
                
                正在处理日志 = true;
                
                const 日志 = {
                    时间: new Date().toISOString(),
                    级别: 级别,
                    内容: args.map(格式化参数).join(' '),
                    来源: 'Console'
                };
                window.postMessage({ type: 'log', log: 日志 }, '*');
                
                正在处理日志 = false;
            } catch (e) {
                正在处理日志 = false;
                原始console.error('发送日志失败:', e);
            }
        };

        // 节流函数，防止短时间内过多日志消息导致界面卡顿
        const 节流 = (fn, delay = 50) => {
            let 上次执行时间 = 0;
            let 队列 = [];
            let 定时器ID = null;
            let 已丢弃日志数 = 0;
            
            const 处理队列 = () => {
                定时器ID = null;
                const 当前时间 = Date.now();
                
                // 如果队列过长，丢弃部分日志，保留最新的部分
                if (队列.length > 200) {
                    已丢弃日志数 += (队列.length - 200);
                    队列 = 队列.slice(队列.length - 200);
                    
                    // 添加一条日志通知用户丢弃了部分日志
                    if (已丢弃日志数 > 0 && 已丢弃日志数 % 100 === 0) {
                        队列.unshift(['warn', [`已丢弃 ${已丢弃日志数} 条日志，日志量过大可能导致性能问题`]]);
                    }
                }
                
                if (当前时间 - 上次执行时间 >= delay) {
                    if (队列.length > 0) {
                        // 仅处理最近的10条日志，避免堆积
                        const 批次 = 队列.splice(0, Math.min(10, 队列.length));
                        批次.forEach(args => fn(...args));
                        上次执行时间 = 当前时间;
                    }
                }
                
                if (队列.length > 0) {
                    定时器ID = setTimeout(处理队列, delay);
                }
            };
            
            return (...args) => {
                队列.push(args);
                
                // 如果队列中只有这一项且没有定时器在运行，启动处理
                if (!定时器ID) {
                    定时器ID = setTimeout(处理队列, delay);
                }
            };
        };

        const 节流发送日志 = 节流(发送日志);

        console.log = (...args) => {
            // 防止循环日志的简单处理
            // 如果第一个参数是字符串且包含"接收到日志消息"，不再发送到日志组件
            if (args.length > 0 && 
                typeof args[0] === 'string' && 
                (args[0].includes('接收到日志消息') || args[0].includes('操作日志'))) {
                原始console.log.apply(console, args);
                return;
            }
            
            原始console.log.apply(console, args);
            节流发送日志('info', args);
        };

        console.warn = (...args) => {
            if (args.length > 0 && 
                typeof args[0] === 'string' && 
                (args[0].includes('接收到日志消息') || args[0].includes('操作日志'))) {
                原始console.warn.apply(console, args);
                return;
            }
            
            原始console.warn.apply(console, args);
            节流发送日志('warn', args);
        };

        console.error = (...args) => {
            if (args.length > 0 && 
                typeof args[0] === 'string' && 
                (args[0].includes('接收到日志消息') || args[0].includes('操作日志'))) {
                原始console.error.apply(console, args);
                return;
            }
            
            原始console.error.apply(console, args);
            节流发送日志('error', args);
        };

        console.debug = (...args) => {
            if (args.length > 0 && 
                typeof args[0] === 'string' && 
                (args[0].includes('接收到日志消息') || args[0].includes('操作日志'))) {
                原始console.debug.apply(console, args);
                return;
            }
            
            原始console.debug.apply(console, args);
            节流发送日志('debug', args);
        };

        // 导出日志组件方法
        window.日志组件 = {
            添加日志: (日志) => {
                // 确保日志对象格式正确
                if (日志 && typeof 日志 === 'object') {
                    const 处理后日志 = {
                        时间: 日志.时间 || new Date().toISOString(),
                        级别: 日志.级别 || 'info',
                        内容: typeof 日志.内容 === 'string' ? 日志.内容 : 格式化参数(日志.内容),
                        来源: 日志.来源 || 'System'
                    };
                    window.postMessage({ type: 'log', log: 处理后日志 }, '*');
                }
            }
        };

        日志.信息('日志组件初始化完成', 'System');
    } catch (error) {
        console.error('日志组件初始化失败:', error);
    }
};

// 使用IndexedDB实现高性能日志数据库
let 日志数据库;
const 数据库名称 = 'SACAssetsManager_日志数据库';
const 数据库版本 = 1;
const 日志存储名称 = '日志存储';

// 初始化日志数据库
const 初始化日志数据库 = () => {
    return new Promise((resolve, reject) => {
        const 请求 = indexedDB.open(数据库名称, 数据库版本);
        
        请求.onerror = (事件) => {
            console.error('打开日志数据库失败:', 事件.target.error);
            reject(事件.target.error);
        };
        
        请求.onsuccess = (事件) => {
            日志数据库 = 事件.target.result;
            console.log('日志数据库打开成功');
            resolve();
        };
        
        请求.onupgradeneeded = (事件) => {
            const 数据库 = 事件.target.result;
            
            // 创建日志对象存储
            if (!数据库.objectStoreNames.contains(日志存储名称)) {
                const 存储 = 数据库.createObjectStore(日志存储名称, { keyPath: 'id' });
                
                // 创建索引以便高效查询
                存储.createIndex('时间', '时间', { unique: false });
                存储.createIndex('级别', '级别', { unique: false });
                存储.createIndex('来源', '来源', { unique: false });
                
                console.log('日志数据库结构创建成功');
            }
        };
    });
};

// 保存日志到数据库（支持批量保存）
const 保存日志到数据库 = (日志列表) => {
    return new Promise((resolve, reject) => {
        if (!日志数据库) {
            reject(new Error('日志数据库未初始化'));
            return;
        }
        
        const 事务 = 日志数据库.transaction([日志存储名称], 'readwrite');
        const 存储 = 事务.objectStore(日志存储名称);
        
        let 待完成计数 = 日志列表.length;
        let 出错 = false;
        
        // 监听事务完成
        事务.oncomplete = () => {
            if (!出错) resolve();
        };
        
        事务.onerror = (事件) => {
            出错 = true;
            reject(事件.target.error);
        };
        
        // 批量添加日志
        for (const 日志 of 日志列表) {
            const 请求 = 存储.add(日志);
            
            请求.onsuccess = () => {
                待完成计数--;
                if (待完成计数 === 0 && !出错) {
                    resolve();
                }
            };
            
            请求.onerror = (事件) => {
                console.error('保存日志失败:', 事件.target.error);
                出错 = true;
                reject(事件.target.error);
            };
        }
    });
};

// 从数据库加载日志（支持分页）
const 从数据库加载日志 = (页码 = 0, 每页数量 = 100) => {
    return new Promise((resolve, reject) => {
        if (!日志数据库) {
            reject(new Error('日志数据库未初始化'));
            return;
        }
        
        const 事务 = 日志数据库.transaction([日志存储名称], 'readonly');
        const 存储 = 事务.objectStore(日志存储名称);
        const 索引 = 存储.index('时间');
        
        // 使用游标进行分页
        const 日志列表 = [];
        let 跳过数量 = 页码 * 每页数量;
        let 已获取数量 = 0;
        
        const 请求 = 索引.openCursor(null, 'prev'); // 降序排列，最新的日志在前
        
        请求.onsuccess = (事件) => {
            const 游标 = 事件.target.result;
            
            if (游标) {
                if (跳过数量 > 0) {
                    跳过数量--;
                    游标.continue();
                } else if (已获取数量 < 每页数量) {
                    日志列表.push(游标.value);
                    已获取数量++;
                    游标.continue();
                } else {
                    resolve(日志列表);
                }
            } else {
                resolve(日志列表);
            }
        };
        
        请求.onerror = (事件) => {
            reject(事件.target.error);
        };
    });
};

// 加载早于指定时间戳的日志
const 加载早于时间戳的日志 = (时间戳, 数量 = 100) => {
    return new Promise((resolve, reject) => {
        if (!日志数据库) {
            reject(new Error('日志数据库未初始化'));
            return;
        }
        
        const 事务 = 日志数据库.transaction([日志存储名称], 'readonly');
        const 存储 = 事务.objectStore(日志存储名称);
        const 索引 = 存储.index('时间');
        
        // 设置时间范围，查找早于指定时间戳的日志
        const 范围 = IDBKeyRange.upperBound(时间戳, true);
        
        const 日志列表 = [];
        let 已获取数量 = 0;
        
        const 请求 = 索引.openCursor(范围, 'prev'); // 降序排列
        
        请求.onsuccess = (事件) => {
            const 游标 = 事件.target.result;
            
            if (游标 && 已获取数量 < 数量) {
                日志列表.push(游标.value);
                已获取数量++;
                游标.continue();
            } else {
                resolve(日志列表);
            }
        };
        
        请求.onerror = (事件) => {
            reject(事件.target.error);
        };
    });
};

// 获取数据库中的日志总数
const 获取日志计数 = () => {
    return new Promise((resolve, reject) => {
        if (!日志数据库) {
            reject(new Error('日志数据库未初始化'));
            return;
        }
        
        const 事务 = 日志数据库.transaction([日志存储名称], 'readonly');
        const 存储 = 事务.objectStore(日志存储名称);
        
        const 计数请求 = 存储.count();
        
        计数请求.onsuccess = () => {
            resolve(计数请求.result);
        };
        
        计数请求.onerror = (事件) => {
            reject(事件.target.error);
        };
    });
};

// 清空日志数据库
const 清空日志数据库 = () => {
    return new Promise((resolve, reject) => {
        if (!日志数据库) {
            reject(new Error('日志数据库未初始化'));
            return;
        }
        
        const 事务 = 日志数据库.transaction([日志存储名称], 'readwrite');
        const 存储 = 事务.objectStore(日志存储名称);
        
        const 请求 = 存储.clear();
        
        请求.onsuccess = () => {
            resolve();
        };
        
        请求.onerror = (事件) => {
            reject(事件.target.error);
        };
    });
};

// 确保在DOM加载完成后创建日志组件
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', 创建日志组件);
} else {
    创建日志组件();
}

modifyWebview()
