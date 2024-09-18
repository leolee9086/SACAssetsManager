import { openDialog } from "./vueDialog.js";
import { 串行任务控制器 } from "../../../utils/queue/task.js";
export const 打开任务控制对话框 = (taskTitle = '批处理', taskDescription = '任务执行中') => {
    let app, dialog;
    const taskController = new 串行任务控制器({
        destroyOnComplete: true
    })
    const { app: vueApp, dialog: taskDialog } = openDialog(
        import.meta.resolve('./task.vue'),
        'TaskDialog',
        {},
        null,
        {
            taskTitle,
            taskDescription,
            taskController
        },
        taskTitle,
        '70vw',
        'auto'
    );
    app = vueApp;
    dialog = taskDialog;
    dialog.destroyCallback=()=>{
        taskController.destroy()

    }
    return taskController;
}

