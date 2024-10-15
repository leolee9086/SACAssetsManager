import { openDialog } from "./vueDialog.js";
export const 选择标签 = (title = '选择标签',callBack) => {
    let app, dialog;
    const { app: vueApp, dialog: taskDialog } = openDialog(
        import.meta.resolve('./tagPicker.vue'),
        'tagPicker',
        {},
        null,
        {
            title,
       
        },
        title,
        '70vw',
        'auto',
        true
    );
    app = vueApp;
    dialog = taskDialog;
    dialog.destroyCallback=()=>{
    }
}

