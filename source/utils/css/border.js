/**
 * 创建一个BorderRadius实例的工厂函数
 * @param {...number} args - 边框圆角值。可以是1到4个数字。
 * @returns {BorderRadius} 返回一个新的BorderRadius实例
 */
const borderRadius = (() => {
  /**
   * 表示CSS边框圆角的类
   * @class
   */
  class BorderRadius {
    /**
     * 创建一个新的BorderRadius实例
     */
    constructor() {
      /**
       * 存储四个角的圆角值
       * @type {number[]}
       * @private
       */
      this.values = [0, 0, 0, 0];
    }

    /**
     * 设置指定索引的圆角值
     * @param {number} index - 要设置的角的索引（0-3）
     * @param {number} value - 圆角值
     * @returns {BorderRadius} 返回this以支持链式调用
     * @private
     */
    _setValue(index, value) {
      this.values[index] = value;
      return this;
    }

    /**
     * 设置左侧（左上和左下）的圆角值
     * @param {number} value - 圆角值
     * @returns {BorderRadius} 返回this以支持链式调用
     */
    left(value) {
      return this._setValue(0, value)._setValue(3, value);
    }

    /**
     * 设置右侧（右上和右下）的圆角值
     * @param {number} value - 圆角值
     * @returns {BorderRadius} 返回this以支持链式调用
     */
    right(value) {
      return this._setValue(1, value)._setValue(2, value);
    }

    /**
     * 设置顶部（左上和右上）的圆角值
     * @param {number} value - 圆角值
     * @returns {BorderRadius} 返回this以支持链式调用
     */
    top(value) {
      return this._setValue(0, value)._setValue(1, value);
    }

    /**
     * 设置底部（右下和左下）的圆角值
     * @param {number} value - 圆角值
     * @returns {BorderRadius} 返回this以支持链式调用
     */
    bottom(value) {
      return this._setValue(2, value)._setValue(3, value);
    }

    /**
     * 设置左上角的圆角值
     * @param {number} value - 圆角值
     * @returns {BorderRadius} 返回this以支持链式调用
     */
    leftTop(value) {
      return this._setValue(0, value);
    }

    /**
     * 设置右上角的圆角值
     * @param {number} value - 圆角值
     * @returns {BorderRadius} 返回this以支持链式调用
     */
    rightTop(value) {
      return this._setValue(1, value);
    }

    /**
     * 设置右下角的圆角值
     * @param {number} value - 圆角值
     * @returns {BorderRadius} 返回this以支持链式调用
     */
    rightBottom(value) {
      return this._setValue(2, value);
    }

    /**
     * 设置左下角的圆角值
     * @param {number} value - 圆角值
     * @returns {BorderRadius} 返回this以支持链式调用
     */
    leftBottom(value) {
      return this._setValue(3, value);
    }

    /**
     * 设置所有角的圆角值
     * @param {number} value - 圆角值
     * @returns {BorderRadius} 返回this以支持链式调用
     */
    all(value) {
      this.values = [value, value, value, value];
      return this;
    }

    /**
     * 将圆角值转换为CSS可用的字符串
     * @returns {string} 以空格分隔的圆角值字符串
     */
    toString() {
      return this.values.join(' ');
    }
  }

  return (...args) => {
    const br = new BorderRadius();
    if (args.length > 0) {
      br.all(args[0]);
      if (args.length > 1) {
        br.values = args.slice(0, 4);
      }
    }
    return br;
  };
})();