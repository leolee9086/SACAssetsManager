
/**
 * 创建一个新的SQLite数据库并初始化表结构
 * @param {string} dbPath - 数据库文件路径
 */
const Database = require('better-sqlite3')
/**
 * 
 * @param {*} dbPath 
 * @returns 
 * 用于实现一个类似seaTable或者notion的数据表格
 */
async function 创建新数据库并初始化表(dbPath) {
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = 1000');
    db.pragma('temp_store = MEMORY');

    // 执行SQL语句以创建表
    const createTablesSQL = `
        CREATE TABLE IF NOT EXISTS Items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS Attributes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            value TEXT NOT NULL,
            FOREIGN KEY (item_id) REFERENCES Items(id)
        );

        CREATE TABLE IF NOT EXISTS Fields (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            parse_method TEXT NOT NULL,
            default_value TEXT
        );

        CREATE TABLE IF NOT EXISTS Layouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            fields TEXT NOT NULL,
            filter TEXT,
            sort_order TEXT
        );

        CREATE TABLE IF NOT EXISTS Relations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_table TEXT NOT NULL,
            source_field TEXT NOT NULL,
            target_table TEXT NOT NULL,
            target_field TEXT NOT NULL
        );
    `;

    db.exec(createTablesSQL);

    console.log(`成功创建并初始化数据库: ${dbPath}`);
    return db
}


/**
 * 向数据库中添加一个条目，并处理相关的联动关系
 * @param {string} dbPath - 数据库文件路径
 * @param {Object} itemData - 包含条目信息的对象
 * @param {string} itemData.name - 条目的名称
 * @param {Array} [itemData.attributes] - 条目的属性列表，每个属性是一个对象，包含 name 和 value
 */
function 添加条目(dbPath, itemData) {
    const db = new Database(dbPath);

    // 开始事务
    const transaction = db.transaction(() => {
        // 插入到 Items 表
        const insertItemStmt = db.prepare(`
            INSERT INTO Items (name) VALUES (?)
        `);
        const result = insertItemStmt.run(itemData.name);
        const itemId = result.lastInsertRowid;

        // 如果有属性，插入到 Attributes 表
        if (itemData.attributes && Array.isArray(itemData.attributes)) {
            const insertAttributeStmt = db.prepare(`
                INSERT INTO Attributes (item_id, name, value) VALUES (?, ?, ?)
            `);

            const selectFieldStmt = db.prepare(`
                SELECT parse_method FROM Fields WHERE name = ?
            `);

            for (const attribute of itemData.attributes) {
                // 检查 Fields 表中是否存在该属性的定义
                const field = selectFieldStmt.get(attribute.name);
                if (!field) {
                    throw new Error(`属性名称 "${attribute.name}" 未在 Fields 表中定义`);
                }

                // 根据 parse_method 处理属性值（这里假设 parse_method 是一个简单的函数名）
                let parsedValue = attribute.value;
                if (field.parse_method) {
                    // 这里可以根据需要实现具体的解析逻辑
                    // 例如：parsedValue = someParsingFunction(attribute.value);
                }

                // 插入属性
                insertAttributeStmt.run(itemId, attribute.name, parsedValue);
            }
        }
    });

    // 执行事务
    transaction();

    console.log(`成功添加条目: ${itemData.name}`);
}


/**
 * 添加属性到指定条目
 * @param {string} dbPath - 数据库文件路径
 * @param {number} itemId - 条目ID
 * @param {Object} attribute - 属性对象，包含 name 和 value
 */
function 添加属性(dbPath, itemId, attribute) {
    const db = new Database(dbPath);
    const insertAttributeStmt = db.prepare(`
        INSERT INTO Attributes (item_id, name, value) VALUES (?, ?, ?)
    `);
    insertAttributeStmt.run(itemId, attribute.name, attribute.value);
    console.log(`成功添加属性: ${attribute.name}`);
}

/**
 * 删除指定条目的属性
 * @param {string} dbPath - 数据库文件路径
 * @param {number} itemId - 条目ID
 * @param {string} attributeName - 属性名称
 */
function 删除属性(dbPath, itemId, attributeName) {
    const db = new Database(dbPath);
    const deleteAttributeStmt = db.prepare(`
        DELETE FROM Attributes WHERE item_id = ? AND name = ?
    `);
    deleteAttributeStmt.run(itemId, attributeName);
    console.log(`成功删除属性: ${attributeName}`);
}

/**
 * 查询指定条目的属性
 * @param {string} dbPath - 数据库文件路径
 * @param {number} itemId - 条目ID
 * @returns {Array} - 返回属性列表
 */
function 查询属性(dbPath, itemId) {
    const db = new Database(dbPath);
    const selectAttributesStmt = db.prepare(`
        SELECT name, value FROM Attributes WHERE item_id = ?
    `);
    const attributes = selectAttributesStmt.all(itemId);
    console.log(`查询到的属性:`, attributes);
    return attributes;
}

/**
 * 更新指定条目的属性
 * @param {string} dbPath - 数据库文件路径
 * @param {number} itemId - 条目ID
 * @param {Object} attribute - 属性对象，包含 name 和 value
 */
function 更新属性(dbPath, itemId, attribute) {
    const db = new Database(dbPath);
    const updateAttributeStmt = db.prepare(`
        UPDATE Attributes SET value = ? WHERE item_id = ? AND name = ?
    `);
    updateAttributeStmt.run(attribute.value, itemId, attribute.name);
    console.log(`成功更新属性: ${attribute.name}`);
}
/**
 * 删除指定的属性定义
 * @param {string} dbPath - 数据库文件路径
 * @param {string} fieldName - 属性定义名称
 */
function 删除属性定义(dbPath, fieldName) {
    const db = new Database(dbPath);
    const deleteFieldStmt = db.prepare(`
        DELETE FROM Fields WHERE name = ?
    `);
    deleteFieldStmt.run(fieldName);
    console.log(`成功删除属性定义: ${fieldName}`);
}

/**
 * 查询所有属性定义
 * @param {string} dbPath - 数据库文件路径
 * @returns {Array} - 返回属性定义列表
 */
function 查询属性定义(dbPath) {
    const db = new Database(dbPath);
    const selectFieldsStmt = db.prepare(`
        SELECT name, parse_method, default_value FROM Fields
    `);
    const fields = selectFieldsStmt.all();
    console.log(`查询到的属性定义:`, fields);
    return fields;
}

/**
 * 更新指定的属性定义
 * @param {string} dbPath - 数据库文件路径
 * @param {Object} field - 属性定义对象，包含 name, parse_method 和 default_value
 */
function 更新属性定义(dbPath, field) {
    const db = new Database(dbPath);
    const updateFieldStmt = db.prepare(`
        UPDATE Fields SET parse_method = ?, default_value = ? WHERE name = ?
    `);
    updateFieldStmt.run(field.parse_method, field.default_value, field.name);
    console.log(`成功更新属性定义: ${field.name}`);
}