const activeFlashes = new WeakMap<HTMLElement, () => void>();

export function flashMessage(messageId: string) {
  const row = document.getElementById(`message-${messageId}`);
  if (!row) return;

  activeFlashes.get(row)?.();
  row.removeAttribute('data-flash');
  void row.offsetWidth;
  row.setAttribute('data-flash', '');

  const onEnd = (event: AnimationEvent) => {
    if (event.target !== row) return;
    row.removeAttribute('data-flash');
    row.removeEventListener('animationend', onEnd);
    activeFlashes.delete(row);
  };
  row.addEventListener('animationend', onEnd);
  activeFlashes.set(row, () => row.removeEventListener('animationend', onEnd));
}
