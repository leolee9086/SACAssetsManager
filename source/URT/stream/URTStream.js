const { Transform } = require('stream');
const { EventEmitter } = require('events');

/**
 * @typedef {Object} URTStreamOptions
 * @property {number} [depth=Infinity] - 加载深度限制
 * @property {'eager'|'lazy'|'progressive'} [loadingStrategy='lazy'] - 加载策略
 * @property {function(URTResource): boolean} [filter] - 资源过滤器
 * @property {string} [cursor] - 分页游标
 * @property {number} [batchSize=50] - 批量加载大小
 */

/**
 * @typedef {Object} URTLoadingState
 * @property {'initial'|'loading'|'loaded'|'error'} status - 加载状态
 * @property {number} depth - 当前深度
 * @property {number} [progress] - 加载进度(0-1)
 * @property {Error} [error] - 错误信息
 * @property {Object} [children] - 子节点加载信息
 * @property {number} children.loaded - 已加载数量
 * @property {number} [children.total] - 总数量
 * @property {boolean} children.hasMore - 是否有更多
 */

/**
 * URT资源流 - 支持动态加载的增强版本
 * @extends Transform
 */
class URTStream extends Transform {
  /**
   * @param {URTStreamOptions} options
   */
  constructor(options = {}) {
    super({ 
      objectMode: true,
      ...options 
    });

    this.depth = options.depth ?? Infinity;
    this.loadingStrategy = options.loadingStrategy ?? 'lazy';
    this.filter = options.filter;
    this.cursor = options.cursor;
    this.batchSize = options.batchSize ?? 50;

    // 内部状态
    this._loadingStates = new Map();
    this._resourceCache = new Map();
    this._activeLoads = new Set();
    this._isCancelled = false;
    this._isPaused = false;

    // 事件发射器
    this.events = new EventEmitter();
  }

  /**
   * 处理资源流
   * @param {URTResource} resource - 资源对象
   * @param {string} encoding - 编码
   * @param {function} callback - 回调函数
   * @private
   */
  async _transform(resource, encoding, callback) {
    try {
      if (this._isCancelled) {
        callback();
        return;
      }

      // 应用过滤器
      if (this.filter && !this.filter(resource)) {
        callback();
        return;
      }

      // 更新加载状态
      this._updateLoadingState(resource);

      // 处理资源
      await this._processResource(resource);

      // 推送资源
      this.push(resource);

      // 处理子资源
      if (this._shouldLoadChildren(resource)) {
        await this._loadChildren(resource);
      }

      callback();
    } catch (error) {
      this._handleError(error, resource);
      callback(error);
    }
  }

  /**
   * 更新资源的加载状态
   * @param {URTResource} resource
   * @private
   */
  _updateLoadingState(resource) {
    const state = this._loadingStates.get(resource.meta.id) || {
      status: 'initial',
      depth: 0,
      children: {
        loaded: 0,
        hasMore: false
      }
    };

    state.status = 'loading';
    this._loadingStates.set(resource.meta.id, state);
    this.events.emit('stateChange', resource.meta.id, state);
  }

  /**
   * 处理资源
   * @param {URTResource} resource
   * @private
   */
  async _processResource(resource) {
    // 缓存资源
    this._resourceCache.set(resource.meta.id, resource);

    // 初始化关系结构
    resource.relations = resource.relations || {};
    resource.relations.children = resource.relations.children || {
      loaded: false,
      items: []
    };

    // 标记活动加载
    this._activeLoads.add(resource.meta.id);
  }

  /**
   * 判断是否应该加载子资源
   * @param {URTResource} resource
   * @returns {boolean}
   * @private
   */
  _shouldLoadChildren(resource) {
    const state = this._loadingStates.get(resource.meta.id);
    return (
      !this._isPaused &&
      state.depth < this.depth &&
      (this.loadingStrategy === 'eager' || 
       (this.loadingStrategy === 'progressive' && state.depth === 0))
    );
  }

  /**
   * 加载子资源
   * @param {URTResource} resource
   * @private
   */
  async _loadChildren(resource) {
    const state = this._loadingStates.get(resource.meta.id);
    state.status = 'loading';
    this.events.emit('stateChange', resource.meta.id, state);

    try {
      // 实现具体的子资源加载逻辑
      // 这里需要根据不同的资源类型实现不同的加载策略
    } catch (error) {
      this._handleError(error, resource);
    }
  }

  /**
   * 处理错误
   * @param {Error} error
   * @param {URTResource} resource
   * @private
   */
  _handleError(error, resource) {
    const state = this._loadingStates.get(resource.meta.id);
    state.status = 'error';
    state.error = error;
    this.events.emit('error', resource.meta.id, error);
  }

  /**
   * 暂停加载
   */
  pause() {
    this._isPaused = true;
    this.events.emit('pause');
  }

  /**
   * 恢复加载
   */
  resume() {
    this._isPaused = false;
    this.events.emit('resume');
  }

  /**
   * 取消加载
   */
  cancel() {
    this._isCancelled = true;
    this._activeLoads.clear();
    this.events.emit('cancel');
  }

  /**
   * 获取资源的加载状态
   * @param {string} resourceId
   * @returns {URTLoadingState|undefined}
   */
  getLoadingState(resourceId) {
    return this._loadingStates.get(resourceId);
  }

  /**
   * 获取缓存的资源
   * @param {string} resourceId
   * @returns {URTResource|undefined}
   */
  getCachedResource(resourceId) {
    return this._resourceCache.get(resourceId);
  }
}

export { URTStream };
