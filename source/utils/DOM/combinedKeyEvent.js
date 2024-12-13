// 导入必要的依赖
import { 检查按键状态 } from './withKeyStateEvent.js';
import { 创建事件状态 } from './continuousEvent.js';

/**
 * @typedef {Object} 组合连续事件选项
 * @property {string[]} [必需按键=[]] - 必须按下的按键代码列表
 * @property {string[]} [禁用按键=[]] - 不能按下的按键代码列表
 * @property {number} [时间间隔=300] - 连续事件的时间间隔（毫秒）
 * @property {number} [最大触发次数=0] - 最大检测触发次数，0表示无限制
 * @property {boolean} [阻止默认行为=false] - 是否阻止默认事件
 * @property {boolean} [阻止冒泡=false] - 是否阻止事件冒泡
 */

/**
 * 添加组合连续事件监听器
 * @param {HTMLElement} 元素
 * @param {string} 事件类型 - 要监听的事件类型（如 'click', 'mousemove'）
 * @param {Function} 回调函数 - (触发次数, 键盘事件, 事件) => void
 * @param {组合连续事件选项} 选项
 * @returns {Function} 清理函数
 */
export function 添加组合连续事件监听(元素, 事件类型, 回调函数, 选项 = {}) {
    const {
        必需按键 = [],
        禁用按键 = [],
        时间间隔 = 300,
        最大触发次数 = 0,
        阻止默认行为 = false,
        阻止冒泡 = false
    } = 选项;

    let 当前键盘事件 = null;
    const [更新事件状态, 重置事件状态] = 创建事件状态();
    let 定时器 = null;

    // 处理键盘事件
    const 处理键盘事件 = (事件) => {
        当前键盘事件 = 事件;
    };

    // 处理目标事件（如点击、移动等）
    const 处理目标事件 = (事件) => {
        // 检查按键状态是否满足要求
        if (!检查按键状态(当前键盘事件, 事件, 必需按键, 禁用按键)) {
            重置事件状态();
            return;
        }

        if (阻止默认行为) {
            事件.preventDefault();
            当前键盘事件?.preventDefault();
        }
        if (阻止冒泡) {
            事件.stopPropagation();
            当前键盘事件?.stopPropagation();
        }

        if (定时器) {
            clearTimeout(定时器);
        }

        const 当前触发次数 = 更新事件状态(时间间隔);

        // 达到最大触发次数时立即触发
        if (最大触发次数 && 当前触发次数 === 最大触发次数) {
            回调函数(当前触发次数, 当前键盘事件, 事件);
            重置事件状态();
            return;
        }

        // 等待下一次可能的触发
        定时器 = setTimeout(() => {
            回调函数(当前触发次数, 当前键盘事件, 事件);
            重置事件状态();
        }, 时间间隔);
    };

    // 清除键盘状态
    const 清除键盘状态 = () => {
        当前键盘事件 = null;
        重置事件状态();
        if (定时器) {
            clearTimeout(定时器);
        }
    };

    // 添加事件监听
    元素.addEventListener('keydown', 处理键盘事件);
    元素.addEventListener('keyup', 清除键盘状态);
    元素.addEventListener(事件类型, 处理目标事件);

    // 返回清理函数
    return () => {
        元素.removeEventListener('keydown', 处理键盘事件);
        元素.removeEventListener('keyup', 清除键盘状态);
        元素.removeEventListener(事件类型, 处理目标事件);
        if (定时器) {
            clearTimeout(定时器);
        }
    };
}

// 便捷方法：组合连续点击
export function 添加组合连续点击监听(元素, 回调函数, 选项 = {}) {
    return 添加组合连续事件监听(元素, 'click', 回调函数, 选项);
}

// 便捷方法：支持不同次数的组合点击回调
export function 创建组合多次点击监听器(选项 = {}, 回调函数组) {
    const { 时间间隔 = 300, ...其他选项 } = 选项;
    
    return function(元素) {
        return 添加组合连续点击监听(元素, (触发次数, 键盘事件, 事件) => {
            const 当前回调 = 回调函数组[触发次数 - 1];
            if (当前回调) {
                当前回调(键盘事件, 事件);
            }
        }, { 时间间隔, ...其他选项 });
    };
} 