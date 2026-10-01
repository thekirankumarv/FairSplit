import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface SaveResult {
  /** Where the file ended up, in words the user can act on. */
  location: string;
  /** True when the share sheet was offered after writing. */
  shared: boolean;
}

/**
 * Browsers download a blob through a temporary anchor. An Android WebView
 * ignores that completely, which is why exports used to report success while
 * nothing reached the device. On a device we write the file to the shared
 * Documents folder and then offer the share sheet, so the export is both on
 * disk and easy to send somewhere else.
 */
export async function saveTextFile(
  fileName: string,
  contents: string,
  mimeType: string
): Promise<SaveResult> {
  if (!Capacitor.isNativePlatform()) {
    const blob = new Blob([contents], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { location: 'your downloads folder', shared: false };
  }

  // Throws on failure, which the caller surfaces instead of claiming success.
  const written = await Filesystem.writeFile({
    path: fileName,
    data: contents,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true,
  });

  let shared = false;
  try {
    const canShare = await Share.canShare();
    if (canShare.value) {
      await Share.share({
        title: fileName,
        text: `FairSplit export: ${fileName}`,
        url: written.uri,
        dialogTitle: 'Save or send this export',
      });
      shared = true;
    }
  } catch {
    // The user dismissing the share sheet is not an export failure. The file
    // is already on disk, so report the save and move on.
  }

  return { location: `Documents/${fileName}`, shared };
}

/** Turns an unknown thrown value into something worth showing in a toast. */
export function describeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return 'Check that storage is available and try again.';
}
