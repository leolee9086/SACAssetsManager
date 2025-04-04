/**
 * @typedef {Object} 按键状态选项
 * @property {string[]} [必需按键=[]] - 必须按下的按键代码列表
 * @property {string[]} [禁用按键=[]] - 不能按下的按键代码列表
 * @property {boolean} [阻止默认行为=false] - 是否阻止默认事件
 * @property {boolean} [阻止冒泡=false] - 是否阻止事件冒泡
 */

/**
 * 检查按键状态
 * @param {KeyboardEvent} 键盘事件 
 * @param {MouseEvent} 鼠标事件
 * @param {string[]} 必需按键 
 * @param {string[]} 禁用按键
 * @returns {boolean}
 */
function 检查按键状态(键盘事件, 鼠标事件, 必需按键 = [], 禁用按键 = []) {
    // 记录当前按下的所有按键
    const 当前按键集合 = new Set();
    // 添加键盘按键
    if(键盘事件) {
        当前按键集合.add(键盘事件.code);
    }
    // 添加鼠标按键
    if(鼠标事件) {
        switch(鼠标事件.buttons) {
            case 1: 当前按键集合.add('LeftButton'); break;
            case 2: 当前按键集合.add('RightButton'); break;
            case 4: 当前按键集合.add('MiddleButton'); break;
        }
    }
    // 检查禁用按键
    if(禁用按键.some(键 => 当前按键集合.has(键))) {
        return false;
    }
    // 检查必需按键
    return 必需按键.every(键 => 当前按键集合.has(键));
}

/**
 * 添加组合按键事件监听
 * @param {HTMLElement} 元素
 * @param {Function} 回调函数
 * @param {按键状态选项} 选项
 */
export function 添加组合按键事件监听(元素, 回调函数, 选项 = {}) {
    const {
        必需按键 = [],
        禁用按键 = [],
        阻止默认行为 = false,
        阻止冒泡 = false
    } = 选项;

    let 当前键盘事件 = null;
    let 当前鼠标事件 = null;

    // 键盘事件处理
    const 处理键盘事件 = (事件) => {
        当前键盘事件 = 事件;
        检查并触发回调();
    };

    // 鼠标事件处理
    const 处理鼠标事件 = (事件) => {
        当前鼠标事件 = 事件;
        检查并触发回调();
    };

    // 检查条件并触发回调
    const 检查并触发回调 = () => {
        if(检查按键状态(当前键盘事件, 当前鼠标事件, 必需按键, 禁用按键)) {
            if(阻止默认行为) {
                当前键盘事件?.preventDefault();
                当前鼠标事件?.preventDefault();
            }
            if(阻止冒泡) {
                当前键盘事件?.stopPropagation();
                当前鼠标事件?.stopPropagation();
            }
            回调函数(当前键盘事件, 当前鼠标事件);
        }
    };

    // 清除按键状态
    const 清除状态 = (事件类型) => {
        if(事件类型 === 'keyboard') {
            当前键盘事件 = null;
        } else {
            当前鼠标事件 = null;
        }
    };

    // 添加事件监听
    元素.addEventListener('keydown', 处理键盘事件);
    元素.addEventListener('keyup', () => 清除状态('keyboard'));
    元素.addEventListener('mousedown', 处理鼠标事件);
    元素.addEventListener('mouseup', () => 清除状态('mouse'));

    // 返回清理函数
    return () => {
        元素.removeEventListener('keydown', 处理键盘事件);
        元素.removeEventListener('keyup', () => 清除状态('keyboard'));
        元素.removeEventListener('mousedown', 处理鼠标事件);
        元素.removeEventListener('mouseup', () => 清除状态('mouse'));
    };
}