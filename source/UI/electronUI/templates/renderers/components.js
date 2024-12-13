import { BaseRenderer } from './base.js';
import { FileTreeRenderer } from './filetree/index.js';
export {FileTreeRenderer}
export class OutlineRenderer extends BaseRenderer {
  async mount(container) {
    container.innerHTML = `
      <div class="outline-container">
        <div class="outline-header">
          <h3>大纲</h3>
        </div>
        <div class="outline-content">
          <div class="placeholder">暂无大纲内容</div>
        </div>
      </div>
    `;
  }

  async unmount(container) {
    container.innerHTML = '';
  }

  updateOutline(outlineData) {
    // 用于更新大纲内容的方法
    console.log('Updating outline with:', outlineData);
  }
}

export class BacklinksRenderer extends BaseRenderer {
  async mount(container) {
    container.innerHTML = `
      <div class="backlinks-container">
        <div class="backlinks-header">
          <h3>反向链接</h3>
        </div>
        <div class="backlinks-content">
          <div class="placeholder">暂无反向链接</div>
        </div>
      </div>
    `;
  }

  async unmount(container) {
    container.innerHTML = '';
  }

  updateBacklinks(backlinksData) {
    // 用于更新反向链接的方法
    console.log('Updating backlinks with:', backlinksData);
  }
}

export class BookmarkRenderer extends BaseRenderer {
  async mount(container) {
    container.innerHTML = `
      <div class="bookmark-container">
        <div class="bookmark-header">
          <h3>书签</h3>
          <div class="bookmark-toolbar">
            <button class="bookmark-add-btn" title="添加书签">
              <svg><use xlink:href="#iconPlus"></use></svg>
            </button>
          </div>
        </div>
        <div class="bookmark-list">
          <div class="placeholder">暂无书签</div>
        </div>
      </div>
    `;

    // 添加事件监听
    const addBtn = container.querySelector('.bookmark-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.handleAddBookmark());
    }
  }

  async unmount(container) {
    // 清理事件监听
    const addBtn = container.querySelector('.bookmark-add-btn');
    if (addBtn) {
      addBtn.removeEventListener('click', () => this.handleAddBookmark());
    }
    container.innerHTML = '';
  }

  handleAddBookmark() {
    // 处理添加书签的逻辑
    console.log('Add bookmark clicked');
  }
}

// 添加相关样式
const style = document.createElement('style');
style.textContent = `
  .bookmark-container {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .bookmark-header {
    padding: 8px 16px;
    border-bottom: 1px solid var(--cc-border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .bookmark-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
  }

  .bookmark-toolbar {
    display: flex;
    gap: 8px;
  }

  .bookmark-add-btn {
    padding: 4px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--cc-text-secondary);
    border-radius: 4px;
  }

  .bookmark-add-btn:hover {
    background-color: var(--cc-background-hover);
  }

  .bookmark-add-btn svg {
    width: 16px;
    height: 16px;
  }

  .bookmark-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .bookmark-list .placeholder {
    text-align: center;
    color: var(--cc-text-secondary);
    padding: 32px 16px;
  }

  .file-tree-container {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .file-tree-header {
    padding: 8px 16px;
    border-bottom: 1px solid var(--cc-border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .file-tree-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
  }

  .file-tree-toolbar {
    display: flex;
    gap: 8px;
  }

  .file-tree-add-btn {
    padding: 4px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--cc-text-secondary);
    border-radius: 4px;
  }

  .file-tree-add-btn:hover {
    background-color: var(--cc-background-hover);
  }

  .file-tree-add-btn svg {
    width: 16px;
    height: 16px;
  }

  .file-tree-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .outline-container,
  .backlinks-container {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .outline-header,
  .backlinks-header {
    padding: 8px 16px;
    border-bottom: 1px solid var(--cc-border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .outline-header h3,
  .backlinks-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
  }

  .outline-content,
  .backlinks-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .outline-content .placeholder,
  .backlinks-content .placeholder {
    text-align: center;
    color: var(--cc-text-secondary);
    padding: 32px 16px;
  }
`;
document.head.appendChild(style); 