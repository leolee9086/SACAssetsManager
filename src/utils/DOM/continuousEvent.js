/**
 * @typedef {Object} 事件监听选项
 * @property {number} [最大触发次数=0] - 最大检测触发次数，0表示无限制
 * @property {boolean} [阻止默认行为=false] - 是否阻止默认事件
 * @property {boolean} [阻止冒泡=false] - 是否阻止事件冒泡
 */

/**
 * 创建事件状态管理器
 * @returns {[Function, Function]} [更新状态的函数, 重置状态的函数]
 */
function 创建事件状态() {
    let 上次触发时间 = 0;
    let 触发次数 = 0;

    const 更新状态 = (时间间隔) => {
        const 当前时间 = Date.now();
        const 时间差 = 当前时间 - 上次触发时间;
        
        触发次数 = 时间差 < 时间间隔 ? 触发次数 + 1 : 1;
        上次触发时间 = 当前时间;
        
        return 触发次数;
    };

    const 重置状态 = () => {
        触发次数 = 0;
        上次触发时间 = 0;
    };

    return [更新状态, 重置状态];
}

/**
 * 添加连续事件监听器
 * @param {HTMLElement} 元素 - 要添加监听器的元素
 * @param {string} 事件类型 - 事件类型（如 'click', 'mousemove', 'keydown' 等）
 * @param {number} 时间间隔 - 两次事件触发之间的最大间隔时间（毫秒）
 * @param {Function} 回调函数 - 回调函数，参数为触发次数和事件对象
 * @param {事件监听选项} [选项={}] - 配置选项
 * @returns {Function} 移除监听器的函数
 */
export function 添加连续事件监听(元素, 事件类型, 时间间隔, 回调函数, 选项 = {}) {
    const { 最大触发次数 = 0, 阻止默认行为 = false, 阻止冒泡 = false } = 选项;
    const [更新事件状态, 重置事件状态] = 创建事件状态();
    let 定时器 = null;

    const 处理事件 = (事件) => {
        if (阻止默认行为) {
            事件.preventDefault();
        }
        if (阻止冒泡) {
            事件.stopPropagation();
        }

        if (定时器) {
            clearTimeout(定时器);
        }

        const 当前触发次数 = 更新事件状态(时间间隔);

        // 达到最大触发次数时立即触发回调
        if (最大触发次数 && 当前触发次数 === 最大触发次数) {
            回调函数(当前触发次数, 事件);
            重置事件状态();
            return;
        }

        // 等待下一次可能的触发
        定时器 = setTimeout(() => {
            回调函数(当前触发次数, 事件);
            重置事件状态();
        }, 时间间隔);
    };

    元素.addEventListener(事件类型, 处理事件);

    return () => {
        if (定时器) {
            clearTimeout(定时器);
        }
        元素.removeEventListener(事件类型, 处理事件);
    };
}

// 为常用事件创建便捷方法
export const 添加连续点击监听 = (元素, 时间间隔, 回调函数, 选项) => 
    添加连续事件监听(元素, 'click', 时间间隔, 回调函数, 选项);

export const 添加连续移动监听 = (元素, 时间间隔, 回调函数, 选项) => 
    添加连续事件监听(元素, 'mousemove', 时间间隔, 回调函数, 选项);

export const 添加连续按键监听 = (元素, 时间间隔, 回调函数, 选项) => 
    添加连续事件监听(元素, 'keydown', 时间间隔, 回调函数, 选项);

/**
 * 添加连续点击监听器，返回一个封装后的函数，用于传入 addEventListener
 * @param {number} [时间间隔=300] - 连续点击的时间间隔（毫秒）
 * @param {Function[]} 回调函数组 - 回调函数数组，索引对应点击次数（从1开始）
 * @returns {Function} 事件处理函数
 */
export function buildMultiClickListener(时间间隔 = 300, 回调函数组) {
    const [更新事件状态, 重置事件状态] = 创建事件状态();
    let 定时器 = null;

    return function (事件) {
        if (定时器) {
            clearTimeout(定时器);
        }

        const 当前触发次数 = 更新事件状态(时间间隔);
        const 当前回调 = 回调函数组[当前触发次数 - 1];

        if (当前回调) {
            定时器 = setTimeout(() => {
                当前回调(事件);
                重置事件状态();
            }, 时间间隔);
        }
    };
}