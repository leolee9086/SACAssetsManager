// 渲染器注册表
const rendererRegistry = new Map();

// 导入 Vditor
import Vditor from 'https://esm.sh/vditor@3.9.9';

// 渲染器类型枚举
export const RendererType = {
  EDITOR: 'editor',       // 编辑器
  FILE_TREE: 'fileTree', // 文件树
  OUTLINE: 'outline',    // 大纲
  BACKLINKS: 'backlinks', // 反向链接
  BOOKMARK: 'bookmark',   // 书签
};

// 渲染器基类
class BaseRenderer {
  constructor(options = {}) {
    this.options = options;
  }

  async mount(container) {
    throw new Error('mount method must be implemented');
  }

  async unmount(container) {
    throw new Error('unmount method must be implemented');
  }
}

// Vditor编辑器渲染器
export class VditorRenderer extends BaseRenderer {
  constructor(options) {
    super(options);
    this.editor = null;
  }

  async mount(container) {
    this.editor = new Vditor(container, {
      height: '100%',
      mode: 'ir',
      theme: 'dark',
      value: this.options.value || '',
      cache: {
        enable: false
      },
      after: () => {
        this.editor.setValue(this.options.value || '');
      }
    });
  }

  async unmount(container) {
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
  }
}

// 文件树渲染器
export class FileTreeRenderer extends BaseRenderer {
  async mount(container) {
    container.innerHTML = `
      <div class="file-tree-container">
        <div class="placeholder">文件树区域</div>
      </div>
    `;
  }

  async unmount(container) {
    container.innerHTML = '';
  }
}

// 大纲渲染器
export class OutlineRenderer extends BaseRenderer {
  async mount(container) {
    container.innerHTML = `
      <div class="outline-container">
        <div class="placeholder">大纲区域</div>
      </div>
    `;
  }

  async unmount(container) {
    container.innerHTML = '';
  }
}

// 反向链接渲染器
export class BacklinksRenderer extends BaseRenderer {
  async mount(container) {
    container.innerHTML = `
      <div class="backlinks-container">
        <div class="placeholder">反向链接区域</div>
      </div>
    `;
  }

  async unmount(container) {
    container.innerHTML = '';
  }
}

// 书签渲染器
export class BookmarkRenderer extends BaseRenderer {
  async mount(container) {
    container.innerHTML = `
      <div class="bookmark-container">
        <div class="placeholder">书签区域</div>
      </div>
    `;
  }

  async unmount(container) {
    container.innerHTML = '';
  }
}

// 注册渲染器
export function registerRenderer(type, rendererClass) {
  rendererRegistry.set(type, rendererClass);
}

// 创建渲染器实例
export function createRenderer(type, options = {}) {
  const RendererClass = rendererRegistry.get(type);
  if (!RendererClass) {
    throw new Error(`No renderer registered for type: ${type}`);
  }
  return new RendererClass(options);
}

// 注册所有渲染器
registerRenderer(RendererType.EDITOR, VditorRenderer);
registerRenderer(RendererType.FILE_TREE, FileTreeRenderer);
registerRenderer(RendererType.OUTLINE, OutlineRenderer);
registerRenderer(RendererType.BACKLINKS, BacklinksRenderer);
registerRenderer(RendererType.BOOKMARK, BookmarkRenderer);

// 添加一些基础样式
const style = document.createElement('style');
style.textContent = `
  .placeholder {
    padding: 16px;
    text-align: center;
    color: var(--cc-text-secondary);
    font-size: 14px;
  }
  
  .file-tree-container,
  .outline-container,
  .backlinks-container,
  .bookmark-container {
    height: 100%;
    width: 100%;
    overflow: auto;
  }
`;
document.head.appendChild(style); 