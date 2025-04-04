# Radix3 高性能路由器

这是一个基于Radix3前缀树的高性能路由器实现，提供Express风格和Koa风格两种API。

## 特性

- 高效的路由匹配（O(k)复杂度，k为路径长度）
- 兼容Express/Koa路由API
- 支持路径参数和通配符
- 针对大型应用优化（1000+路由）
- 完全可配置的路由选项

## 使用方法

### Express风格路由器

```javascript
import { createRouter } from './forExpressLikeRouter.js';

// 创建路由器
const router = createRouter({
  caseSensitive: false, // 是否区分大小写
  strict: false         // 是否严格匹配尾部斜杠
});

// 注册路由
router.get('/users', (req, res) => {
  res.end('用户列表');
});

router.get('/users/:id', (req, res) => {
  res.end(`用户ID: ${req.params.id}`);
});

// 中间件
router.use('/admin', (req, res, next) => {
  // 权限验证
  if (!authorized) {
    res.statusCode = 403;
    return res.end('禁止访问');
  }
  next();
});

// 嵌套路由器
const apiRouter = createRouter();
apiRouter.get('/data', (req, res) => {
  res.end('API数据');
});

router.use('/api', apiRouter);

// 使用路由器
server.on('request', (req, res) => {
  router(req, res, () => {
    res.statusCode = 404;
    res.end('找不到页面');
  });
});
```

### Koa风格路由器

```javascript
import { createKoaRouter } from './forKoaLikeRouter.js';

// 创建路由器
const router = createKoaRouter();

// 注册路由
router.get('/users', async (ctx) => {
  ctx.body = '用户列表';
});

router.get('/users/:id', async (ctx) => {
  ctx.body = `用户ID: ${ctx.params.id}`;
});

// 命名路由
router.get('user', '/user/:id', async (ctx) => {
  ctx.body = `用户: ${ctx.params.id}`;
});

// 路由组
router.group('/admin', (adminRouter) => {
  adminRouter.get('/dashboard', async (ctx) => {
    ctx.body = '管理仪表盘';
  });
});

// 使用路由器
app.use(router.routes());
app.use(router.allowedMethods());
```

## 性能优化建议

1. 静态路由（无参数）比动态路由更快
2. 相同前缀的路由放在一起可以更好地利用树结构
3. 避免过多的通配符路由
4. 如果路由数量超过1000，考虑使用分组和模块化组织

## 依赖

- radix3.mjs - 前缀树实现
- path-to-regexp.js - 路径参数处理

## 兼容性

支持所有现代JavaScript环境，包括：
- Node.js (14.x+)
- 现代浏览器
- Deno 