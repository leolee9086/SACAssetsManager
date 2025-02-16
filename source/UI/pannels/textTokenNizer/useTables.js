import { kernelApi } from "../../../asyncModules.js";
const timeFormatter = {
    toDisplay: (value) => {
      if (!value) return '';
      // 20240129031559 -> 2024-01-29T03:15:59
      return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}`;
    },
    toStorage: (value) => {
      if (!value) return '';
      // 2024-01-29T03:15:59 -> 20240129031559
      return value.replace(/[-:T]/g, '');
    }
  }
  
export const tables = {
  assets: {
    name: 'assets',
    fields: [
      { name: 'id', type: 'number' },
      { name: 'block_id', type: 'number' },
      { name: 'name', type: 'string' },
      { name: 'path', type: 'string' },
      { name: 'created', type: 'datetime', formatter: timeFormatter },
      { name: 'updated', type: 'datetime', formatter: timeFormatter }
    ]
  },
  attributes: {
    name: 'attributes',
    fields: [
      { name: 'id', type: 'number' },
      { 
        name: 'name', 
        type: 'string',
        isSelector: true,
        getOptions: async () => {
          // 使用 SQL 查询获取所有唯一的 name 值
          const sql = 'SELECT DISTINCT name FROM attributes ORDER BY name';
          const result = await kernelApi.sql.sync({stmt:sql});
          return result.map(row => ({ label: row.name, value: row.name }));
        }
      },
      { name: 'value', type: 'string' },
      { name: 'type', type: 'string' },
      { name: 'block_id', type: 'number' },
      { name: 'root_id', type: 'number' },
      { name: 'box', type: 'string' },
      { name: 'path', type: 'string' }
    ]
  },
  blocks: {
    name: 'blocks',
    fields: [
      { name: 'id', type: 'number' },
      { name: 'parent_id', type: 'number' },
      { name: 'root_id', type: 'number' },
      { name: 'hash', type: 'string' },
      { name: 'box', type: 'string' },
      { name: 'path', type: 'string' },
      { name: 'hpath', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'alias', type: 'string' },
      { name: 'memo', type: 'string' },
      { name: 'tag', type: 'string' },
      { name: 'content', type: 'string' },
      { name: 'fcontent', type: 'string' },
      { name: 'markdown', type: 'string' },
      { name: 'length', type: 'number' },
      { name: 'type', type: 'string' },
      { name: 'subtype', type: 'string' },
      { name: 'ial', type: 'string' },
      { name: 'sort', type: 'number' },
      { name: 'created', type: 'datetime', formatter: timeFormatter },
      { name: 'updated', type: 'datetime', formatter: timeFormatter }
    ]
  },
  file_annotation_refs: {
    name: 'file_annotation_refs',
    fields: [
      { name: 'id', type: 'number' },
      { name: 'file_path', type: 'string' },
      { name: 'annotation_id', type: 'string' },
      { name: 'block_id', type: 'number' },
      { name: 'created', type: 'datetime', formatter: timeFormatter },
      { name: 'updated', type: 'datetime', formatter: timeFormatter }
    ]
  },
  refs: {
    name: 'refs',
    fields: [
      { name: 'id', type: 'number' },
      { name: 'def_block_id', type: 'number' },
      { name: 'def_block_parent_id', type: 'number' },
      { name: 'def_block_root_id', type: 'number' },
      { name: 'def_block_path', type: 'string' },
      { name: 'block_id', type: 'number' },
      { name: 'root_id', type: 'number' },
      { name: 'box', type: 'string' },
      { name: 'path', type: 'string' },
      { name: 'content', type: 'string' },
      { name: 'created', type: 'datetime', formatter: timeFormatter },
      { name: 'updated', type: 'datetime', formatter: timeFormatter }
    ]
  },
  spans: {
    name: 'spans',
    fields: [
      { name: 'id', type: 'number' },
      { name: 'block_id', type: 'number' },
      { name: 'root_id', type: 'number' },
      { name: 'box', type: 'string' },
      { name: 'path', type: 'string' },
      { name: 'content', type: 'string' },
      { name: 'markdown', type: 'string' },
      { name: 'type', type: 'string' },
      { name: 'created', type: 'datetime', formatter: timeFormatter },
      { name: 'updated', type: 'datetime', formatter: timeFormatter }
    ]
  }
}


export function useTables() {
  const getTableFields = (tableName) => {
    return tables[tableName]?.fields || [];
  }

  const getTableNames = () => {
    return Object.keys(tables);
  }

  return {
    tables,
    getTableFields,
    getTableNames
  }
} 