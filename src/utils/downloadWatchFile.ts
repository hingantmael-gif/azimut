import { Platform, Share } from 'react-native';
import type { WatchExportFile } from '../engines/watchFileFormats';

/** Télécharge (web) ou partage (natif) un fichier d’export montre. */
export async function deliverWatchExportFile(file: WatchExportFile): Promise<boolean> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    try {
      const blob = new Blob([file.content], { type: file.mime });
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
