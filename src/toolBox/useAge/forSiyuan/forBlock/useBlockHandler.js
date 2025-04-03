/**
 * @fileoverview 提供对思源笔记块的处理功能
 * @module toolBox/useAge/forSiyuan/forBlock/useBlockHandler
 * @description 块处理器工具函数，用于操作思源笔记中的块
 */

import kernelApi from '../../../../../polyfills/kernelApi.js';

// 块类型缩写映射
const 块类型缩写映射 = {
  // 块级元素
  "NodeDocument": "d",
  "NodeHeading": "h",
  "NodeList": "l",
  "NodeListItem": "i",
  "NodeCodeBlock": "c",
  "NodeMathBlock": "m",
  "NodeTable": "t",
  "NodeBlockquote": "b",
  "NodeSuperBlock": "s",
  "NodeParagraph": "p",
  "NodeHTMLBlock": "html",
  "NodeBlockQueryEmbed": "query_embed",
  "NodeKramdownBlockIAL": "ial",
  "NodeIFrame": "iframe",
  "NodeWidget": "widget",
  "NodeThematicBreak": "tb",
  "NodeVideo": "video",
  "NodeAudio": "audio",
  "NodeText": "text",
  "NodeImage": "img",
  "NodeLinkText": "link_text",
  "NodeLinkDest": "link_dest",
  "NodeTextMark": "textmark",
};

/**
 * 匹配块类型获取缩写
 * @param {string} type - 块类型
 * @returns {string} 块类型缩写
 */
function 匹配块类型(type) {
  return 块类型缩写映射[type];
}

/**
 * 块处理器类
 */
class BlockHandler {
  /**
   * 创建块处理器实例
   * @param {string|Object} blockID - 块ID或包含ID的对象
   * @param {Object} [initdata] - 初始数据
   * @param {Object} [_kernelApi] - 内核API实例
   */
  constructor(blockID, initdata, _kernelApi) {
    this.id = blockID;
    if (blockID.id) {
      this.id = blockID.id;
    }
    this.kernelApi = _kernelApi || kernelApi;
    this.typeDict = 块类型缩写映射;
    this._blockCache = null;
    this._blockCacheTime = null;
  }

  /**
   * 将网络图片转换为本地资源
   * @returns {Promise<void>}
   */
  async netImg2LocalAssets() {
    await this.kernelApi.netImg2LocalAssets({ id: this.id });
  }

  /**
   * 判断块是否存在
   * @returns {boolean}
   */
  get exists() {
    return this.kernelApi.checkBlockExist.sync({ id: this.id });
  }

  /**
   * 获取块内容
   * @returns {string}
   */
  get content() {
    return this._block.content;
  }

  /**
   * 获取块路径
   * @returns {string}
   */
  get path() {
    return this._block.path;
  }

  /**
   * 获取根块
   * @returns {BlockHandler}
   */
  get root() {
    return new BlockHandler(this.kernelApi.getBlockInfo.sync({ id: this.id }).rootID);
  }

  /**
   * 获取块属性
   * @returns {Proxy} 块属性代理对象
   */
  get attrs() {
    return new Proxy(
      {},
      {
        get: (obj, prop) => {
          return this.kernelApi.getBlockAttrs.sync({ id: this.id })[prop];
        },
        set: (obj, prop, value) => {
          let attrs = {};
          attrs[prop] = value;
          this.kernelApi.setBlockAttrs.sync({ id: this.id, attrs: attrs });
        },
      }
    );
  }

  /**
   * 设置块属性
   * @param {Object} attrs - 块属性对象
   */
  set attrs(attrs) {
    this.kernelApi.setBlockAttrs.sync({ id: this.id, attrs: attrs });
  }

  /**
   * 获取块样式
   * @returns {Proxy} 样式代理对象
   */
  get style() {
    let styleProxy;
    if (this.firstElement) {
      styleProxy = new Proxy(
        this.firstElement.style, {
          set: (target, prop, value) => {
            target[prop] = value;
            this.kernelApi.setBlockAttrs.sync({ id: this.id, attrs: { style: this.firstElement.getAttribute('style') } });
            return true;
          },
        }
      );
    } else {
      let style = this.kernelApi.getBlockAttrs.sync({ id: this.id }).style;
      let div = document.createElement('div');
      div.setAttribute('style', style);
      styleProxy = new Proxy(
        div.style, {
          set: (target, prop, value) => {
            target[prop] = value;
            this.kernelApi.setBlockAttrs.sync({ id: this.id, attrs: { style: div.getAttribute('style') } });
            return true;
          },
        }
      );
    }
    return styleProxy;
  }

  /**
   * 获取块别名
   * @returns {string}
   */
  get alias() {
    return this.attrs.alias;
  }

  /**
   * 设置块别名
   * @param {string} value - 别名值
   */
  set alias(value) {
    this.kernelApi.setBlockAttrs.sync({ id: this.id, attrs: { alias: value } });
  }

  /**
   * 获取块的第一个DOM元素
   * @returns {Element|null}
   */
  get firstElement() {
    return document.querySelector(
      `.protyle-wysiwyg [data-node-id="${this.id}"]`
    ) || document.querySelector(
      `div.protyle-title[data-node-id="${this.id}"]`
    )?.nextElementSibling;
  }

  /**
   * 获取块类型
   * @returns {string}
   */
  get type() {
    if (this.firstElement) {
      return 匹配块类型(this.firstElement.getAttribute('data-type') || this.firstElement.getAttribute('data-doc-type'));
    } else {
      return this._block.type;
    }
  }

  /**
   * 获取所有块元素
   * @returns {NodeList}
   */
  get elements() {
    let blockElements = document.querySelectorAll(
      `.protyle-wysiwyg [data-node-id="${this.id}"]`
    );
    return blockElements;
  }

  // 基本属性列表
  baseAttrs = ["id", "type", "subtype"];

  /**
   * 获取块信息（带缓存）
   * @returns {Object}
   */
  get _block() {
    const now = Date.now();
    if (this._blockCache && now - this._blockCacheTime < 20) {
      return this._blockCache;
    }

    this._blockCache = this.kernelApi.SQL.sync({
      stmt: `select * from blocks where id = '${this.id}'`,
    })[0];
    this._blockCacheTime = now;

    return this._blockCache;
  }

  /**
   * 获取父块
   * @returns {Object}
   */
  get _parent() {
    return this.kernelApi.SQL.sync({
      stmt: `select * from blocks where id in (select parent_id from blocks where id = '${this.id}')`,
    })[0];
  }

  /**
   * 删除根文档
   * @returns {Promise<void>}
   */
  async removeRoot() {
    await this.kernelApi.removeDoc({
      notebook: this._block.box,
      path: this._block.path,
    });
  }

  /**
   * 删除块
   * @returns {Promise<void>}
   */
  async removeBlock() {
    await this.kernelApi.deleteBlock({
      id: this._block.id,
    });
  }

  /**
   * 删除块或文档
   * @returns {Promise<void>}
   */
  async remove() {
    if (this._block.type === "d") {
      await this.removeRoot();
    } else {
      await this.removeBlock();
    }
  }

  /**
   * 删除父块
   * @returns {Promise<void>}
   */
  async removeParent() {
    let { parent_id } = this._block;
    if (parent_id) {
      let parentBlock = new BlockHandler(parent_id);
      await parentBlock.remove();
    }
  }

  /**
   * 获取块属性
   * @param {string} name - 属性名
   * @returns {Promise<string>} 属性值
   */
  async getAttribute(name) {
    const attributes = await this.kernelApi.getBlockAttrs({
      id: this.id,
    });
    return attributes[name];
  }

  /**
   * 设置块属性
   * @param {string} name - 属性名
   * @param {string} value - 属性值
   * @returns {Promise<void>}
   */
  async setAttribute(name, value) {
    let obj = {};
    obj[name] = value;
    await this.kernelApi.setBlockAttrs({
      id: this.id,
      attrs: obj,
    });
  }

  /**
   * 设置多个块属性
   * @param {Object} obj - 属性对象
   * @returns {Promise<void>}
   */
  async setAttributes(obj) {
    await this.kernelApi.setBlockAttrs({
      id: this.id,
      attrs: obj,
    });
  }

  /**
   * 移动块到指定位置
   * @param {string} parentID - 父块ID
   * @param {string} [previousID] - 前一个块ID
   * @returns {Promise<void>}
   */
  async moveTo(parentID, previousID) {
    if (!this.id) {
      console.log('没有id');
      return;
    }
    if (this.type === "d") {
      console.log('没有目标id');
      return;
    }
    if (!parentID) {
      console.log('没有目标id');
      return;
    }
    await this.kernelApi.moveBlock(
      {
        id: this.id,
        parentID,
        previousID,
      },
      ""
    );
  }

  /**
   * 移动文档到目标位置
   * @param {string} targetID - 目标ID
   * @returns {Promise<void>}
   */
  async moveDocTo(targetID) {
    this.refresh();
    let { path: fromPath, box: fromNotebook } = await this.kernelApi.获取文档(
      { id: this.id, size: 102400 },
      ""
    );
    let {
      path: toPath,
      box: toNotebook,
      rootID,
    } = await this.kernelApi.获取文档({ id: targetID, size: 102400 }, "");
    await this.kernelApi.批量移动文档({
      fromPaths: [fromPath],
      fromNotebook,
      toPath,
      toNotebook,
    });
  }

  /**
   * 转换为子文档
   * @returns {Promise<void>}
   */
  async toChildDoc() {
    this.refresh();
    if (this.type !== "h") {
      return;
    }
    await this.kernelApi.heading2Doc({
      targetNoteBook: this.box,
      srcHeadingID: this.id,
      targetPath: this.path,
      pushMode: 0,
    });
  }

  /**
   * 合并子文档
   * @param {boolean} [recursion=false] - 是否递归处理
   * @returns {Promise<void>}
   */
  async mergeChildDoc(recursion) {
    this.refresh();
    if (this.type !== "d") {
      return;
    }
    let 子文档列表 = await this.kernelApi.listDocsByPath({
      notebook: this.box,
      path: this.path,
      sort: window.siyuan.config.fileTree.sort,
    });
    for await (let 文档属性 of 子文档列表) {
      let 子文档 = new BlockHandler(文档属性);
      if (recursion) {
        if (文档属性.subFileCount) {
          await 子文档.mergeChildDoc(position, true);
        }
      }
      await 子文档.toHeading(this.id);
    }
  }

  /**
   * 转换为标题
   * @param {string} targetID - 目标ID
   * @returns {Promise<void>}
   */
  async toHeading(targetID) {
    this.refresh();
    if (this.type !== "d") {
      return;
    }
    let 目标文档内容 = await this.kernelApi.getDoc({
      id: targetID,
      size: 102400,
    });
    let div = document.createElement("div");
    div.innerHTML = 目标文档内容.content;
    let 目标块id = div
      .querySelector("[data-node-id]")
      .getAttribute("data-node-id");
    let data = await this.kernelApi.doc2Heading({
      srcID: this.id,
      after: false,
      targetID: 目标块id,
    });
    if (data && data.srcTreeBox) {
      await this.kernelApi.removeDoc({
        noteBook: data.srcTreeBox,
        path: data.srcTreePath,
      });
    }
  }

  /**
   * 获取文档内容
   * @param {number} [size] - 大小限制
   * @returns {Promise<Object>}
   */
  async getDoc(size) {
    return await this.kernelApi.getDoc({
      id: this.id,
      size: size ? size : 102400,
    });
  }

  /**
   * 获取完整内容
   * @returns {Promise<string>}
   */
  async getFullContent() {
    let { content } = await this.getDoc();
    let vDoc = new DOMParser().parseFromString(content, "text/html");
    return vDoc.body.innerText;
  }

  /**
   * 在块前面插入内容
   * @param {string} content - 内容
   * @param {string} [type='markdown'] - 内容类型
   * @returns {Promise<Object>}
   */
  async prepend(content, type) {
    let firstChild = await this.listChildren()[0];
    if (firstChild) {
      return this.kernelApi.insertBlock({
        "dataType": type || 'markdown',
        "data": content,
        "nextID": firstChild.id,
      });
    }
  }

  /**
   * 在块末尾追加内容
   * @param {string} content - 内容
   * @param {string} [type='markdown'] - 内容类型
   * @returns {Promise<Object>}
   */
  async append(content, type) {
    if (!this.exists) {
      return;
    }
    return this.kernelApi.insertBlock({
      "dataType": type || 'markdown',
      "data": content,
      "parentID": this.id,
    });
  }

  /**
   * 在块后插入内容
   * @param {string} content - 内容
   * @param {string} [type='markdown'] - 内容类型
   * @returns {Promise<Object>}
   */
  async insertAfter(content, type) {
    if (!this.exists) {
      return;
    }
    return this.kernelApi.insertBlock({
      "dataType": type || 'markdown',
      "data": content,
      "previousID": this.id,
    });
  }

  /**
   * 在块前插入内容
   * @param {string} content - 内容
   * @param {string} [type='markdown'] - 内容类型
   * @returns {Promise<Object>}
   */
  async insertBefore(content, type) {
    if (!this.exists) {
      return;
    }
    return this.kernelApi.insertBlock({
      "dataType": type || 'markdown',
      "data": content,
      "nextID": this.id,
    });
  }

  /**
   * 转换块类型
   * @param {string} 目标类型 - 目标块类型
   * @param {string} [目标子类] - 目标子类型
   * @returns {Promise<void>}
   */
  async convert(目标类型, 目标子类) {
    if (this.type !== 'p') {
      console.warn('当前只支持段落块的转换');
      return;
    } else {
      let kramDown = this.kernelApi.getBlockKramdown.sync({ id: this.id });
      await this.kernelApi.updateBlock({
        id: this.id,
        data: '## ' + kramDown,
        type: 'markdown'
      });
    }
  }

  /**
   * 获取块的Markdown内容
   * @returns {string}
   */
  get markdown() {
    return this.kernelApi.getBlockKramdown.sync({ id: this.id }).kramdown;
  }

  /**
   * 设置块的Markdown内容
   * @param {string} content - Markdown内容
   */
  set markdown(content) {
    this.kernelApi.updateBlock({
      id: this.id,
      data: content,
      type: 'markdown'
    });
  }

  /**
   * 刷新块缓存
   */
  refresh() {
    this._blockCache = null;
    this._blockCacheTime = null;
  }
}

/**
 * 创建块处理器实例
 * @param {string|Object} blockID - 块ID或包含ID的对象
 * @param {Object} [initdata] - 初始数据
 * @param {Object} [kernelApiInstance] - 内核API实例
 * @returns {BlockHandler} 块处理器实例
 */
export const 创建块处理器 = (blockID, initdata, kernelApiInstance) => {
  return new BlockHandler(blockID, initdata, kernelApiInstance);
};

// 导出块处理器类和函数
export { BlockHandler, 匹配块类型 };
export default BlockHandler; 