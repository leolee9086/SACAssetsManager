import { resolveWorkspacePath,Constants } from "../../../asyncModules.js"
export const imgeWithConut = (count, returnImage,dragOperation) => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        // Load the base image
        const baseImage = new Image();
        baseImage.src = resolveWorkspacePath(Constants.Drag_Icon); // 用实际地址替代
        baseImage.onload = () => {
            // Set canvas dimensions to match the image dimensions
            canvas.width = 128;
            canvas.height = 128;
            // Draw the base image
            ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
            // Set the font properties for the number
            ctx.font = '24px serif';
            ctx.fillStyle = 'red';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            // Draw a speech bubble in the top right corner
            const padding = 2;
            const bubbleX = canvas.width / 2;
            const bubbleY = padding;
            const radius = 5;
            const bubbleWidth = canvas.width / 2 - 2 * padding;
            const bubbleHeight = 42;
            // Draw the bubble background
            ctx.fillStyle = 'rgba(247, 255, 209, 1)';
            ctx.beginPath();
            ctx.moveTo(bubbleX + radius, bubbleY);
            ctx.lineTo(bubbleX + bubbleWidth - radius, bubbleY);
            ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + radius);
            ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - radius);
            ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - radius, bubbleY + bubbleHeight);
            ctx.lineTo(bubbleX + radius, bubbleY + bubbleHeight);
            ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - radius);
            ctx.lineTo(bubbleX, bubbleY + radius);
            ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY);
            ctx.closePath();
            ctx.fill();
            // Draw the bubble border
            ctx.strokeStyle = 'black';
            ctx.stroke();
            // Draw the number inside the bubble
            const number = `${dragOperation}${count}个文件\n小心操作`; // Replace with your desired number
            ctx.font = '13px black';
            ctx.fillStyle = 'red';
            // Split the text into two lines
            const lines = number.split('\n');
            lines.forEach((line, index) => {
                ctx.fillText(line, bubbleX + padding, bubbleY + padding + index * 20);
            });
            // Convert canvas to PNG image and return as data URL
            const dataURL = canvas.toDataURL('image/png');
            if (returnImage) {
                const img = new Image()
                img.onload = () => {
                    resolve(img)
                }
                img.src = dataURL
            } else {
                const fs = window.require('fs');
                const base64Data = dataURL.replace(/^data:image\/png;base64,/, "");
                fs.writeFileSync(resolveWorkspacePath(Constants.Drag_Count_Icon), base64Data, 'base64');
                resolve(resolveWorkspacePath(Constants.Drag_Count_Icon));
            }
        };
        baseImage.onerror = (error) => {
            reject(error);
        };
    });
};
