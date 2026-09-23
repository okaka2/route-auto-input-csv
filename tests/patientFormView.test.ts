import { describe, expect, it, vi } from 'vitest';
import { createPatient } from '../src/patient';
import { renderPatientForm, type PatientFormHandlers } from '../src/views/patientFormView';

const handlers = (): PatientFormHandlers => ({ onSave: vi.fn(), onCancel: vi.fn() });

const q = <T extends HTMLElement = HTMLElement>(element: HTMLElement, testid: string): T =>
  element.querySelector<T>(`[data-testid="${testid}"]`)!;
const nameInput = (element: HTMLElement) => q<HTMLInputElement>(element, 'name-input');
const addressInput = (element: HTMLElement) => q<HTMLInputElement>(element, 'address-input');

describe('renderPatientForm: 見出しと入力欄', () => {
  it('新規登録では、見出しが「訪問先を登録」で、入力欄が空になる', () => {
    const element = renderPatientForm(null, null, null, [], handlers());
    expect(element.querySelector('h1')?.textContent).toBe('訪問先を登録');
    expect(nameInput(element).value).toBe('');
    expect(addressInput(element).value).toBe('');
  });

  it('編集では、見出しが「訪問先を編集」で、既存の値が入る', () => {
    const patient = createPatient('山田 太郎', '東京都千代田区1-1');
    const element = renderPatientForm(patient, null, null, [], handlers());
    expect(element.querySelector('h1')?.textContent).toBe('訪問先を編集');
    expect(nameInput(element).value).toBe('山田 太郎');
    expect(addressInput(element).value).toBe('東京都千代田区1-1');
  });

  it('入力欄は、名前と住所の2つだけ(ラベル未定義のとき)', () => {
    const element = renderPatientForm(null, null, null, [], handlers());
    const inputs = [...element.querySelectorAll('input')];
    expect(inputs).toHaveLength(2);
    expect(inputs.map((input) => input.dataset.testid)).toEqual(['name-input', 'address-input']);
  });

  it('名前と住所は、必須と分かる表示を持つ', () => {
    const element = renderPatientForm(null, null, null, [], handlers());
    expect(element.querySelectorAll('.required')).toHaveLength(2);
    expect(nameInput(element).getAttribute('aria-required')).toBe('true');
    expect(addressInput(element).getAttribute('aria-required')).toBe('true');
  });

  it('入力欄のラベルは「名前」「住所」', () => {
    const element = renderPatientForm(null, null, null, [], handlers());
    const labels = [...element.querySelectorAll('.field-label')].map((label) => label.textContent);
    expect(labels[0]).toContain('名前');
    expect(labels[1]).toContain('住所');
  });

  it('プレースホルダーに入力例を出す', () => {
    const element = renderPatientForm(null, null, null, [], handlers());
    expect(nameInput(element).placeholder).toContain('山田');
    expect(addressInput(element).placeholder).toContain('東京都');
  });
});

describe('renderPatientForm: 保存とキャンセル', () => {
  it('見出しの行の左に「キャンセル」、右に「保存」がある', () => {
    const element = renderPatientForm(null, null, null, [], handlers());
    const header = element.querySelector('.form-header')!;
    expect(header.firstElementChild).toBe(q(element, 'cancel-button'));
    expect(header.lastElementChild).toBe(q(element, 'save-button'));
    expect(q(element, 'cancel-button').textContent).toBe('キャンセル');
    expect(q(element, 'save-button').textContent).toBe('保存');
  });

  it('保存ボタンで、入力値とラベル(空配列)が onSave に渡る', () => {
    const spies = handlers();
    const element = renderPatientForm(null, null, null, [], spies);
    nameInput(element).value = '鈴木 花子';
    addressInput(element).value = '大阪市北区2-2';
    q<HTMLButtonElement>(element, 'save-button').click();
    expect(spies.onSave).toHaveBeenCalledWith('鈴木 花子', '大阪市北区2-2', []);
  });

  it('キャンセルボタンで onCancel が呼ばれる', () => {
    const spies = handlers();
    const element = renderPatientForm(null, null, null, [], spies);
    q<HTMLButtonElement>(element, 'cancel-button').click();
    expect(spies.onCancel).toHaveBeenCalled();
  });
});

describe('renderPatientForm: 住所の地図での確認', () => {
  it('住所が空のとき、地図確認リンクは無効になる(href が無い)', () => {
    const element = renderPatientForm(null, null, null, [], handlers());
    expect(q<HTMLAnchorElement>(element, 'map-check-link').hasAttribute('href')).toBe(false);
  });

  it('住所を入力すると、地図確認リンクが検索URLになる', () => {
    const element = renderPatientForm(null, null, null, [], handlers());
    const address = addressInput(element);
    address.value = '東京都千代田区1-1';
    address.dispatchEvent(new Event('input'));
    const url = new URL(q<HTMLAnchorElement>(element, 'map-check-link').href);
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/search/');
    expect(url.searchParams.get('query')).toBe('東京都千代田区1-1');
  });

  it('リンクの文言は、地図サービスの名前から作る', () => {
    const element = renderPatientForm(null, null, null, [], handlers());
    expect(q(element, 'map-check-link').textContent).toBe('この住所をGoogleマップで確認');
  });

  it('地図確認リンクにタップ領域確保用のクラスがつく', () => {
    const element = renderPatientForm(null, null, null, [], handlers());
    expect(q(element, 'map-check-link').classList.contains('map-check')).toBe(true);
  });
});

describe('renderPatientForm: メッセージと下書き', () => {
  it('メッセージがあれば表示する', () => {
    const element = renderPatientForm(null, null, { kind: 'error', text: '名前を入力してください。' }, [], handlers());
    expect(element.querySelector('.message')?.textContent).toBe('名前を入力してください。');
  });

  it('メッセージ領域は VoiceOver に読み上げられるよう role=status を持つ', () => {
    const element = renderPatientForm(null, null, { kind: 'error', text: '名前を入力してください。' }, [], handlers());
    expect(element.querySelector('.message')?.getAttribute('role')).toBe('status');
  });

  it('draft があれば、新規登録でも patient より優先して表示する(入力内容を残す)', () => {
    const draft = { name: '入力途中の名前', address: '入力途中の住所' };
    const element = renderPatientForm(null, draft, null, [], handlers());
    expect(nameInput(element).value).toBe('入力途中の名前');
    expect(addressInput(element).value).toBe('入力途中の住所');
  });

  it('draft があれば、編集中の既存値より優先して表示する', () => {
    const patient = createPatient('山田 太郎', '東京都千代田区1-1');
    const draft = { name: '編集途中の名前', address: '' };
    const element = renderPatientForm(patient, draft, null, [], handlers());
    expect(nameInput(element).value).toBe('編集途中の名前');
    expect(addressInput(element).value).toBe('');
    // 見出しは draft ではなく patient の有無で決まる
    expect(element.querySelector('h1')?.textContent).toBe('訪問先を編集');
  });
});

describe('renderPatientForm: ラベル', () => {
  it('ラベルが1つも定義されていなければ、ラベル欄は出さない', () => {
    const element = renderPatientForm(null, null, null, [], handlers());
    expect(element.querySelector('[data-testid="label-checkbox"]')).toBeNull();
  });

  it('定義済みのラベルをチェックボックスで出す', () => {
    const element = renderPatientForm(null, null, null, ['エリアA', 'エリアB'], handlers());
    const checkboxes = element.querySelectorAll<HTMLInputElement>('[data-testid="label-checkbox"]');
    expect(checkboxes).toHaveLength(2);
    expect([...checkboxes].map((c) => c.value)).toEqual(['エリアA', 'エリアB']);
  });

  it('編集時は、その訪問先に付いているラベルだけチェックが付く', () => {
    const patient = createPatient('山田', '東京都', new Date(), ['エリアB']);
    const element = renderPatientForm(patient, null, null, ['エリアA', 'エリアB'], handlers());
    const checkboxes = element.querySelectorAll<HTMLInputElement>('[data-testid="label-checkbox"]');
    expect(checkboxes[0]!.checked).toBe(false);
    expect(checkboxes[1]!.checked).toBe(true);
  });

  it('draftにラベルがあれば、それを優先する', () => {
    const patient = createPatient('山田', '東京都', new Date(), ['エリアA']);
    const draft = { name: '山田', address: '東京都', labels: ['エリアB'] };
    const element = renderPatientForm(patient, draft, null, ['エリアA', 'エリアB'], handlers());
    const checkboxes = element.querySelectorAll<HTMLInputElement>('[data-testid="label-checkbox"]');
    expect(checkboxes[0]!.checked).toBe(false);
    expect(checkboxes[1]!.checked).toBe(true);
  });

  it('チェックしたラベルが、保存時にonSaveへ渡る', () => {
    const spies = handlers();
    const element = renderPatientForm(null, null, null, ['エリアA', 'エリアB'], spies);
    nameInput(element).value = '山田';
    addressInput(element).value = '東京都';
    const checkboxes = element.querySelectorAll<HTMLInputElement>('[data-testid="label-checkbox"]');
    checkboxes[1]!.checked = true;
    q<HTMLButtonElement>(element, 'save-button').click();
    expect(spies.onSave).toHaveBeenCalledWith('山田', '東京都', ['エリアB']);
  });
});
