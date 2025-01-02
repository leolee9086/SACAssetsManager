import { thumbnail } from "../../server/endPoints.js";
export const getAssetItemColor = async (assetData) => {
    if (assetData.colorPllet&&assetData.colorPllet[0]) {
        return assetData.colorPllet;
    }
    try {
        const response = await fetch(thumbnail.getColor(assetData.type, assetData.path));
        if (!response.ok) {
            console.warn(`HTTP error! status: ${response.status}`);
            assetData.colorPllet=[]

            return [];
        }
        const data = await response.json();
        if (!data.error) {
            assetData.colorPllet = data.sort((a, b) => b.count - a.count);
            return assetData.colorPllet;
        } else {
            assetData.colorPllet=[]
            console.warn(data.error)
            return []
        }
    } catch (error) {
        console.warn(error)
        assetData.colorPllet=[]
        return []
    }

}