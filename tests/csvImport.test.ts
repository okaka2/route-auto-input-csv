import { describe, expect, it } from 'vitest';
import { decodeCsvBytes, planCsvImport } from '../src/csvImport';
import { createPatient } from '../src/patient';

function utf8Bytes(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

// Shift-JISでエンコードされたバイト列を作るための、最小限のテーブル(テストで使う文字のみ)。
// 実物のCSVをブラウザで作るのが難しいため、既知の変換結果を直接組み立てる。
function shiftJisBytes(text: string): ArrayBuffer {
  // 「山田」のShift-JISバイト列(0x8E, 0x52, 0x93, 0x63)など、テストに必要な最小限を手で用意する。
  const table: Record<string, number[]> = {
    山: [0x8e, 0x52],
    田: [0x93, 0x63],
    太: [0x91, 0xba],
    郎: [0x98, 0x59],
  };
  const bytes: number[] = [];
  for (const char of text) {
    const encoded = table[char];
    if (encoded === undefined) {
      throw new Error(`テスト用の変換表に無い文字: ${char}`);
    }
    bytes.push(...encoded);
  }
  return new Uint8Array(bytes).buffer;
}

describe('decodeCsvBytes', () => {
  it('UTF-8のバイト列を読める', () => {
    expect(decodeCsvBytes(utf8Bytes('山田 太郎'))).toBe('山田 太郎');
  });

  it('Shift-JISのバイト列も読める(UTF-8として読めないため)', () => {
    expect(decodeCsvBytes(shiftJisBytes('山田'))).toBe('山田');
  });

  it('UTF-8のBOM付きファイルも読める', () => {
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const body = new Uint8Array(utf8Bytes('a,b'));
    const combined = new Uint8Array(bom.length + body.length);
    combined.set(bom);
    combined.set(body, bom.length);
    expect(decodeCsvBytes(combined.buffer)).toBe('a,b');
  });
});

describe('planCsvImport: 見出しの判定と住所の組み立て', () => {
  it('「利用者名」「都道府県」「市区町村」「町名以下」「建物名」の見出しを読み取る', () => {
    const csv =
      '利用者名,利用者カナ,郵便番号,都道府県,市区町村,町名以下,建物名\n' +
      '神奈川,カナガワ,2450018,神奈川県,藤沢市,湘南台２丁目-15,';
    const plan = planCsvImport(csv, []);
    expect(plan.toImport).toEqual([{ name: '神奈川', address: '神奈川県藤沢市湘南台２丁目-15' }]);
  });

  it('建物名があれば、半角スペースを挟んで住所の末尾に付ける', () => {
    const csv =
      '利用者名,都道府県,市区町村,町名以下,建物名\n' +
      '秋田,神奈川県,藤沢市,湘南台１丁目10-1,湘南台駅前分譲共同ビル';
    const plan = planCsvImport(csv, []);
    expect(plan.toImport[0]?.address).toBe('神奈川県藤沢市湘南台１丁目10-1 湘南台駅前分譲共同ビル');
  });

  it('郵便番号は住所に含めない', () => {
    const csv = '利用者名,都道府県,市区町村,町名以下,郵便番号\n山田,東京都,千代田区,1-1,1000001';
    const plan = planCsvImport(csv, []);
    expect(plan.toImport[0]?.address).toBe('東京都千代田区1-1');
  });

  it('「氏名」「名前」の見出しでも名前として読める', () => {
    for (const nameHeader of ['氏名', '名前']) {
      const csv = `${nameHeader},住所\n田中,東京都渋谷区1-1`;
      expect(planCsvImport(csv, []).toImport).toEqual([{ name: '田中', address: '東京都渋谷区1-1' }]);
    }
  });

  it('「住所」という1つの見出しがあれば、そのまま使う(分割された住所より優先しない)', () => {
    const csv = '利用者名,住所,都道府県,市区町村\n田中,大阪府大阪市1-1,大阪府,大阪市';
    const plan = planCsvImport(csv, []);
    expect(plan.toImport[0]?.address).toBe('大阪府大阪市1-1');
  });

  it('名前の列が見つからなければ例外を投げる(氏名・住所は含めない)', () => {
    const csv = '利用者カナ,住所\nヤマダ,東京都';
    expect(() => planCsvImport(csv, [])).toThrow('名前の列が見つかりませんでした。');
  });

  it('住所を組み立てる列が1つも見つからなければ例外を投げる', () => {
    const csv = '利用者名,利用者カナ\n山田,ヤマダ';
    expect(() => planCsvImport(csv, [])).toThrow('住所の列が見つかりませんでした。');
  });
});

describe('planCsvImport: 空行・空欄の扱い', () => {
  it('名前と住所のどちらかが空の行は取り込まず、件数に数える', () => {
    const csv = '利用者名,住所\n山田,東京都\n,大阪府\n田中,\n\n';
    const plan = planCsvImport(csv, []);
    expect(plan.toImport).toEqual([{ name: '山田', address: '東京都' }]);
    expect(plan.skippedEmpty).toBe(2);
  });

  it('前後の空白は取り除く', () => {
    const csv = '利用者名,住所\n 山田 , 東京都 ';
    expect(planCsvImport(csv, []).toImport).toEqual([{ name: '山田', address: '東京都' }]);
  });
});

describe('planCsvImport: 重複の扱い(完全一致はスキップ)', () => {
  it('名前と住所の両方が既存データと完全一致する行は取り込まず、件数に数える', () => {
    const existing = [createPatient('山田', '東京都千代田区1-1')];
    const csv = '利用者名,住所\n山田,東京都千代田区1-1\n鈴木,大阪府大阪市2-2';
    const plan = planCsvImport(csv, existing);
    expect(plan.toImport).toEqual([{ name: '鈴木', address: '大阪府大阪市2-2' }]);
    expect(plan.skippedDuplicate).toBe(1);
  });

  it('名前だけ一致・住所だけ一致は重複として扱わない(取り込む)', () => {
    const existing = [createPatient('山田', '東京都千代田区1-1')];
    const csv = '利用者名,住所\n山田,大阪府大阪市2-2\n鈴木,東京都千代田区1-1';
    const plan = planCsvImport(csv, existing);
    expect(plan.toImport).toHaveLength(2);
    expect(plan.skippedDuplicate).toBe(0);
  });

  it('CSVの中に同じ行が複数あっても、2件目以降は重複として取り込まない', () => {
    const csv = '利用者名,住所\n山田,東京都千代田区1-1\n山田,東京都千代田区1-1';
    const plan = planCsvImport(csv, []);
    expect(plan.toImport).toHaveLength(1);
    expect(plan.skippedDuplicate).toBe(1);
  });
});

describe('planCsvImport: 重複行の、ラベル未登録の既存データ', () => {
  it('重複した既存データにラベルが1つも無ければ、そのidを教える', () => {
    const existing = [createPatient('山田', '東京都千代田区1-1')];
    const csv = '利用者名,住所\n山田,東京都千代田区1-1';
    const plan = planCsvImport(csv, existing);
    expect(plan.duplicateIdsWithoutLabel).toEqual([existing[0]!.id]);
  });

  it('重複した既存データに既にラベルが付いていれば、教えない', () => {
    const existing = [createPatient('山田', '東京都千代田区1-1', new Date(), ['エリアA'])];
    const csv = '利用者名,住所\n山田,東京都千代田区1-1';
    const plan = planCsvImport(csv, existing);
    expect(plan.duplicateIdsWithoutLabel).toEqual([]);
  });

  it('重複していない(新規取り込みの)行は含めない', () => {
    const csv = '利用者名,住所\n鈴木,大阪府大阪市2-2';
    const plan = planCsvImport(csv, []);
    expect(plan.duplicateIdsWithoutLabel).toEqual([]);
  });

  it('CSV内だけの重複(既存データとは無関係)は含めない', () => {
    const csv = '利用者名,住所\n山田,東京都千代田区1-1\n山田,東京都千代田区1-1';
    const plan = planCsvImport(csv, []);
    expect(plan.duplicateIdsWithoutLabel).toEqual([]);
  });

  it('複数件あれば、すべて教える', () => {
    const existing = [
      createPatient('山田', '東京都千代田区1-1'),
      createPatient('鈴木', '大阪府大阪市2-2'),
    ];
    const csv = '利用者名,住所\n山田,東京都千代田区1-1\n鈴木,大阪府大阪市2-2';
    const plan = planCsvImport(csv, existing);
    expect(plan.duplicateIdsWithoutLabel).toEqual([existing[0]!.id, existing[1]!.id]);
  });
});

describe('planCsvImport: 全体の件数', () => {
  it('取り込む件数・空欄でスキップ・重複でスキップの合計が、データの行数と一致する', () => {
    const existing = [createPatient('山田', '東京都千代田区1-1')];
    const csv = '利用者名,住所\n山田,東京都千代田区1-1\n,\n鈴木,大阪府\n田中,福岡県';
    const plan = planCsvImport(csv, existing);
    expect(plan.toImport).toHaveLength(2);
    expect(plan.skippedEmpty).toBe(1);
    expect(plan.skippedDuplicate).toBe(1);
  });

  it('見出し行だけ(データが0行)でも例外を投げず、空の結果を返す', () => {
    const plan = planCsvImport('利用者名,住所', []);
    expect(plan.toImport).toEqual([]);
    expect(plan.skippedEmpty).toBe(0);
    expect(plan.skippedDuplicate).toBe(0);
  });
});
