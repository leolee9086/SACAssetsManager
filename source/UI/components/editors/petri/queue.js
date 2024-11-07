// utils/petri/queue.js
export class TransitionQueue {
    constructor(mode = 'visual') {
        this.queue = [];
        this.isProcessing = false;
        this.mode = mode;
        this.idleCallback = null;
    }

    async addTask(task) {
        this.queue.push(task);
        
        if (this.mode === 'visual') {
            this.scheduleVisualProcessing();
        } else {
            await this.processFunctionMode();
        }
    }

    scheduleVisualProcessing() {
        if (this.idleCallback) return;

        this.idleCallback = requestIdleCallback(async (deadline) => {
            while (this.queue.length > 0 && deadline.timeRemaining() > 0) {
                const task = this.queue.shift();
                if (task) {
                    await task.execute();
                }
            }

            this.idleCallback = null;
            if (this.queue.length > 0) {
                this.scheduleVisualProcessing();
            }
        });
    }

    async processFunctionMode() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            while (this.queue.length > 0) {
                const task = this.queue.shift();
                if (task) {
                    await task.execute();
                }
            }
        } finally {
            this.isProcessing = false;
        }
    }
}
