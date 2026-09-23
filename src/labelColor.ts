/**
 * ラベル名から、いつも同じ色(パレットの位置)を決める。ラベルの並び順が変わっても、
 * 他のラベルが増えたり消えたりしても、同じ名前なら同じ色になるよう、名前そのものから計算する。
 */
export const LABEL_COLOR_COUNT = 8;

function hashString(text: string): number {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

/** 0〜(LABEL_COLOR_COUNT-1)の色番号。styles.cssの.label-color-Nに対応する。 */
export function labelColorIndex(name: string): number {
  return hashString(name) % LABEL_COLOR_COUNT;
}
