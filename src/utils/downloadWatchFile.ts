import { Platform, Share } from 'react-native';
import type { WatchExportFile } from '../engines/watchFileFormats';

/** Télécharge (web) ou partage (natif) un fichier d’export montre. */
export async function deliverWatchExportFile(file: WatchExportFile): Promise<boolean> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    try {
      const blob = new Blob([file.bytes ? (file.bytes as unknown as BlobPart) : file.content], { type: file.mime });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.filename;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      return true;
    } catch {
      /* fallback share below */
    }
  }

  // Fichier binaire (.fit) sur téléphone : on l'écrit puis on ouvre la feuille de partage sur le VRAI fichier.
  if (file.bytes) {
    try {
      const { File, Paths } = await import('expo-file-system');
      const Sharing = await import('expo-sharing');
      const out = new File(Paths.cache, file.filename);
      out.create({ overwrite: true });
      out.write(file.bytes);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(out.uri, { mimeType: file.mime, dialogTitle: file.filename });
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  try {
    const result = await Share.share(
      Platform.OS === 'ios'
        ? { message: file.content, title: file.filename }
        : { message: `${file.filename}\n\n${file.content}`, title: file.filename },
    );
    return result.action === Share.sharedAction;
  } catch {
    return false;
  }
}

export async function deliverWatchExportBundle(
  primary: WatchExportFile,
  extras: WatchExportFile[] = [],
): Promise<{ delivered: number; primary: WatchExportFile }> {
  let delivered = 0;
  if (await deliverWatchExportFile(primary)) delivered += 1;
  // Sur web : télécharge aussi le secours (TCX / JSON). Sur natif : un seul share suffit.
  if (Platform.OS === 'web') {
    for (const extra of extras.slice(0, 1)) {
      if (await deliverWatchExportFile(extra)) delivered += 1;
    }
  }
  return { delivered, primary };
}
