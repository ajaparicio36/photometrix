import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function saveReport(bytes: ArrayBuffer, sessionId: string): Promise<string> {
  const file = new File(Paths.cache, `photometrix-${sessionId.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`);
  await file.write(new Uint8Array(bytes));
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Save Photometrix report',
      UTI: 'com.adobe.pdf',
    });
    return 'Report opened in the share sheet. Choose a destination to keep a copy.';
  }
  if (await File.canPreview(file)) {
    await file.preview({ title: 'Photometrix report' });
    return 'Report opened. Save a copy from the preview.';
  }
  // Keep the session-named cache file: a destination may still read its URI after sharing returns.
  // The next export overwrites it; the operating system can clear this cache.
  throw new Error('This device cannot open a share sheet. Try exporting on another device.');
}
