import { DEFAULT_MAP_PROVIDER } from '../mapProviders';
import type { Message, Patient } from '../types';
import { renderMessage } from './common';

export type PatientFormDraft = { name: string; address: string; labels?: string[] };

export type PatientFormHandlers = {
  onSave(name: string, address: string, labels: string[]): void;
  onCancel(): void;
};

/**
 * 訪問先の登録・編集フォーム。入力項目は名前と住所、それにラベル(定義済みのものがあれば)。
 * 住所は地図へ渡すために欠かせないので、保存できるのは、名前と住所がそろっているときだけ(検証は呼び出し側)。
 * ラベルは省略でき、検証の対象ではない。
 *
 * `draft` は保存に失敗した直後の入力値(または複製元の値)。渡された場合は `patient` の値より
 * 優先して表示し、入力内容を画面に残す。
 */
export function renderPatientForm(
  patient: Patient | null,
  draft: PatientFormDraft | null,
  message: Message | null,
  allLabels: readonly string[],
  handlers: PatientFormHandlers,
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'screen';

  const nameInput = textInput('name-input', draft?.name ?? patient?.name ?? '', '例) 山田 太郎');
  const addressInput = textInput(
    'address-input',
    draft?.address ?? patient?.address ?? '',
    '例) 東京都世田谷区桜丘1-2-3',
  );
  const selectedLabels = new Set(draft?.labels ?? patient?.labels ?? []);
  const labelCheckboxes: HTMLInputElement[] = [];

  // 見出しの行: 左に「キャンセル」、中央に見出し、右に「保存」。
  const header = document.createElement('header');
  header.className = 'form-header';

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'header-link cancel';
  cancel.dataset.testid = 'cancel-button';
  cancel.textContent = 'キャンセル';
  cancel.addEventListener('click', () => handlers.onCancel());

  const title = document.createElement('h1');
  title.className = 'screen-title';
  title.textContent = patient === null ? '訪問先を登録' : '訪問先を編集';

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'header-link save';
  save.dataset.testid = 'save-button';
  save.textContent = '保存';
  save.addEventListener('click', () => {
    const labels = labelCheckboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value);
    handlers.onSave(nameInput.value, addressInput.value, labels);
  });

  header.append(cancel, title, save);
  container.append(header);

  if (message) {
    container.append(renderMessage(message));
  }

  container.append(field('名前', nameInput), field('住所', addressInput), renderMapCheck(addressInput));

  if (allLabels.length > 0) {
    container.append(renderLabelField(allLabels, selectedLabels, labelCheckboxes));
  }

  return container;
}

function textInput(testid: string, value: string, placeholder: string): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.dataset.testid = testid;
  input.setAttribute('aria-required', 'true');
  return input;
}

/** ラベル(名前と「必須」の表示)で入力欄を包む。 */
function field(labelText: string, input: HTMLInputElement): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = 'field';

  const caption = document.createElement('span');
  caption.className = 'field-label';
  caption.append(document.createTextNode(labelText));
  const required = document.createElement('span');
  required.className = 'required';
  required.textContent = '必須';
  caption.append(required);

  label.append(caption, input);
  return label;
}

/** ラベルのチェックボックス一覧。省略可(検証の対象ではない)なので「必須」は付けない。 */
function renderLabelField(
  allLabels: readonly string[],
  selectedLabels: ReadonlySet<string>,
  labelCheckboxes: HTMLInputElement[],
): HTMLElement {
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'field';

  const legend = document.createElement('legend');
  legend.className = 'field-label';
  legend.textContent = 'ラベル';
  fieldset.append(legend);

  for (const label of allLabels) {
    const checkboxLabel = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = label;
    checkbox.checked = selectedLabels.has(label);
    checkbox.dataset.testid = 'label-checkbox';
    labelCheckboxes.push(checkbox);
    checkboxLabel.append(checkbox, document.createTextNode(` ${label}`));
    fieldset.append(checkboxLabel);
  }

  return fieldset;
}

/** 入力した住所を、地図サービスで確認するためのリンク。住所が空のあいだは、押せない。 */
function renderMapCheck(addressInput: HTMLInputElement): HTMLAnchorElement {
  const link = document.createElement('a');
  link.textContent = `この住所を${DEFAULT_MAP_PROVIDER.label}で確認`;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.dataset.testid = 'map-check-link';
  link.className = 'map-check';

  const update = (): void => {
    const address = addressInput.value.trim();
    if (address.length === 0) {
      link.removeAttribute('href');
      link.classList.add('disabled');
      return;
    }
    link.href = DEFAULT_MAP_PROVIDER.buildUrl([address]);
    link.classList.remove('disabled');
  };
  update();
  addressInput.addEventListener('input', update);
  return link;
}
