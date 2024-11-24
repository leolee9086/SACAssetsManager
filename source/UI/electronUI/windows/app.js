const  remote  = require('@electron/remote');
const currentWindow = remote.getCurrentWindow();
document.getElementById('minimize').addEventListener('click', () => {
    currentWindow.minimize();
});
document.getElementById('maximize').addEventListener('click', () => {
    if (currentWindow.isMaximized()) {
        currentWindow.unmaximize();
    } else {
        currentWindow.maximize();
    }
});
document.getElementById('close').addEventListener('click', () => {
    currentWindow.close();
});
document.getElementById('devTools').addEventListener('click', () => {
    if (currentWindow.webContents.isDevToolsOpened()) {
        currentWindow.webContents.closeDevTools();
    } else {
        currentWindow.webContents.openDevTools();
    }
});
import './app/index.js'