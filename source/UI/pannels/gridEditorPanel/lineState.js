import { ref } from "../../../../static/vue.esm-browser.js"

export const useLineStyle = () => {
    const lineWidth = ref(1)
    const lineColor = ref('#cccccc')
    const opacity = ref(0.5)
    return {
        lineWidth,
        lineColor,
        opacity
    }    
}