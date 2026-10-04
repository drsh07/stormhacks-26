import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export interface PickedImage {
  base64: string;
  mimeType: 'image/jpeg';
}

export type PickResult =
  | { status: 'ok'; image: PickedImage }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

/** Longest side, in pixels, of what we upload. Plenty for the AI to read. */
const MAX_SIDE = 1600;

/**
 * Lets the user pick (or take) a photo, then shrinks it to a small JPEG.
 * Phone photos and laptop screenshots are often 5 MB or more, which the
 * server rejects and slow Wi-Fi chokes on. After this they are a few hundred KB.
 */
export async function pickImage(source: 'library' | 'camera'): Promise<PickResult> {
  let picked: ImagePicker.ImagePickerResult;
  try {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return { status: 'error', message: 'Camera access is off. Allow it in Settings, or choose a photo instead.' };
      }
      picked = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    } else {
      picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    }
  } catch {
    return {
      status: 'error',
      message: source === 'camera' ? "Couldn't open the camera. Choose a photo instead." : "Couldn't open your photos. Check the photo permission in Settings.",
    };
  }
  if (picked.canceled) return { status: 'cancelled' };
  const asset = picked.assets[0];
  if (!asset?.uri) return { status: 'error', message: "Couldn't read that image. Try another one." };

  try {
    const context = ImageManipulator.manipulate(asset.uri);
    // Only shrink: never blow a small image up.
    if (asset.width > MAX_SIDE || asset.height > MAX_SIDE) {
      context.resize(asset.width >= asset.height ? { width: MAX_SIDE } : { height: MAX_SIDE });
    }
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({ base64: true, compress: 0.7, format: SaveFormat.JPEG });
    if (!saved.base64) throw new Error('no base64');
    return { status: 'ok', image: { base64: saved.base64, mimeType: 'image/jpeg' } };
  } catch {
    return { status: 'error', message: "Couldn't prepare that image. Try another one." };
  }
}
