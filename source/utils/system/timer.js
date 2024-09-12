const { spawn } = require('child_process');

function createSystemTimeout(commonds, timeout) {
    //用于在一定时间之后执行commonds
    //保证即使当前进程已经退出,命令任然会正确执行
    //因此绝对不能依赖js自身的定时器
}
