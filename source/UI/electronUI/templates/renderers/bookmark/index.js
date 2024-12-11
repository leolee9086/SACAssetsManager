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