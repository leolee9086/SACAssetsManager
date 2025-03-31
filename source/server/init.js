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
                        <input type="number" v-model="最大日志数" min="100" max="10000" step="100" @change="应用最大日志数">
                        <input type="text" v-model="搜索文本" placeholder="搜索日志...">
                        <button @click="清空日志">清空</button>
                        <button @click="切换自动滚动">{{ 自动滚动 ? '关闭自动滚动' : '开启自动滚动' }}</button>
                        <button @click="导出日志">导出</button>
                        <button @click="暂停接收 = !暂停接收">{{ 暂停接收 ? '恢复接收' : '暂停接收' }}</button>
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
                    <div class="log-container" ref="日志容器">
                        <div v-for="日志 in 显示的日志" 
                             :key="日志.行号" 
                             class="log-entry"
                             :class="日志.级别"
                             @click="复制日志(日志)">
                            <span v-if="显示时间戳" class="log-time">{{ 格式化时间(日志.时间) }}</span>
                            <span v-if="显示级别" class="log-level">{{ 日志.级别.toUpperCase() }}</span>
                            <span class="log-source">{{ 日志.来源 }}</span>
                            <span class="log-content">{{ 日志.内容 }}</span>
                        </div>
                        <div v-if="过滤后的日志.length > 显示的日志.length" class="log-more">
                            显示前 {{ 显示的日志.length }} 条日志，共 {{ 过滤后的日志.length }} 条
                            <button @click="加载更多日志">加载更多</button>
                        </div>
                    </div>
                </div>
            `,
            data() {
                return {
                    日志列表: [],
                    最大日志数: 300,  // 进一步降低默认最大日志数
                    每页日志数: 50,   // 减少默认显示条数，提高性能
                    自动滚动: true,
                    暂停接收: false,  // 添加暂停接收功能
                    过滤级别: '',
                    搜索文本: '',
                    显示时间戳: true,
                    显示级别: true,
                    显示行号: true,
                    待处理日志: [],  // 用于批量处理日志
                    正在处理: false,  // 标记是否正在处理日志
                    渲染延迟: null,   // 用于延迟渲染
                    上次渲染时间: 0,  // 控制渲染频率
                    丢弃日志数: 0,    // 记录丢弃的日志数
                    日志统计: {
                        total: 0,
                        info: 0,
                        warn: 0,
                        error: 0,
                        debug: 0
                    }
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
                    // 只显示过滤后日志的前N条，提高渲染性能
                    return this.过滤后的日志.slice(0, this.每页日志数);
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
                批量处理日志() {
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
                    requestAnimationFrame(() => {
                        // 每次最多处理10条日志
                        const 批次日志 = this.待处理日志.splice(0, Math.min(10, this.待处理日志.length));
                        
                        if (批次日志.length > 0) {
                            批次日志.forEach(日志 => {
                                this.处理单条日志(日志);
                            });
                            
                            // 如果还有待处理日志，继续批量处理
                            if (this.待处理日志.length > 0) {
                                // 使用setTimeout而不是立即递归，给UI线程留出时间
                                setTimeout(() => {
                                    this.批量处理日志();
                                }, 50);
                            } else {
                                this.正在处理 = false;
                                
                                // 只在所有日志处理完成后执行一次滚动
                                if (this.自动滚动) {
                                    this.$nextTick(() => {
                                        if (this.$refs.日志容器) {
                                            this.$refs.日志容器.scrollTop = this.$refs.日志容器.scrollHeight;
                                        }
                                    });
                                }
                            }
                        } else {
                            this.正在处理 = false;
                        }
                    });
                },
                处理单条日志(日志) {
                    const 新日志 = {
                        ...日志,
                        时间: 日志.时间 || new Date().toISOString(),
                        行号: this.日志列表.length + 1
                    };
                    
                    this.日志列表.push(新日志);
                    
                    // 更新统计
                    this.日志统计.total++;
                    if (新日志.级别) {
                        this.日志统计[新日志.级别]++;
                    }
                    
                    // 限制日志数量
                    this.应用最大日志数();
                },
                应用最大日志数() {
                    // 当日志数量超过最大数量时，从头部移除多余日志
                    if (this.日志列表.length > this.最大日志数) {
                        const 要移除的日志数 = this.日志列表.length - this.最大日志数;
                        
                        if (要移除的日志数 > 0) {
                            // 更新统计信息
                            for (let i = 0; i < 要移除的日志数; i++) {
                                const 移除日志 = this.日志列表[i];
                                if (移除日志.级别) {
                                    this.日志统计[移除日志.级别]--;
                                }
                                this.日志统计.total--;
                            }
                            
                            // 移除多余日志
                            this.日志列表.splice(0, 要移除的日志数);
                        }
                    }
                },
                清空日志() {
                    this.日志列表 = [];
                    this.待处理日志 = [];
                    this.日志统计 = {
                        total: 0,
                        info: 0,
                        warn: 0,
                        error: 0,
                        debug: 0
                    };
                },
                切换自动滚动() {
                    this.自动滚动 = !this.自动滚动;
                },
                导出日志() {
                    // 防止导出太多日志导致浏览器卡死
                    const 最大导出数 = 10000;
                    const 要导出的日志 = this.过滤后的日志.slice(0, 最大导出数);
                    
                    const 文本 = 要导出的日志.map(日志 => 
                        `[${日志.时间 || ''}] ${(日志.级别 || '').toUpperCase()}: [${日志.来源 || ''}] ${日志.内容 || ''}`
                    ).join('\n');
                    
                    try {
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
                加载更多日志() {
                    // 每次点击"加载更多"时，增加显示的日志数量
                    this.每页日志数 += 50;
                },
                handleMessage(事件) {
                    if (事件.data && 事件.data.type === 'log' && 事件.data.log) {
                        this.添加日志(事件.data.log);
                    }
                }
            },
            mounted() {
                window.addEventListener('message', this.handleMessage);
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

// 确保在DOM加载完成后创建日志组件
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', 创建日志组件);
} else {
    创建日志组件();
}

modifyWebview()
