import type { AppState } from '../types';
import { renderMessage, renderScreenHeader } from './common';

export type SettingsHandlers = {
  onExport(): void;
  onImport(file: File, mode: 'replace' | 'merge'): void;
  /** labelsToApply: 一括で付けるラベル名。空配列なら「個別に付ける」(取り込み時は付けない)。 */
  onImportCsv(file: File, labelsToApply: string[]): void;
  onAddLabel(name: string): void;
  onDeleteLabel(name: string): void;
  onBack(): void;
};

/** 設定画面。登録件数の表示と、バックアップの書き出し・読み込み、ラベルの管理。 */
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
  container.append(
    count,
    renderExport(handlers),
    renderImport(handlers),
    renderCsvImport(state, handlers),
    renderLabelManagement(state, handlers),
  );
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

  const replaceRadio = radio('replace', 'mode-replace', ' 今のデータを消して入れ替える', 'import-mode');
  replaceRadio.input.checked = true;
  const mergeRadio = radio('merge', 'mode-merge', ' 今のデータに追加する', 'import-mode');

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
 * ラベルが1つ以上定義されていれば、取り込む全件に同じラベルを一括で付けるか、
 * 個別に(あとで一覧・編集画面から)付けるかを選べる。
 */
function renderCsvImport(state: AppState, handlers: SettingsHandlers): HTMLElement {
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

  card.append(heading, note, fileInput);

  const labelCheckboxes: HTMLInputElement[] = [];
  if (state.labels.length > 0) {
    const individualRadio = radio('individual', 'csv-label-mode-individual', ' 個別に付ける(あとで1件ずつ)', 'csv-label-mode');
    individualRadio.input.checked = true;
    const bulkRadio = radio('bulk', 'csv-label-mode-bulk', ' 全部に同じラベルを付ける', 'csv-label-mode');

    const modeFieldset = document.createElement('fieldset');
    modeFieldset.className = 'modes';
    modeFieldset.dataset.testid = 'csv-label-mode';
    const legend = document.createElement('legend');
    legend.textContent = 'ラベルの付け方';
    modeFieldset.append(legend, individualRadio.label, bulkRadio.label);

    const checkboxList = document.createElement('div');
    checkboxList.dataset.testid = 'csv-label-checkboxes';
    for (const label of state.labels) {
      const checkboxLabel = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = label;
      checkbox.dataset.testid = 'csv-label-checkbox';
      labelCheckboxes.push(checkbox);
      checkboxLabel.append(checkbox, document.createTextNode(` ${label}`));
      checkboxList.append(checkboxLabel);
    }

    // 「個別」の間はチェックボックスの列自体をDOMから外す(隠すだけだと、
    // テストや読み上げソフトから「ある」ことになってしまうため)。
    const updateVisibility = (): void => {
      if (bulkRadio.input.checked) {
        if (!checkboxList.isConnected) {
          modeFieldset.after(checkboxList);
        }
      } else {
        checkboxList.remove();
      }
    };
    individualRadio.input.addEventListener('change', updateVisibility);
    bulkRadio.input.addEventListener('change', updateVisibility);

    card.append(modeFieldset);
  }

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
    const bulkSelected = labelCheckboxes.length > 0 && card.querySelector('[data-testid="csv-label-mode-bulk"]:checked') !== null;
    const labelsToApply = bulkSelected
      ? labelCheckboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value)
      : [];
    handlers.onImportCsv(file, labelsToApply);
  });
  card.append(button);

  return card;
}

/** ラベルの追加・削除。一覧画面の絞り込みや、登録・編集フォームのラベル欄はここで作った一覧から選ぶ。 */
function renderLabelManagement(state: AppState, handlers: SettingsHandlers): HTMLElement {
  const card = document.createElement('section');
  card.className = 'card';

  const heading = document.createElement('h2');
  heading.textContent = 'ラベルの管理';
  const note = document.createElement('p');
  note.textContent = 'ラベルを作ると、一覧の絞り込みや、訪問先ごとの分類に使えます。';
  card.append(heading, note);

  if (state.labels.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = 'ラベルはまだありません。';
    card.append(empty);
  } else {
    const list = document.createElement('ul');
    list.className = 'label-manage-list';
    for (const label of state.labels) {
      const item = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = label;
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'danger';
      deleteButton.dataset.testid = 'label-delete-button';
      deleteButton.textContent = '削除';
      deleteButton.setAttribute('aria-label', `${label}を削除`);
      deleteButton.addEventListener('click', () => handlers.onDeleteLabel(label));
      item.append(name, deleteButton);
      list.append(item);
    }
    card.append(list);
  }

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = '例) エリアA';
  nameInput.dataset.testid = 'label-name-input';
  nameInput.setAttribute('aria-label', '新しいラベルの名前');

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'block';
  addButton.dataset.testid = 'label-add-button';
  addButton.textContent = 'ラベルを追加';
  addButton.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (name === '') {
      return;
    }
    handlers.onAddLabel(name);
    nameInput.value = '';
  });

  card.append(nameInput, addButton);
  return card;
}

function radio(
  value: string,
  testid: string,
  text: string,
  name: string,
): { input: HTMLInputElement; label: HTMLLabelElement } {
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = name;
  input.value = value;
  input.dataset.testid = testid;
  const label = document.createElement('label');
  label.append(input, document.createTextNode(text));
  return { input, label };
}
