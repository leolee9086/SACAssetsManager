// 增强版：解析文本行中的IAL属性
export const parseLineWithAttributes = (line) => {
    const match = line.match(/(.*?)(?:\s*\{:\s*(.*?)\s*\}\s*)?$/);
    if (!match) return { text: line, attributes: {} };
  
    const text = match[1];
    const attributesString = match[2] || '';
  
    const attributes = {};
    if (attributesString) {
      const attrMatches = attributesString.matchAll(/(\w+)="([^"]*)"|(\w+)=(\S+)|(\w+)/g);
      for (const attrMatch of attrMatches) {
        const [, key1, value1, key2, value2, key3] = attrMatch;
        const key = key1 || key2 || key3;
        const value = value1 || value2 || true;
        attributes[key] = value;
      }
    }
  
    return { text, attributes };
  };
  
  