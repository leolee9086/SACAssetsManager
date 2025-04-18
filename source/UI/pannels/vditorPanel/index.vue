<template>
  <div class="vditor-panel">
    <div class="status-bar">状态: {{ syncStatus }} | 连接: {{ isConnected ? '已连接' : '未连接' }}</div>
    <div ref="vditorContainerRef" class="vditor-container">
        <div ref="vditorRef" class="vditor-editor-area"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef, watch, nextTick } from 'vue';
import _Vditor from 'https://esm.sh/vditor@3.9.6';
const Vditor = _Vditor.default;
import { UndoManager, Doc as YDoc, Text as YText } from '../../../../static/yjs.js';
import { addStylesheet } from '../../../../src/toolBox/base/useBrowser/useDOM/useScripts.js';
import { createSyncStore } from '../../../../src/toolBox/feature/useSyncedstore/useSyncstore.js';
//import { type Awareness } from '../../../../static/y-protocols/awareness.js';

addStylesheet('https://esm.sh/vditor@3.9.6/dist/index.css', 'vditor-style');

const throttle = (func, limit) => {
  let inThrottle;
  let lastResult;
  return function(...args) {
    const context = this;
    if (!inThrottle) {
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
      lastResult = func.apply(context, args);
    }
    return lastResult;
  };
};

const vditorContainerRef = ref<HTMLElement | null>(null);
const vditorRef = ref<HTMLElement | null>(null);
let vditorInstance: Vditor | null = null;

const syncStoreInstance = shallowRef<any>(null);
const awarenessInstance = shallowRef<Awareness | null>(null);
const isConnected = ref(false);
const syncStatus = ref('初始化中...');

let ydoc: YDoc | null = null;
let ytext: YText | null = null;
let undoManager: UndoManager | null = null;

const userInfo = {
    name: `User_${Math.floor(Math.random() * 100)}`,
    color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
};

const computeOffsetFromSelection = (): number | null => {
    console.log("computeOffset: Starting calculation.");
    if (!vditorInstance || !vditorInstance.vditor?.contentElement) {
        console.log("computeOffset: Instance or vditor.contentElement not ready.");
        return null;
    }
    const contentElement = vditorInstance.vditor.contentElement as HTMLElement;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        console.log("computeOffset: No selection or range found.");
        return null;
    }

    const range = selection.getRangeAt(0);
    const { startContainer, startOffset } = range;
    console.log("computeOffset: Selection focus:", { node: startContainer, offset: startOffset });
    console.log("computeOffset: Using vditorInstance.vditor.contentElement:", { tag: contentElement.tagName, classes: contentElement.className });

    let rootNodeForWalker: Node = contentElement;
    let rootNodeForContainsCheck: Node = contentElement;
    if ((contentElement as any).shadowRoot) {
        console.log("computeOffset: Detected Shadow Root on vditor.contentElement (unlikely but checking).");
        rootNodeForWalker = (contentElement as any).shadowRoot;
        rootNodeForContainsCheck = (contentElement as any).shadowRoot;
    } else {
        // console.log("computeOffset: No Shadow Root detected on vditor.contentElement.");
    }

    if (!rootNodeForContainsCheck.contains(startContainer)) {
        console.warn(`computeOffset: Selection startContainer is NOT inside the determined root node (${rootNodeForContainsCheck.nodeName}).`, {
             startContainer: startContainer,
             startContainerParent: startContainer.parentElement,
             rootNode: rootNodeForContainsCheck,
             vditorContentElement: contentElement
        });
        let parent = startContainer.parentElement;
        let isInsideFallback = false;
        while (parent) {
            if (parent === rootNodeForContainsCheck) {
                isInsideFallback = true;
                break;
            }
            if (parent === document.body) break;
            parent = parent.parentElement;
        }
        if (!isInsideFallback) {
             console.warn("computeOffset: Fallback parent traversal also failed.");
             return null;
        }
         console.log("computeOffset: contains() failed but parent traversal succeeded. Proceeding.");
    }
    console.log("computeOffset: Selection is inside the determined root node.");

    let accumulatedOffset = 0;
    const walker = document.createTreeWalker(rootNodeForWalker, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null);
    let currentNode: Node | null = null;
    let pastStartNode = false;
    const BLOCK_ELEMENTS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'PRE', 'BLOCKQUOTE', 'HR', 'DIV']);

    try {
        while ((currentNode = walker.nextNode())) {
            if (pastStartNode) break;

            if (currentNode === startContainer) {
                console.log("computeOffset: Reached startContainer.");
                if (currentNode.nodeType === Node.TEXT_NODE) {
                    accumulatedOffset += startOffset;
                    console.log(`computeOffset: Added startOffset ${startOffset}, accumulated: ${accumulatedOffset}`);
                }
                pastStartNode = true;
                break;
            } else if (currentNode.nodeType === Node.TEXT_NODE) {
                const len = currentNode.textContent?.length ?? 0;
                accumulatedOffset += len;

                const parentElement = currentNode.parentElement;
                if (parentElement && BLOCK_ELEMENTS.has(parentElement.nodeName)) {
                    let isLastTextNode = true;
                    let sibling = currentNode.nextSibling;
                    while(sibling) {
                        if (sibling.nodeType === Node.TEXT_NODE && (sibling.textContent?.length ?? 0) > 0) {
                            isLastTextNode = false;
                            break;
                        }
                        sibling = sibling.nextSibling;
                    }
                    if (isLastTextNode) {
                        accumulatedOffset += 1;
                    }
                }
            } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
                if (BLOCK_ELEMENTS.has(currentNode.nodeName) && !(currentNode.textContent?.trim())) {
                    accumulatedOffset += 1;
                }
            }
        }
         console.log("computeOffset: TreeWalker loop finished.");

    } catch (error) {
        console.error("computeOffset: Error during TreeWalker loop:", error);
        return null;
    }

    if (pastStartNode) {
        console.log("computeOffset: Calculation successful, returning offset:", accumulatedOffset);
        return accumulatedOffset;
    } else {
        console.warn("computeOffset: Loop finished but did not reach startContainer. Selection might be invalid or outside content.", {startContainer: startContainer, contentElement: contentElement});
        return null;
    }
};

const computePositionFromOffsetForIR = (offset: number): { top: number; left: number } | null => {
    if (!vditorInstance || !vditorRef.value || offset < 0) return null;

    const contentElement = vditorInstance.vditor.contentElement;
    if (!contentElement) return null;

    const range = document.createRange();
    const walker = document.createTreeWalker(contentElement, NodeFilter.SHOW_TEXT, null);
    let currentNode: Node | null = null;
    let accumulatedOffset = 0;

    try {
        while ((currentNode = walker.nextNode())) {
            const nodeLength = currentNode.textContent?.length ?? 0;
            if (accumulatedOffset + nodeLength >= offset) {
                const positionInNode = offset - accumulatedOffset;
                range.setStart(currentNode, positionInNode);
                range.setEnd(currentNode, positionInNode);

                const rect = range.getBoundingClientRect();
                const containerRect = vditorContainerRef.value?.getBoundingClientRect();

                if (rect && containerRect) {
                    const scrollTop = contentElement.scrollTop || 0;
                    const scrollLeft = contentElement.scrollLeft || 0;

                    let relativeTop = rect.top - containerRect.top + scrollTop;
                    let relativeLeft = rect.left - containerRect.left + scrollLeft;

                    relativeTop = Math.max(0, relativeTop);
                    relativeLeft = Math.max(0, relativeLeft);

                    return { top: relativeTop, left: relativeLeft };
                }
                break;
            }
            accumulatedOffset += nodeLength;

            if (currentNode.parentElement?.nextElementSibling && ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'PRE', 'BLOCKQUOTE', 'HR'].includes(currentNode.parentElement.nextElementSibling.tagName)) {
                 accumulatedOffset += 1;
             }
        }
    } catch (error) {
        console.error(`Error computing position from offset ${offset}:`, error);
        return null;
    }

    console.warn(`Failed to find position for offset ${offset}. Total accumulated: ${accumulatedOffset}`);
    return null;
};

const throttledUpdateCursorLocation = throttle(() => {
    if (!awarenessInstance.value) {
        // console.log("UpdateCursor: Awareness not ready."); // 可以取消注释来调试
        return;
    }
    if (!vditorInstance || !vditorInstance.vditor?.contentElement) {
        console.log("UpdateCursor: Vditor instance or contentElement not ready yet.");
        return; // 如果 Vditor 没完全准备好，则不进行计算
    }

    // console.log("UpdateCursor: Vditor instance seems ready, proceeding to compute offset."); // 可以取消注释来调试
    // 只有当 Vditor 准备好时才调用计算函数
    const offset = computeOffsetFromSelection();

    if (offset !== null) {
        awarenessInstance.value.setLocalStateField('cursor', {
            anchor: offset,
            head: offset,
        });
        console.log(`Local cursor offset (IR): ${offset}`);
    } else {
        console.log("Failed to compute local cursor offset (IR) inside throttled function."); // 修改日志，表明是在节流函数内部失败
    }
}, 100);

onMounted(async () => {
  if (!vditorRef.value) return;

  try {
    syncStatus.value = '创建同步存储...';
    const syncStore = await createSyncStore({
      roomName: 'vditor-collaboration-room-synced',
      autoConnect: true,
    });
    syncStoreInstance.value = syncStore;
    syncStatus.value = syncStore.status.value;
    isConnected.value = syncStore.isConnected.value;

    watch(syncStore.status, (newStatus) => { syncStatus.value = newStatus; });
    watch(syncStore.isConnected, (newIsConnected) => { isConnected.value = newIsConnected; });

    ydoc = syncStore.ydoc;
    if (!ydoc) {
        throw new Error("SyncStore did not provide a Yjs document.");
    }
    ytext = ydoc.getText('vditor-content');
    undoManager = new UndoManager(ytext);

    syncStatus.value = '获取 Provider Awareness...';
    const provider = syncStore.getProvider();
    if (!provider) {
        console.warn("SyncStore did not return a provider. Awareness synchronization might be disabled.");
        awarenessInstance.value = null;
    } else if (!provider.awareness) {
        throw new Error("SyncStore provider exists but does not have an 'awareness' property.");
    } else {
        awarenessInstance.value = provider.awareness;
        console.log("Successfully obtained Awareness instance from provider.");

        awarenessInstance.value.setLocalStateField('user', userInfo);

        awarenessInstance.value.on('change', (changes: any, origin: any) => {
            const states = awarenessInstance.value!.getStates();
            console.log('Provider Awareness change detected:', changes, 'All states:', states);
        });

        provider.on('status', ({ status }) => {
            if (status === 'disconnected' && awarenessInstance.value) {
                awarenessInstance.value.setLocalState(null);
                console.log("Provider disconnected, cleared local awareness state.");
            } else if (status === 'connected' && awarenessInstance.value) {
                awarenessInstance.value.setLocalStateField('user', userInfo);
                console.log("Provider reconnected, reset user awareness state.");
            }
        });
    }

    syncStatus.value = '初始化 Vditor...';
    vditorInstance = new Vditor(vditorRef.value!, {
      mode: 'ir',
      height: 'calc(100% - 20px)',
      cache: { enable: false },
      input: (value: string) => {
        if (vditorInstance && ytext && ydoc && ytext.toString() !== value) {
          ydoc.transact(() => {
            ytext!.delete(0, ytext!.length);
            ytext!.insert(0, value);
          }, vditorInstance);
        }
      },
      select: (value: string) => {
         if (awarenessInstance.value) {
             throttledUpdateCursorLocation();
         }
      },
      after: () => {
        if (!vditorInstance || !ytext || !ydoc || !undoManager) {
            console.error("Vditor 'after' callback: Critical instances not ready.");
            syncStatus.value = 'Vditor 初始化错误';
            return;
        }
        console.log('Vditor initialized, setting initial value from Yjs.');
        syncStatus.value = '同步初始内容...';
        vditorInstance.setValue(ytext.toString());

        ytext.observe(event => {
           const originIsLocal = event.transaction.origin === vditorInstance;
           if (!originIsLocal && vditorInstance) {
               if (ytext && vditorInstance.getValue() !== ytext.toString()) {
                   console.log('Remote/Other Yjs change detected, updating Vditor.');
                   const remoteContent = ytext.toString();
                   vditorInstance.setValue(remoteContent);
               }
           }
        });

        if (awarenessInstance.value) {
            document.addEventListener('selectionchange', throttledUpdateCursorLocation);
        }

        vditorInstance.vditor.element.addEventListener('keydown', (event) => {
             if (!undoManager) return;
             if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
                 event.preventDefault();
                 undoManager.undo();
             } else if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.shiftKey && (event.key === 'Z' || event.key === 'z')))) {
                 event.preventDefault();
                 undoManager.redo();
             }
         });
         syncStatus.value = syncStore.status.value;
      },
    });

  } catch (error) {
      console.error("Failed to initialize Vditor Sync Panel:", error);
      syncStatus.value = `初始化失败: ${error instanceof Error ? error.message : String(error)}`;
  }
});

onUnmounted(async () => {
  console.log("Unmounting Vditor Panel...");
  if (awarenessInstance.value) {
      document.removeEventListener('selectionchange', throttledUpdateCursorLocation);
  }

  if (awarenessInstance.value) {
      awarenessInstance.value.setLocalState(null);
      console.log("Cleared local awareness state on unmount.");
  }
  awarenessInstance.value = null;

  if (syncStoreInstance.value) {
      await syncStoreInstance.value.disconnect();
      syncStoreInstance.value = null;
      console.log("SyncStore disconnected.");
  }

  vditorInstance?.destroy();
  vditorInstance = null;
  console.log("Vditor instance destroyed.");

  ydoc = null;
  ytext = null;
  undoManager = null;
  console.log("Yjs objects nulled.");
  console.log("Vditor Panel unmounted and cleaned up.");
});

</script>

<style scoped>
.vditor-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 100%;
  overflow: hidden;
}

.status-bar {
  padding: 2px 5px;
  font-size: 0.8em;
  background-color: #f0f0f0;
  border-bottom: 1px solid #ccc;
  height: 20px;
  flex-shrink: 0;
}

.vditor-container {
  flex-grow: 1;
  border: none;
  position: relative;
  overflow: hidden;
}

.vditor-editor-area {
  height: 100%;
  width: 100%;
}

:deep(.vditor) {
  height: 100% !important;
  display: flex;
  flex-direction: column;
  border: none;
}

:deep(.vditor-content) {
   flex-grow: 1;
   overflow-y: auto;
   position: relative;
}
</style> 