import   ParserModule  from 'https://esm.sh/node-sql-parser@4.11.0'
console.log(ParserModule)
const parser = new ParserModule.Parser()

/**
 * 解析SQL SELECT语句
 * @param {string} sql SQL语句
 * @returns {Object} 解析结果
 */
export const computeParseSql = (sql) => {
  try {
    const ast = parser.astify(sql)
    if (!Array.isArray(ast)) {
      return parseAstToQueryState(ast)
    }
    // 如果是多条语句，只取第一条
    return parseAstToQueryState(ast[0])
  } catch (error) {
    console.error('SQL解析错误:', error)
    return null
  }
}

/**
 * 将AST转换为查询状态
 * @param {Object} ast SQL AST
 * @returns {Object} 查询状态
 */
const parseAstToQueryState = (ast) => {
  if (ast.type !== 'select') {
    return null
  }

  const result = {
    fields: [],
    table: '',
    conditions: [],
    matchType: 'IS',
    logicOperator: 'AND'
  }

  // 解析SELECT部分
  ast.columns.forEach(col => {
    result.fields.push({
      name: col.expr.column || col.expr.value || '*',
      alias: col.as || '',
      selected: true
    })
  })

  // 解析FROM部分
  if (ast.from?.[0]?.table) {
    result.table = ast.from[0].table
  }

  // 解析WHERE部分
  if (ast.where) {
    const { conditions, isNegated, operator } = parseWhereClause(ast.where)
    result.conditions = conditions
    result.matchType = isNegated ? 'IS NOT' : 'IS'
    result.logicOperator = operator
  }

  return result
}

/**
 * 解析WHERE子句
 * @param {Object} whereClause WHERE子句AST
 * @returns {Object} 解析结果
 */
const parseWhereClause = (whereClause) => {
  const result = {
    conditions: [],
    isNegated: false,
    operator: 'AND'
  }

  // 处理NOT包裹的情况
  if (whereClause.type === 'unary_expr' && whereClause.operator === 'NOT') {
    result.isNegated = true
    whereClause = whereClause.expr
  }

  // 处理条件
  if (whereClause.type === 'binary_expr') {
    if (['AND', 'OR'].includes(whereClause.operator)) {
      result.operator = whereClause.operator
      const leftConditions = parseWhereClause(whereClause.left)
      const rightConditions = parseWhereClause(whereClause.right)
      result.conditions = [
        ...leftConditions.conditions,
        ...rightConditions.conditions
      ]
    } else {
      result.conditions.push(parseSingleCondition(whereClause))
    }
  }

  return result
}

/**
 * 解析单个条件
 * @param {Object} condition 条件AST
 * @returns {Object} 条件对象
 */
const parseSingleCondition = (condition) => {
  const result = {
    field: '',
    operator: '=',
    value: '',
    subqueryField: ''
  }

  // 基本字段
  if (condition.left.type === 'column_ref') {
    result.field = condition.left.column
  }

  // 处理操作符
  switch (condition.operator) {
    case '=':
    case '!=':
    case '>':
    case '<':
      result.operator = condition.operator
      break
    case 'LIKE':
      const pattern = condition.right.value
      if (pattern.startsWith('%') && pattern.endsWith('%')) {
        result.operator = 'like_contains'
        result.value = pattern.slice(1, -1)
      } else if (pattern.startsWith('%')) {
        result.operator = 'like_suffix'
        result.value = pattern.slice(1)
      } else if (pattern.endsWith('%')) {
        result.operator = 'like_prefix'
        result.value = pattern.slice(0, -1)
      } else {
        result.operator = 'like_custom'
        result.value = pattern
      }
      return result
  }

  // 处理值
  if (condition.right.type === 'string') {
    result.value = condition.right.value
  } else if (condition.right.type === 'number') {
    result.value = condition.right.value.toString()
  }

  return result
}

/**
 * 验证SQL语句的基本结构
 * @param {string} sql SQL语句
 * @returns {boolean} 是否是有效的SELECT语句
 */
export const computeValidateSql = (sql) => {
  try {
    const ast = parser.astify(sql)
    if (Array.isArray(ast)) {
      return ast[0].type === 'select'
    }
    return ast.type === 'select'
  } catch (error) {
    return false
  }
} 