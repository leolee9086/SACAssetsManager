import { requirePluginDeps } from "../../../../utils/module/requireDeps.js";

const verdaccio = requirePluginDeps('verdaccio')
const { runServer } = verdaccio
const { ConfigBuilder } = verdaccio

// 使用 ConfigBuilder 构建配置
const config = ConfigBuilder.build();
config
  .addStorage('D:/思源主库/temp/sac/verdaccio/storage')
  .addSecurity({ api: { legacy: false } })
  .addUplink('npmjs', {
    url: 'https://registry.npmjs.org/'
  })
  .addPackageAccess('**', {
    access: '$all',
    publish: '$all',
    proxy: 'npmjs',
    tags: {
      latest: true,
      beta: true,
      "*": true
    }
  })
  .addAuth({
    htpasswd: {
      file: 'D:/思源主库/temp/sac/verdaccio/self_path/htpasswd'
    }
  });

// 获取最终配置对象
const finalConfig = {
    ...config.getConfig(),
    self_path: 'D:/思源主库/temp/sac/verdaccio/self_path',
    // 配置 Pino 使用同步模式，避免使用 worker 线程
    logs: false  // 完全禁用日志
};

// 启动服务器
const verdaccioServer = await runServer(finalConfig).catch(err => {
    console.error('Verdaccio 启动失败:', err);
    throw err;
});

// 显式启动 Verdaccio 服务器
verdaccioServer.listen(4873, '127.0.0.1', () => {
    console.log(`Verdaccio 服务器监听在 http://127.0.0.1:4873`);
});
