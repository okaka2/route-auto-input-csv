import { describe, expect, it } from 'vitest';
import { parseCsvRows } from '../src/csvParse';

describe('parseCsvRows', () => {
  it('カンマ区切りの行を配列にする', () => {
    expect(parseCsvRows('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('CRLF(Windows形式の改行)を扱える', () => {
    expect(parseCsvRows('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('末尾の空行は無視する', () => {
    expect(parseCsvRows('a,b\n1,2\n\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('ダブルクォートで囲まれた、カンマを含む項目を1つの値として扱う', () => {
    expect(parseCsvRows('a,b\n"1,000",2')).toEqual([
      ['a', 'b'],
      ['1,000', '2'],
    ]);
  });

  it('ダブルクォート内の "" は、1つのダブルクォートとして扱う', () => {
    expect(parseCsvRows('a\n"say ""hi"""')).toEqual([['a'], ['say "hi"']]);
  });

  it('空の項目は空文字になる', () => {
    expect(parseCsvRows('a,b,c\n1,,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
    ]);
  });

  it('空文字を渡すと空配列を返す', () => {
    expect(parseCsvRows('')).toEqual([]);
  });

  it('日本語の値をそのまま読める', () => {
    expect(parseCsvRows('利用者名,住所\n山田 太郎,東京都千代田区1-1')).toEqual([
      ['利用者名', '住所'],
      ['山田 太郎', '東京都千代田区1-1'],
    ]);
  });

  it('列の数が行によって違っても、そのまま返す(呼び出し側で扱う)', () => {
    expect(parseCsvRows('a,b,c\n1,2')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2'],
    ]);
  });
});
