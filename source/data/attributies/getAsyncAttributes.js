import { thumbnail } from "../../server/endPoints.js";
export const getAssetItemColor = async (assetData) => {
    if (assetData.colorPllet) {

        return Promise.resolve(assetData.colorPllet);

    }
    return new Promise((resolve, reject) => {
        try {
            fetch(thumbnail.getColor(assetData.type, assetData.path))
                .then(res => {
                    if (!res.ok) {
                        throw new Error(`HTTP error! status: ${res.status}`);
                    }
                    return res.json();
                })
                .then(data => {
                    if (!data.error) {
                        assetData.colorPllet = data.sort((a, b) => b.count - a.count);
                        resolve(assetData.colorPllet);
                    } else {
                        reject(new Error('Data error: ' + data.error));
                    }
                })
                .catch(error => {
                    reject(error);
                });
        } catch (error) {
            reject(error);
        }
    });
}