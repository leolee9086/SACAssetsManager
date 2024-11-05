import { CardInterfaceManager } from './NodeInterfaceManager.js';
// 测试文件
async function runTests() {
  console.log('开始测试...\n');
  
  // 1. 基础节点创建和接口测试
  async function testBasicNode() {
    console.log('测试基础节点功能:');
    const manager = new CardInterfaceManager();
    
    // 创建一个简单节点
    const node1 = manager.createCard('node1', '节点1', [
      { id: 'in1', type: 'input', dataType: 'number', position: 0 },
      { id: 'out1', type: 'output', dataType: 'number', position: 1 }
    ]);
    
    try {
      node1.setValue('in1', 42);
      const value = node1.getValue('in1');
      console.assert(value === 42, '节点值设置/获取测试失败');
      console.log('✓ 基础节点测试通过');
    } catch (error) {
      console.error('✗ 基础节点测试失败:', error);
    }
  }

  // 2. 连接测试
  async function testConnection() {
    console.log('\n测试节点连接:');
    const manager = new CardInterfaceManager();
    
    try {
      // 创建两个节点
      const node1 = manager.createCard('node1', '源节点', [
        { id: 'out1', type: 'output', dataType: 'number', position: 0 }
      ]);
      
      const node2 = manager.createCard('node2', '目标节点', [
        { id: 'in1', type: 'input', dataType: 'number', position: 0 }
      ]);
      
      // 添加调试日志
      console.log('节点创建完成');
      console.log('node1:', node1.getDisplayInfo());
      console.log('node2:', node2.getDisplayInfo());

      // 建立连接
      const connected = await manager.connect('node1', 'out1', 'node2', 'in1');
      console.log('连接建立状态:', connected);
      
      // 设置源节点的值
      node1.setValue('out1', 100);
      console.log('设置node1.out1值为:', 100);
      
      // 传播值
      await manager.propagateValue('node1', 'out1');
      console.log('值传播完成');
      
      // 获取目标节点的值
      const result = node2.getValue('in1');
      console.log('node2.in1接收到的值:', result);
      
      console.assert(result === 100, '值传播测试失败');
      console.log('✓ 连接测试通过');
    } catch (error) {
      console.error('✗ 连接测试失败:', error);
      // 打印详细的错误堆栈
      console.error('错误堆栈:', error.stack);
    }
  }

  // 3. 循环节点测试
  async function testLoopNode() {
    console.log('\n测试循环���点:');
    const manager = new CardInterfaceManager();
    
    const loopNode = manager.createCard('loop1', '循环节点', [
      { id: 'in1', type: 'input', dataType: 'number', position: 0 },
      { id: 'out1', type: 'output', dataType: 'array', position: 1 }
    ]);
    
    loopNode.type = 'loop';
    let counter = 0;
    
    try {
      loopNode.setLoopCondition(() => counter < 3);
      loopNode.onProcess = (context) => {
        counter++;
        return counter;
      };
      
      loopNode.setValue('in1', 1);
      
      // 这里假设 loopNode 自己是源和目标节点
      await manager.executeTransfer(loopNode, 'in1', loopNode, 'loop1', 'in1', 1);
      
      console.assert(counter === 3, '循环执行次数不正确');
      console.log('✓ 循环节点测试通过');
    } catch (error) {
      console.error('✗ 循环节点测试失败:', error);
    }
  }

  // 4. 序列化测试
  async function testSerialization() {
    console.log('\n测试序列化:');
    const manager = new CardInterfaceManager();
    
    const node1 = manager.createCard('node1', '节点1', [
      { id: 'out1', type: 'output', dataType: 'number', position: 0 }
    ]);
    
    try {
      const json = manager.toJSON();
      console.log(json)
      const newManager = await CardInterfaceManager.fromJSON(json);
      
      console.assert(newManager.cards.has('node1'), '序列化恢复失败');
      console.log('✓ 序列化测试通过');
    } catch (error) {
      console.error('✗ 序列化测试失败:', error);
    }
  }

  // 执行所有测试
  await testBasicNode();
  await testConnection();
  await testLoopNode();
  await testSerialization();
}

// 运行测试
runTests().catch(console.error);