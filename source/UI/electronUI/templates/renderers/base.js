// 渲染器类型枚举
export const RendererType = {
  EDITOR: 'editor',       
  FILE_TREE: 'fileTree', 
  OUTLINE: 'outline',    
  BACKLINKS: 'backlinks', 
  BOOKMARK: 'bookmark',   
};

// 渲染器基类
export class BaseRenderer {
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