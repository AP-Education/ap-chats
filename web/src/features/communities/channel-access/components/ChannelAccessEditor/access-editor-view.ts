/** The editor shows every principal, or the switches of the one being edited. */
export type AccessEditorView = { screen: 'list' } | { screen: 'principal'; key: string };

export type AccessEditorAction = { type: 'open'; key: string } | { type: 'back' };

export function accessEditorView(
  _view: AccessEditorView,
  action: AccessEditorAction,
): AccessEditorView {
  switch (action.type) {
    case 'open':
      return { screen: 'principal', key: action.key };
    case 'back':
      return { screen: 'list' };
  }
}
