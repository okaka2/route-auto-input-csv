/**
 * CSVのテキストを行×列の文字列配列にする、最小限のパーサー。
 * ダブルクォートで囲まれた項目(カンマ・改行・""を含む)に対応する。
 * 行によって列数が違っても、そのまま返す(埋め合わせはしない。呼び出し側で扱う)。
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const endField = (): void => {
    row.push(field);
    field = '';
  };
  const endRow = (): void => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ',') {
      endField();
      i += 1;
      continue;
    }
    if (char === '\r') {
      // \r\n の \r は無視し、\n 側で改行として処理する。単独の \r も改行として扱う。
      if (text[i + 1] === '\n') {
        i += 1;
        continue;
      }
      // 何も無い行(空行)なら、空文字1列の行を作らずに読み飛ばす。
      if (field !== '' || row.length > 0) {
        endRow();
      }
      i += 1;
      continue;
    }
    if (char === '\n') {
      if (field !== '' || row.length > 0) {
        endRow();
      }
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  // 末尾に改行がなければ、最後のフィールド・行を確定させる。
  // 末尾がちょうど改行で終わっている場合(row・fieldが両方空)は、空行を追加しない。
  if (field !== '' || row.length > 0) {
    endRow();
  }

  return rows;
}
