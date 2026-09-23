import { describe, expect, it } from 'vitest';
import { LABEL_COLOR_COUNT, labelColorIndex } from '../src/labelColor';

describe('labelColorIndex', () => {
  it('同じ名前なら、いつも同じ色番号になる', () => {
    expect(labelColorIndex('エリアA')).toBe(labelColorIndex('エリアA'));
  });

  it('パレットの範囲(0以上、LABEL_COLOR_COUNT未満)に収まる', () => {
    for (const name of ['エリアA', 'エリアB', '月曜担当', '重点訪問', 'a', 'ラベル']) {
      const index = labelColorIndex(name);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(LABEL_COLOR_COUNT);
    }
  });

  it('違う名前は(基本的に)違う色番号になる', () => {
    const names = ['エリアA', 'エリアB', 'エリアC', '月曜担当', '火曜担当', '重点訪問'];
    const indexes = new Set(names.map(labelColorIndex));
    // 完全に一意である必要はないが、全部同じ色に固まってしまうのはおかしい。
    expect(indexes.size).toBeGreaterThan(1);
  });
});
