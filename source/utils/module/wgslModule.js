import  MagicString from '../../../static/magic-string.mjs'
console.log(MagicString)
class WGSLPreprocessor {
  constructor() {
    this.importCache = new Map();
    this.declaredItems = new Set();
  }

  async processImports(source, basePath) {
    const s = new MagicString(source);
    const importRegex = /#import\s*{([^}]+)}\s*from\s*['"]([^'"]+)['"]\s*;?/gm;
    
    // 收集所有导入声明
    const declarations = new Set();
    let prependContent = '';
    
    // 处理所有导入
    let match;
    while ((match = importRegex.exec(source)) !== null) {
      const [fullMatch, importList, importPath] = match;
      const { start, end } = getMatchRange(match);
      const absolutePath = this.resolveImportPath(basePath, importPath);
      
      // 处理导入的内容
      if (!this.importCache.has(absolutePath)) {
        const content = await this.fetchContent(absolutePath);
        const processedContent = await this.processImports(content, this.getBasePath(absolutePath));
        this.importCache.set(absolutePath, processedContent);
      }
      
      // 处理导入列表
      importList.split(',').forEach(item => {
        const [type, name] = item.trim().split(/\s+/);
        const key = `${type}_${name}`;
        
        if (!declarations.has(key)) {
          const content = this.importCache.get(absolutePath);
          let extractedContent = '';
          
          if (type === 'fn') {
            extractedContent = this.extractFunction(content, name);
          } else if (type === 'f32') {
            extractedContent = this.extractConstant(content, name);
          }
          
          if (extractedContent) {
            declarations.add(key);
            prependContent += extractedContent + '\n';
          }
        }
      });
      
      // 移除导入语句
      s.remove(start, end);
    }
    
    // 在文件开头添加所有导入的内容
    if (prependContent) {
      s.prepend(prependContent + '\n');
    }
    
    // 调试输出
    console.log('Imported declarations:', Array.from(declarations));
    
    return s.toString();
  }

  extractConstant(source, constantName) {
    const constRegex = new RegExp(
      `(?:@export\\s+)?const\\s+${constantName}\\s*:\\s*f32\\s*=\\s*[^;]+;`,
      'gm'
    );
    const match = source.match(constRegex);
    if (!match) {
      throw new Error(`Constant ${constantName} not found in imported content`);
    }
    return match[0].replace(/(?:\/\/\s*)?@export\s+/, '').trim();
  }

  processExports(source) {
    return source.replace(
      /(@export\s+)(fn\s+\w+\s*\([^{]*\{[^}]*\})/g,
      '// @export\n$2'
    );
  }

  extractFunction(source, functionName) {
    const fnRegex = new RegExp(
      `(?:@export\\s+)?fn\\s+${functionName}\\s*\\([^{]*\\{[^}]*\\}`,
      'gm'
    );
    const match = source.match(fnRegex);
    if (!match) {
      throw new Error(`Function ${functionName} not found in imported content`);
    }
    return match[0].replace(/(?:\/\/\s*)?@export\s+/, '').trim();
  }

  resolveImportPath(basePath, importPath) {
    if (importPath.startsWith('http://') || importPath.startsWith('https://')) {
      return importPath;
    }
    if (basePath.startsWith('http://') || basePath.startsWith('https://')) {
      const baseUrl = new URL(basePath);
      return new URL(importPath, baseUrl).toString();
    }
    return path.resolve(basePath, importPath);
  }

  async fetchContent(path) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
      }
      return response.text();
    }
    return fs.readFile(path, 'utf-8');
  }

  getBasePath(path) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      const url = new URL(path);
      const pathParts = url.pathname.split('/');
      pathParts.pop();
      url.pathname = pathParts.join('/');
      return url.toString();
    }
    return path.dirname(path);
  }
}

const preprocessor = new WGSLPreprocessor();

// 辅助函数：获取正则表达式匹配的范围
function getMatchRange(match) {
  return {
    start: match.index,
    end: match.index + match[0].length
  };
}

export const requireWGSLCode = async (path, options = { cache: true }) => {
  try {
    const basePath = path.startsWith('http') 
      ? new URL(path).toString()
      : process.cwd();
      
    if (!options.cache) {
      preprocessor.importCache.clear();
    }
    
    const source = await preprocessor.fetchContent(path);
    let processedCode = await preprocessor.processImports(source, basePath);
    
    // 最终清理
    const s = new MagicString(processedCode);
    s.replaceAll(/@export\s+/g, '')
     .trim();
    
    const finalCode = s.toString();
    console.log('Final code:', finalCode);
    
    return finalCode;
  } catch (error) {
    console.error('WGSL preprocessing error:', error);
    throw new Error(`Failed to load WGSL code from ${path}: ${error.message}`);
  }
}