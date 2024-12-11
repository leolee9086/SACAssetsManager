import { BaseRenderer } from "../base.js";

export class FileTreeRenderer extends BaseRenderer {
  async mount(container) {
    container.innerHTML = `
        <div class="file-tree-container">
          <div class="file-tree-header">
            <h3>文件</h3>
            <div class="file-tree-toolbar">
              <button class="file-tree-add-btn" title="新建文件">
                <svg><use xlink:href="#iconPlus"></use></svg>
              </button>
            </div>
          </div>
          <div class="file-tree-content">
            <div class="placeholder">暂无文件</div>
          </div>
        </div>
      `;

    // 添加事件监听
    const addBtn = container.querySelector('.file-tree-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.handleAddFile());
    }
  }

  async unmount(container) {
    const addBtn = container.querySelector('.file-tree-add-btn');
    if (addBtn) {
      addBtn.removeEventListener('click', () => this.handleAddFile());
    }
    container.innerHTML = '';
  }

  handleAddFile() {
    console.log('Add file clicked');
  }
}
