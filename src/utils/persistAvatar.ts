import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * Convertit une URI temporaire (picker / cache / blob) en data URI JPEG durable.
 * Sinon la photo disparaît (écran blanc) après navigation ou rechargement.
 */
export async function persistAvatarUri(uri: string): Promise<string> {
  if (uri.startsWith('data:image/')) {
    return uri;
  }
  const result = await manipulateAsync(uri, [], {
    compress: 0.82,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (result.base64) {
    return `data:image/jpeg;base64,${result.base64}`;
  }
  return result.uri;
}
