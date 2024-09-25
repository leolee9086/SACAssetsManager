export function 从简单sql中提取表名(sql) {
    // 提取表名
    const tableNameMatch = sql.match(/FROM\s+(\w+)/i);
    const tableName = tableNameMatch ? tableNameMatch[1] : null;
    return tableName
}
