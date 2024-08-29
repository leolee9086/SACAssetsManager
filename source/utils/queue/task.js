
async function  runTask(taskHandler,signal) {
    //如果signal已经取消，则直接返回
    if(signal.aborted){
        taskHandler.onAbort()
        return
    }
    //获取当前任务函数
    const currentStep = taskHandler.getCurrentStep()
    //如果当前任务函数不存在，则直接返回
    if(!currentStep){
        taskHandler.onComplete()
        return
    }
    //执行当前任务函数
    let currentStepResult
    try {
        currentStepResult = await currentStep()
        taskHandler.currentStepResult = currentStepResult
        //移除当前任务函数
        taskHandler.removeCurrentStep()
    } catch (error) {
        taskHandler.onError(error)
    }
    //执行下一个任务函数,除非任务被暂停
    if(!taskHandler.paused){
        runTask(taskHandler,signal)
    }
    if(taskHandler.status === 'complete'){
        taskHandler.onComplete(currentStepResult)
    }
}

function pauseTask(taskHandler){
    taskHandler.paused = true
}

function resumeTask(taskHandler){
    taskHandler.paused = false
    runTask(taskHandler,taskHandler.signal)
}
function startTask(taskHandler){
    taskHandler.status = 'running'
    taskHandler.startTime = Date.now()
    runTask(taskHandler,taskHandler.signal)
}

