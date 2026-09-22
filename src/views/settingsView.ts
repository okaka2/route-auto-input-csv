import type { AppState } from '../types';
import { renderMessage, renderScreenHeader } from './common';

export type SettingsHandlers = {
  onExport(): void;
  onImport(file: File, mode: 'replace' | 'merge'): void;
  onImportCsv(file: File): void;
  onBack(): void;
};

/** 設定画面。登録件数の表示と、バックアップの書き出し・読み込み。 */
export function renderSettings(state: AppState, handlers: SettingsHandlers): HTMLElement {
  const container = document.createElement('div');
  container.className = 'screen';
  container.append(renderScreenHeader('設定', { onBack: handlers.onBack }));

  if (state.message) {
    container.append(renderMessage(state.message));
  }

  const count = document.createElement('p');
  count.className = 'hint';
  count.textContent = `登録されている訪問先: ${state.patients.length}件`;
  container.append(count, renderExport(handlers), renderImport(handlers), renderCsvImport(handlers));
  return container;
}

function renderExport(handlers: SettingsHandlers): HTMLElement {
  const card = document.createElement('section');
  card.className = 'card';

  const heading = document.createElement('h2');
  heading.textContent = 'バックアップの書き出し';
  const note = document.createElement('p');
  note.textContent = '訪問先のデータをJSONファイルとして保存します。';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'primary block';
  button.dataset.testid = 'export-button';
  button.textContent = 'エクスポート';
  button.addEventListener('click', () => handlers.onExport());

  card.append(heading, note, button);
  return card;
}

function renderImport(handlers: SettingsHandlers): HTMLElement {
  const card = document.createElement('section');
  card.className = 'card';

  const heading = document.createElement('h2');
  heading.textContent = 'バックアップの読み込み';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json,.json';
  fileInput.dataset.testid = 'import-input';
  fileInput.setAttribute('aria-label', 'バックアップファイルを選ぶ');

  const replaceRadio = radio('replace', 'mode-replace', ' 今のデータを消して入れ替える');
  replaceRadio.input.checked = true;
  const mergeRadio = radio('merge', 'mode-merge', ' 今のデータに追加する');

  const modes = document.createElement('fieldset');
  modes.className = 'modes';
  const legend = document.createElement('legend');
  legend.className = 'visually-hidden';
  legend.textContent = '読み込み方法';
  modes.append(legend, replaceRadio.label, mergeRadio.label);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'block';
  button.dataset.testid = 'import-button';
  button.textContent = 'インポート';
  button.addEventListener('click', () => {
    const file = fileInput.files?.[0];
    if (!file) {
      return;
    }
    handlers.onImport(file, mergeRadio.input.checked ? 'merge' : 'replace');
  });

  card.append(heading, fileInput, modes, button);
  return card;
}

/**
 * 外部のCSVファイルから、名前・住所(建物名を含む)だけを読み取って追加する。
 * 既存のJSONバックアップの読み込みとは別の、独立した取り込み口。既存データは消さない
 * (常に追加のみ)。名前・住所が完全一致する行は、取り込み時に自動で除く。
 */
function renderCsvImport(handlers: SettingsHandlers): HTMLElement {
  const card = document.createElement('section');
  card.className = 'card';

  const heading = document.createElement('h2');
  heading.textContent = 'CSVからの取り込み';
  const note = document.createElement('p');
  note.textContent =
    '名前・住所（建物名を含む）だけを読み取ります。既存のデータは消さず、追加します。' +
    '名前・住所の両方が同じ行はスキップします。';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'text/csv,.csv';
  fileInput.dataset.testid = 'import-csv-input';
  fileInput.setAttribute('aria-label', 'CSVファイルを選ぶ');

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'block';
  button.dataset.testid = 'import-csv-button';
  button.textContent = 'CSVから取り込む';
  button.addEventListener('click', () => {
    const file = fileInput.files?.[0];
    if (!file) {
      return;
    }
    handlers.onImportCsv(file);
  });

  card.append(heading, note, fileInput, button);
  return card;
}

function radio(
  value: string,
  testid: string,
  text: string,
): { input: HTMLInputElement; label: HTMLLabelElement } {
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'import-mode';
  input.value = value;
  input.dataset.testid = testid;
  const label = document.createElement('label');
  label.append(input, document.createTextNode(text));
  return { input, label };
}
