type ClipboardWriter = {
  writeText(text: string): Promise<void>;
};

export async function copyTextToClipboard(
  text: string,
  clipboard: ClipboardWriter | null | undefined =
    typeof navigator === 'undefined' ? undefined : navigator.clipboard,
): Promise<boolean> {
  if (!clipboard || typeof clipboard.writeText !== 'function') return false;

  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
