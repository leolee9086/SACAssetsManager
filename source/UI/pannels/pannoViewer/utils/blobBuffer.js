function readBlobAsBuffer(blob) {
    return new Promise(function (resolve, reject) {
        let reader = new FileReader();

        reader.addEventListener('loadend', function () {
            resolve(reader.result);
        });

        reader.readAsArrayBuffer(blob);
    });
}
function convertToUint8Array(thing) {
    return new Promise(function (resolve, reject) {
        if (thing instanceof Uint8Array) {
            resolve(thing);
        } else if (thing instanceof ArrayBuffer || ArrayBuffer.isView(thing)) {
            resolve(new Uint8Array(thing));
        } else if (thing instanceof Blob) {
            resolve(readBlobAsBuffer(thing).then(function (buffer) {
                return new Uint8Array(buffer);
            }));
        } else {
            resolve(readBlobAsBuffer(new Blob([thing])).then(function (buffer) {
                return new Uint8Array(buffer);
            }));
        }
    });
}

function measureData(data) {
    let result = data.byteLength || data.length || data.size;

    if (!Number.isInteger(result)) {
        throw new Error('Failed to determine size of element');
    }

    return result;
}

export function BlobBuffer(fs,destination) {
        return new BlobBufferInstance(fs, destination);
}

class BlobBufferInstance {
    constructor(fs, destination) {
        this.buffer = [];
        this.writePromise = Promise.resolve();
        this.pos = 0;
        this.length = 0;
        this.fileWriter = null;
        this.fd = null;
        this.fs = fs;

        if (destination?.constructor?.name === 'FileSystemWritableFileStream') {
            this.fileWriter = destination;
        } else if (fs && destination) {
            this.fd = destination;
        }
    }

    seek(offset) {
        if (offset < 0 || isNaN(offset)) {
            throw new Error('Offset may not be negative or NaN');
        }
        if (offset > this.length) {
            throw new Error('Seeking beyond the end of file is not allowed');
        }
        this.pos = offset;
    }

    write(data) {
        const newEntry = {
            offset: this.pos,
            data: data,
            length: measureData(data)
        };
        const isAppend = newEntry.offset >= this.length;

        this.pos += newEntry.length;
        this.length = Math.max(this.length, this.pos);

        this.writePromise = this.writePromise.then(async () => {
            if (this.fd) {
                return new Promise(function (resolve, reject) {
                    convertToUint8Array(newEntry.data).then(function (dataArray) {
                        let totalWritten = 0, buffer = Buffer.from(dataArray.buffer),

                            handleWriteComplete = function (err, written, buffer) {
                                totalWritten += written;

                                if (totalWritten >= buffer.length) {
                                    resolve();
                                } else {
                                    // We still have more to write...
                                    fs.write(
                                        this.fd, buffer, totalWritten,
                                        buffer.length - totalWritten,
                                        newEntry.offset + totalWritten, handleWriteComplete);
                                }
                            };

                        fs.write(
                            this.fd, buffer, 0, buffer.length, newEntry.offset,
                            handleWriteComplete);
                    });
                });
            } else if (this.fileWriter) {
                return new Promise(function (resolve, reject) {
                    this.fileWriter.seek(newEntry.offset)
                        .then(() => this.fileWriter.write(new Blob([newEntry.data])))
                        .then(resolve)
                        .catch(reject);
                });
            } else if (!isAppend) {
                // We might be modifying a write that was already buffered in memory.

                // Slow linear search to find a block we might be overwriting
                for (let i = 0; i < this.buffer.length; i++) {
                    let entry = this.buffer[i];

                    // If our new entry overlaps the old one in any way...
                    if (!(newEntry.offset + newEntry.length <= entry.offset ||
                        newEntry.offset >= entry.offset + entry.length)) {
                        if (newEntry.offset < entry.offset ||
                            newEntry.offset + newEntry.length >
                            entry.offset + entry.length) {
                            throw new Error('Overwrite crosses blob boundaries');
                        }

                        if (newEntry.offset == entry.offset &&
                            newEntry.length == entry.length) {
                            // We overwrote the entire block
                            entry.data = newEntry.data;

                            // We're done
                            return;
                        } else {
                            return convertToUint8Array(entry.data)
                                .then(function (entryArray) {
                                    entry.data = entryArray;

                                    return convertToUint8Array(newEntry.data);
                                })
                                .then(function (newEntryArray) {
                                    newEntry.data = newEntryArray;

                                    entry.data.set(
                                        newEntry.data, newEntry.offset - entry.offset);
                                });
                        }
                    }
                }
                // Else fall through to do a simple append, as we didn't overwrite any
                // pre-existing blocks
            }

            this.buffer.push(newEntry);
        });
    }

    complete(mimeType) {
        if (this.fd || this.fileWriter) {
            this.writePromise = this.writePromise.then(() => {
                return null;
            });
        } else {
            // After writes complete we need to merge the buffer to give to the
            // caller
            this.writePromise = this.writePromise.then(() => {
                let result = [];

                for (let i = 0; i < this.buffer.length; i++) {
                    result.push(this.buffer[i].data);
                }

                return new Blob(result, { type: mimeType });
            });
        }

        return this.writePromise.finally(() => {
            if (this.fileWriter) this.fileWriter.close();
            if (this.fd) this.fs.close(this.fd);
        });
    }
}