import MIME链 from '../src/工具箱/forMime/mimeChain.js';

/**
 * MIME链测试套件
 * 使用原生实现测试 MIME链 的各项功能
 */

// 测试辅助函数
const 断言 = (条件, 消息) => {
  if (!条件) {
    console.error(`❌ 断言失败: ${消息}`);
    throw new Error(`断言失败: ${消息}`);
  }
  console.log(`✓ 通过: ${消息}`);
  return true;
};

const 测试组 = (组名, 测试函数) => {
  console.log(`\n📋 开始测试组: ${组名}`);
  try {
    测试函数();
    console.log(`✅ 测试组完成: ${组名}\n`);
  } catch (错误) {
    console.error(`❌ 测试组失败: ${组名}`, 错误);
  }
};

// 基础 MIME 操作测试
const 测试基础操作 = () => {
  测试组('基础 MIME 操作', () => {
    // 测试获取扩展名列表
    const 扩展名测试 = MIME链('text/html').根据Mime类型获取扩展名列表().值;
    断言(Array.isArray(扩展名测试), '获取扩展名列表应返回数组');
    断言(扩展名测试.includes('html'), '文本/HTML 类型应包含 html 扩展名');
    
    // 测试获取 MIME 类型
    const MIME类型测试 = MIME链('example.jpg').根据完整文件名获取Mime类型().值;
    console.log(MIME类型测试);
    断言(MIME类型测试 === 'image/jpeg', 'jpg 文件应返回 image/jpeg MIME 类型');
  });
};

// 类型检查操作测试
const 测试类型检查 = () => {
  测试组('类型检查操作', () => {
    // 测试是否为类别
    断言(MIME链('image/jpeg').是否为类别('image').值 === true, 'image/jpeg 应属于 image 类别');
    断言(MIME链('image/jpeg').是否为类别('text').值 === false, 'image/jpeg 不应属于 text 类别');
    
    // 测试特定类型检查
    断言(MIME链('image/jpeg').是否图片类型().值 === true, 'image/jpeg 应是图片类型');
    断言(MIME链('text/html').是否文本类型().值 === true, 'text/html 应是文本类型');
    断言(MIME链('audio/mp3').是否音频类型().值 === true, 'audio/mp3 应是音频类型');
    断言(MIME链('video/mp4').是否视频类型().值 === true, 'video/mp4 应是视频类型');
    
    // 测试非对应类型
    断言(MIME链('image/jpeg').是否文本类型().值 === false, 'image/jpeg 不应是文本类型');
  });
};

// 文件类型检查测试
const 测试文件类型检查 = () => {
  测试组('文件类型检查', () => {
    断言(MIME链('example.jpg').是否图片文件().值 === true, 'jpg 文件应是图片文件');
    断言(MIME链('example.txt').是否文本文件().值 === true, 'txt 文件应是文本文件');
    断言(MIME链('example.mp3').是否音频文件().值 === true, 'mp3 文件应是音频文件');
    断言(MIME链('example.mp4').是否视频文件().值 === true, 'mp4 文件应是视频文件');
    
    断言(MIME链('example.jpg').是否文本文件().值 === false, 'jpg 文件不应是文本文件');
  });
};

// 高级 MIME 操作测试
const 测试高级操作 = () => {
  测试组('高级 MIME 操作', () => {
    // 测试是否可压缩
    断言(typeof MIME链('text/html').是否可压缩().值 === 'boolean', '是否可压缩应返回布尔值');
    
    // 测试获取字符集
    const 字符集 = MIME链('text/html; charset=UTF-8').获取字符集().值;
    断言(字符集 === 'UTF-8' || 字符集 === '', '应能获取字符集或返回空字符串');
    // 测试获取文件分类和图标
    断言(typeof MIME链('image/jpeg').获取文件分类().值 === 'string', '获取文件分类应返回字符串');
    断言(typeof MIME链('image/jpeg').获取文件图标().值 === 'string', '获取文件图标应返回字符串');
    
    // 测试获取 HTTP 头部
    断言(typeof MIME链('text/html').获取HTTP头部().值 === 'object', '获取HTTP头部应返回对象');
    
    // 测试获取 MIME 安全等级
    断言(typeof MIME链('text/html').获取MIME安全等级().值 === 'string', '获取MIME安全等级应返回字符串');
  });
};

// 便捷组合操作测试
const 测试便捷组合操作 = () => {
  测试组('便捷组合操作', () => {
    // 测试获取文件信息
    const 文件信息 = MIME链('example.jpg').获取文件信息().值;
    断言(typeof 文件信息 === 'object', '获取文件信息应返回对象');
    断言(文件信息.类型 === 'image/jpeg', '图片文件类型应正确');
    断言(Array.isArray(文件信息.扩展名), '扩展名应为数组');
    断言(typeof 文件信息.安全等级 === 'string', '安全等级应为字符串');
  });
};

// 文件类型转换测试
const 测试类型转换 = () => {
  测试组('文件类型转换', () => {
    // 测试转换为安全类型
    const 安全类型 = MIME链('example.jpg').转换为安全类型().值;
    断言(typeof 安全类型 === 'string', '转换为安全类型应返回字符串');
    断言(安全类型.includes('/'), '安全类型应包含MIME类型格式');
  });
};

// 命名空间测试
const 测试命名空间 = () => {
  测试组('命名空间操作', () => {
    // 测试检查命名空间
    断言(MIME链('example.jpg').$检查$.是图片().值 === true, '命名空间检查应能识别图片');
    断言(MIME链('example.txt').$检查$.是文本().值 === true, '命名空间检查应能识别文本');
    断言(MIME链('example.mp3').$检查$.是音频().值 === true, '命名空间检查应能识别音频');
    断言(MIME链('example.mp4').$检查$.是视频().值 === true, '命名空间检查应能识别视频');
    
    断言(typeof MIME链('image/jpeg').$检查$.是安全的().值 === 'boolean', '安全检查应返回布尔值');
  });
};

// 链式操作测试
const 测试链式操作 = () => {
  测试组('链式操作', () => {
    // 测试多步链式操作
    const 链式结果 = MIME链('example.jpg')
      .根据完整文件名获取Mime类型()
      .是否图片类型()
      .分支([
        [值 => 值 === true, () => '这是图片文件'],
        [值 => 值 === false, () => '这不是图片文件']
      ])
      .值;
      
    断言(链式结果 === '这是图片文件', '链式分支操作应正确处理图片文件');
    
    // 测试另一种链式操作
    const 复杂链式结果 = MIME链('example.txt')
      .获取Mime类型()
      .获取扩展名列表()
      .映射(扩展名列表 => 扩展名列表.join(', '))
      .值;
      
    断言(typeof 复杂链式结果 === 'string', '复杂链式操作应返回拼接字符串');
  });
};

// 执行所有测试
const 运行全部测试 = () => {
  console.log('🚀 开始 MIME链 测试...');
  
  测试基础操作();
  测试类型检查();
  测试文件类型检查();
  测试高级操作();
  测试便捷组合操作();
  测试类型转换();
  测试命名空间();
  测试链式操作();
  
  console.log('✨ MIME链 测试完成!');
};

// 立即执行测试
运行全部测试();

export { 运行全部测试 };