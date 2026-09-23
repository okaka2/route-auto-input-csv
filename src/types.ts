export type Patient = {
  id: string;
  name: string;
  address: string;
  /** 付いているラベルの名前。複数付けられる。空配列 = ラベルなし。 */
  labels: string[];
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
};

export type Screen =
  | { name: 'list' }
  | { name: 'form'; patientId: string | null }
  | { name: 'order' }
  | { name: 'map' }
  | { name: 'settings' };

export type Message = { kind: 'error' | 'info'; text: string };

/** 一覧の並び順。登録順(既定)・名前(あいうえお順)・住所(あいうえお順)。 */
export type SortOrder = 'registered' | 'name' | 'address';

/** 開いているダイアログ。1件向けは対象の訪問先のidを、複数選択の一括削除は件数を持たない(state.selectedIdsを見る)。 */
export type Dialog =
  | { kind: 'rowMenu'; id: string }
  | { kind: 'confirmDelete'; id: string }
  | { kind: 'confirmDeleteSelected' };

export type AppState = {
  screen: Screen;
  patients: Patient[];
  /** 訪問順に並んだ、選択中の患者id */
  selectedIds: string[];
  searchQuery: string;
  sortOrder: SortOrder;
  /** 今ある(定義済みの)ラベルの名前。追加した順。 */
  labels: string[];
  /** 一覧の絞り込みで選んでいるラベル名。NO_LABEL_FILTERは「ラベルなし」を選んでいる印。空 = 絞り込みなし(全件)。 */
  labelFilter: string[];
  message: Message | null;
  /** 開いているダイアログ。なければ null。 */
  dialog: Dialog | null;
};

/** labelFilterの中で「ラベルなし」を表す特別な値。実際のラベル名とは絶対に重ならない。 */
export const NO_LABEL_FILTER = '\u0000no-label\u0000';
