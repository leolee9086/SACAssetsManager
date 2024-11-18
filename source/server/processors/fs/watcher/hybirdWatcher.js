import * as parcelWatcher from '@parcel/watcher';
import { listLocalDisks } from '../disk/diskInfo.js';
import { debounce } from 'lodash';

export class HybridWatcher {
    constructor() {
        this.watchers = new Map();
        this.subscriptions = new Set();
        this.watchOptions = {
            ignore: ['.git', 'node_modules', '.*'],
        };
    }

    async initialize() {
        const disks = await listLocalDisks();
        
        for (const disk of disks) {
            if (disk.isLocal) {
                // 本地磁盘使用 parcel watcher
                await this.setupParcelWatcher(disk.mountPoint);
            } else {
                // 网络共享磁盘使用轮询方式
                await this.setupPollingWatcher(disk.mountPoint);
            }
        }
    }

    async setupParcelWatcher(path) {
        try {
            const watcher = await parcelWatcher.subscribe(
                path,
                this.watchOptions,
                (err, events) => {
                    if (err) {
                        console.error(`监听错误 ${path}:`, err);
                        return;
                    }
                    this.notifySubscribers(events);
                }
            );
            this.watchers.set(path, { type: 'parcel', watcher });
        } catch (err) {
            console.error(`无法为 ${path} 创建 parcel watcher:`, err);
        }
    }

    async setupPollingWatcher(path) {
        // 对网络共享磁盘使用轮询
        const pollInterval = 5000; // 5秒轮询
        const poll = debounce(async () => {
            // 实现轮询逻辑
            // TODO: 实现文件状态比对
        }, pollInterval);

        this.watchers.set(path, { type: 'polling', poll });
        poll();
    }

    subscribe(callback) {
        this.subscriptions.add(callback);
        return () => this.subscriptions.delete(callback);
    }

    notifySubscribers(events) {
        for (const callback of this.subscriptions) {
            callback(events);
        }
    }

    async close() {
        for (const [path, watcher] of this.watchers) {
            if (watcher.type === 'parcel') {
                await watcher.watcher.unsubscribe();
            }
        }
        this.watchers.clear();
        this.subscriptions.clear();
    }
}
