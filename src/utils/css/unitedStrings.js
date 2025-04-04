// 长度单位
export const px = (value) => `${value}px`;
export const em = (value) => `${value}em`;
export const rem = (value) => `${value}rem`;
export const percent = (value) => `${value}%`;
export const per=percent
export const vw = (value) => `${value}vw`;
export const vh = (value) => `${value}vh`;
export const vmin = (value) => `${value}vmin`;
export const vmax = (value) => `${value}vmax`;
export const ch = (value) => `${value}ch`;
export const ex = (value) => `${value}ex`;

// 绝对长度单位
export const cm = (value) => `${value}cm`;
export const mm = (value) => `${value}mm`;
export const inch = (value) => `${value}in`;
export const pt = (value) => `${value}pt`;
export const pc = (value) => `${value}pc`;

// 无单位值
export const none = (value) => `${value}`;

// 如果仍然需要 unitString 对象,可以这样导出
export const unitString = {
  px, em, rem, percent, vw, vh, vmin, vmax, ch, ex,
  cm, mm, inch, pt, pc, none
};