export function createContextMenu({ remote, webviewRef, selectionText, onShowMask }) {
  const menu = new remote.Menu();
  
  // 添加刷新菜单项
  menu.append(new remote.MenuItem({
    label: '刷新当前页面',
    click: () => webviewRef.reload()
  }));

  // 如果有选中文本，添加相关菜单项
  if (selectionText) {
    // 添加复制选项
    menu.append(new remote.MenuItem({
      role: 'copy',
      label: '复制'
    }));
    
    // 添加搜索思源选项
    menu.append(new remote.MenuItem({
      label: '搜索思源',
      click: () => {
        // TODO: 实现搜索思源功能
        onShowMask();
      }
    }));
  }

  return menu;
} 