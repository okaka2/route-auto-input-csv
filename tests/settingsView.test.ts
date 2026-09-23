import { describe, expect, it, vi } from 'vitest';
import { createPatient } from '../src/patient';
import { createInitialState } from '../src/state';
import { renderSettings, type SettingsHandlers } from '../src/views/settingsView';

const handlers = (): SettingsHandlers => ({
  onExport: vi.fn(),
  onImport: vi.fn(),
  onImportCsv: vi.fn(),
  onAddLabel: vi.fn(),
  onDeleteLabel: vi.fn(),
  onBack: vi.fn(),
});

const q = <T extends HTMLElement = HTMLElement>(element: HTMLElement, testid: string): T =>
  element.querySelector<T>(`[data-testid="${testid}"]`)!;

function attachFile(element: HTMLElement, file: File, testid = 'import-input'): void {
  Object.defineProperty(q(element, testid), 'files', { value: [file], configurable: true });
}

describe('renderSettings: 全体', () => {
  it('見出しは「設定」で、戻るボタンがある', () => {
    const spies = handlers();
    const element = renderSettings(createInitialState([]), spies);
    expect(element.querySelector('h1')?.textContent).toBe('設定');
    q<HTMLButtonElement>(element, 'back-button').click();
    expect(spies.onBack).toHaveBeenCalledTimes(1);
  });

  it('登録件数を「登録されている訪問先: N件」で表示する', () => {
    const state = createInitialState([createPatient('山田', '東京都'), createPatient('鈴木', '大阪府')]);
    const element = renderSettings(state, handlers());
    expect(element.textContent).toContain('登録されている訪問先: 2件');
  });

  it('メッセージがあれば表示する', () => {
    const state = { ...createInitialState([]), message: { kind: 'info' as const, text: '2件を取り込みました。' } };
    const element = renderSettings(state, handlers());
    expect(element.querySelector('.message')?.textContent).toBe('2件を取り込みました。');
  });

  it('メッセージ領域は VoiceOver に読み上げられるよう role=status を持つ', () => {
    const state = { ...createInitialState([]), message: { kind: 'info' as const, text: '2件を取り込みました。' } };
    const element = renderSettings(state, handlers());
    expect(element.querySelector('.message')?.getAttribute('role')).toBe('status');
  });
});

describe('renderSettings: 書き出し', () => {
  it('エクスポートボタンで onExport が呼ばれる', () => {
    const spies = handlers();
    const element = renderSettings(createInitialState([]), spies);
    q<HTMLButtonElement>(element, 'export-button').click();
    expect(spies.onExport).toHaveBeenCalled();
  });

  it('説明に「訪問先」の言葉を使う', () => {
    const element = renderSettings(createInitialState([]), handlers());
    expect(element.textContent).toContain('訪問先のデータをJSONファイルとして保存します。');
  });
});

describe('renderSettings: 読み込み', () => {
  it('ファイル未選択でインポートを押しても、何も起きない', () => {
    const spies = handlers();
    const element = renderSettings(createInitialState([]), spies);
    q<HTMLButtonElement>(element, 'import-button').click();
    expect(spies.onImport).not.toHaveBeenCalled();
  });

  it('既定では、今のデータを消して入れ替える(replace)モードでインポートする', () => {
    const spies = handlers();
    const element = renderSettings(createInitialState([]), spies);
    const file = new File(['{}'], 'backup.json', { type: 'application/json' });
    attachFile(element, file);
    q<HTMLButtonElement>(element, 'import-button').click();
    expect(spies.onImport).toHaveBeenCalledWith(file, 'replace');
  });

  it('追加(merge)モードを選ぶと、merge で呼ばれる', () => {
    const spies = handlers();
    const element = renderSettings(createInitialState([]), spies);
    const file = new File(['{}'], 'backup.json', { type: 'application/json' });
    attachFile(element, file);
    q<HTMLInputElement>(element, 'mode-merge').checked = true;
    q<HTMLButtonElement>(element, 'import-button').click();
    expect(spies.onImport).toHaveBeenCalledWith(file, 'merge');
  });

  it('読み込み方法の選択肢は、グループの名前(legend)を持つ', () => {
    const element = renderSettings(createInitialState([]), handlers());
    const group = element.querySelector('fieldset.modes')!;
    expect(group.querySelector('legend')?.textContent).toBe('読み込み方法');
    expect(group.querySelectorAll('input[type="radio"]')).toHaveLength(2);
  });

  it('ファイル選択欄に名前(aria-label)を付ける', () => {
    const element = renderSettings(createInitialState([]), handlers());
    expect(q(element, 'import-input').getAttribute('aria-label')).toBe('バックアップファイルを選ぶ');
  });
});

describe('renderSettings: CSVからの取り込み', () => {
  it('見出しと説明を表示する', () => {
    const element = renderSettings(createInitialState([]), handlers());
    expect(element.textContent).toContain('CSVからの取り込み');
    expect(element.textContent).toContain('名前・住所（建物名を含む）だけを読み取ります。');
  });

  it('ファイル選択欄はCSVを受け付け、名前(aria-label)を持つ', () => {
    const element = renderSettings(createInitialState([]), handlers());
    const input = q<HTMLInputElement>(element, 'import-csv-input');
    expect(input.accept).toContain('.csv');
    expect(input.getAttribute('aria-label')).toBe('CSVファイルを選ぶ');
  });

  it('ファイル未選択で取り込みボタンを押しても、何も起きない', () => {
    const spies = handlers();
    const element = renderSettings(createInitialState([]), spies);
    q<HTMLButtonElement>(element, 'import-csv-button').click();
    expect(spies.onImportCsv).not.toHaveBeenCalled();
  });

  it('ファイルを選んで取り込みボタンを押すと、そのファイルで onImportCsv が呼ばれる(ラベル未定義なら空配列)', () => {
    const spies = handlers();
    const element = renderSettings(createInitialState([]), spies);
    const file = new File(['a'], 'list.csv', { type: 'text/csv' });
    attachFile(element, file, 'import-csv-input');
    q<HTMLButtonElement>(element, 'import-csv-button').click();
    expect(spies.onImportCsv).toHaveBeenCalledWith(file, []);
  });

  it('ラベルが1つも無ければ、ラベルの付け方の欄は出さない', () => {
    const element = renderSettings(createInitialState([]), handlers());
    expect(element.querySelector('[data-testid="csv-label-mode"]')).toBeNull();
  });

  it('ラベルがあれば、既定は「個別」で、ラベルの選択欄は出さない', () => {
    const state = { ...createInitialState([]), labels: ['エリアA', 'エリアB'] };
    const element = renderSettings(state, handlers());
    expect(q<HTMLInputElement>(element, 'csv-label-mode-individual').checked).toBe(true);
    expect(element.querySelector('[data-testid="csv-label-checkboxes"]')).toBeNull();
  });

  it('「全部に同じラベルを付ける」を選ぶと、ラベルのチェックボックスが出る', () => {
    const state = { ...createInitialState([]), labels: ['エリアA', 'エリアB'] };
    const element = renderSettings(state, handlers());
    q<HTMLInputElement>(element, 'csv-label-mode-bulk').checked = true;
    q<HTMLInputElement>(element, 'csv-label-mode-bulk').dispatchEvent(new Event('change'));
    const checkboxes = element.querySelectorAll('[data-testid="csv-label-checkbox"]');
    expect(checkboxes).toHaveLength(2);
  });

  it('「全部に同じラベルを付ける」で選んだラベルを付けて取り込む', () => {
    const spies = handlers();
    const state = { ...createInitialState([]), labels: ['エリアA', 'エリアB'] };
    const element = renderSettings(state, spies);
    q<HTMLInputElement>(element, 'csv-label-mode-bulk').checked = true;
    q<HTMLInputElement>(element, 'csv-label-mode-bulk').dispatchEvent(new Event('change'));
    const checkboxes = element.querySelectorAll<HTMLInputElement>('[data-testid="csv-label-checkbox"]');
    checkboxes[0]!.checked = true;
    const file = new File(['a'], 'list.csv', { type: 'text/csv' });
    attachFile(element, file, 'import-csv-input');
    q<HTMLButtonElement>(element, 'import-csv-button').click();
    expect(spies.onImportCsv).toHaveBeenCalledWith(file, ['エリアA']);
  });

  it('「個別」に戻すと、チェックしていても取り込みには反映しない', () => {
    const spies = handlers();
    const state = { ...createInitialState([]), labels: ['エリアA'] };
    const element = renderSettings(state, spies);
    q<HTMLInputElement>(element, 'csv-label-mode-bulk').checked = true;
    q<HTMLInputElement>(element, 'csv-label-mode-bulk').dispatchEvent(new Event('change'));
    element.querySelector<HTMLInputElement>('[data-testid="csv-label-checkbox"]')!.checked = true;
    q<HTMLInputElement>(element, 'csv-label-mode-individual').checked = true;
    q<HTMLInputElement>(element, 'csv-label-mode-individual').dispatchEvent(new Event('change'));
    const file = new File(['a'], 'list.csv', { type: 'text/csv' });
    attachFile(element, file, 'import-csv-input');
    q<HTMLButtonElement>(element, 'import-csv-button').click();
    expect(spies.onImportCsv).toHaveBeenCalledWith(file, []);
  });
});

describe('renderSettings: ラベルの管理', () => {
  it('見出しを表示する', () => {
    const element = renderSettings(createInitialState([]), handlers());
    expect(element.textContent).toContain('ラベルの管理');
  });

  it('今あるラベルを一覧表示する', () => {
    const state = { ...createInitialState([]), labels: ['エリアA', 'エリアB'] };
    const element = renderSettings(state, handlers());
    expect(element.textContent).toContain('エリアA');
    expect(element.textContent).toContain('エリアB');
  });

  it('ラベルが1つも無ければ、その旨を案内する', () => {
    const element = renderSettings(createInitialState([]), handlers());
    expect(element.textContent).toContain('ラベルはまだありません');
  });

  it('名前を入力して追加ボタンを押すと onAddLabel が呼ばれる', () => {
    const spies = handlers();
    const element = renderSettings(createInitialState([]), spies);
    const input = q<HTMLInputElement>(element, 'label-name-input');
    input.value = 'エリアA';
    q<HTMLButtonElement>(element, 'label-add-button').click();
    expect(spies.onAddLabel).toHaveBeenCalledWith('エリアA');
  });

  it('空欄のまま追加ボタンを押しても、何も起きない', () => {
    const spies = handlers();
    const element = renderSettings(createInitialState([]), spies);
    q<HTMLButtonElement>(element, 'label-add-button').click();
    expect(spies.onAddLabel).not.toHaveBeenCalled();
  });

  it('各ラベルに削除ボタンがあり、押すとそのラベル名で onDeleteLabel が呼ばれる', () => {
    const spies = handlers();
    const state = { ...createInitialState([]), labels: ['エリアA', 'エリアB'] };
    const element = renderSettings(state, spies);
    const deleteButtons = element.querySelectorAll<HTMLButtonElement>('[data-testid="label-delete-button"]');
    expect(deleteButtons).toHaveLength(2);
    deleteButtons[1]!.click();
    expect(spies.onDeleteLabel).toHaveBeenCalledWith('エリアB');
  });
});
