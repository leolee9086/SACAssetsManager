const menuRegistry = Symbol.for('menuRegistry');

if (!global[menuRegistry]) {
  global[menuRegistry] = new Map();
}

export const 从文件加载菜单项目 = async (菜单链接, 重新加载 = false) => {
    try {
      const 模块 = await 获取模块(菜单链接, 重新加载);
      const 菜单项目 = await 处理菜单项目(模块.items);
      return 菜单项目;
    } catch (错误) {
      console.error(`加载菜单模块时出错: ${错误.message}`);
      return [];
    }
  };
  
  async function 获取模块(菜单链接, 重新加载) {
    if (!重新加载 && global[menuRegistry].has(菜单链接)) {
      return global[menuRegistry].get(菜单链接);
    } else {
      const 模块 = await import(菜单链接);
      global[menuRegistry].set(菜单链接, 模块);
      return 模块;
    }
  }
  
  async function 处理菜单项目(项目列表) {
    const 结果 = [];
    for (let i = 0; i < 项目列表.length; i++) {
      try {
        结果.push((上下文) => 项目列表[i](上下文));
      } catch (项目错误) {
        console.error(`处理菜单项时出错: ${项目错误.message}`);
      }
    }
    console.log(结果);
    return 结果;
  }