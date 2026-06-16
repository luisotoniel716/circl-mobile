// Image picker + Supabase Storage upload helpers.
//
// SDK 54 specifics:
//   - expo-image-picker: launchImageLibraryAsync returns { canceled, assets }
//   - expo-file-system: use the new `File` class to read bytes from a file:// URI
//     (we pass the bytes directly to supabase-js, which accepts Uint8Array)

import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { Alert } from 'react-native';
import { supabase } from './supabase';

export interface PickedImage {
  uri:      string;
  width:    number;
  height:   number;
  fileSize?: number;
  mimeType: string;
}

/**
 * Ask permission and open the native photo library.
 * Returns null on cancel or denial.
 *
 * `aspect`: when provided AND the platform honors it, the image is cropped to
 * that ratio during the iOS edit step. We default to 1:1 for avatars / covers.
 */
export async function pickImageFromLibrary(opts?: {
  aspect?: [number, number];
  /** JPEG/PNG re-compression quality, 0..1. Default 0.85. */
  quality?: number;
}): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      'Permiso requerido',
      'Necesitamos acceso a tus fotos. Actívalo desde Ajustes › Circl.',
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes:    ['images'],
    allowsEditing: true,
    aspect:        opts?.aspect ?? [1, 1],
    quality:       opts?.quality ?? 0.85,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) return null;

  const a = result.assets[0];
  return {
    uri:      a.uri,
    width:    a.width,
    height:   a.height,
    fileSize: a.fileSize,
    // The picker doesn't always set mimeType — derive from extension or fall back to jpeg
    mimeType: a.mimeType ?? guessMimeFromUri(a.uri),
  };
}

function guessMimeFromUri(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png')  return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

/**
 * Read a file:// URI as bytes and upload to a Supabase Storage bucket.
 * Returns the public URL of the stored object.
 *
 * `path` must include the leading folder that satisfies your RLS policies:
 *   avatars:      `{user_id}/avatar-{ts}.jpg`
 *   group-covers: `{group_id}/cover-{ts}.jpg`
 */
export async function uploadImage(
  bucket:  'avatars' | 'group-covers',
  path:    string,
  picked:  PickedImage,
): Promise<string> {
  // SDK 54 new FileSystem API: instantiate a File from the URI and read bytes.
  const file  = new File(picked.uri);
  const bytes = await file.bytes();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, {
      contentType: picked.mimeType,
      upsert:      true,
      cacheControl: '3600',
    });
  if (error) {
    throw new Error(`No pudimos subir la imagen: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  // Append a cache-buster so the UI refreshes when the same path is overwritten.
  return `${data.publicUrl}?t=${Date.now()}`;
}

/** Convenience: pick + upload in one step. Returns null on cancel. */
export async function pickAndUpload(
  bucket: 'avatars' | 'group-covers',
  pathPrefix: string,
  aspect?: [number, number],
): Promise<string | null> {
  const picked = await pickImageFromLibrary({ aspect });
  if (!picked) return null;
  // Path: {prefix}/photo-{ts}.{ext}
  const ext = picked.mimeType === 'image/png' ? 'png'
            : picked.mimeType === 'image/webp' ? 'webp'
            : 'jpg';
  const path = `${pathPrefix.replace(/\/$/, '')}/photo-${Date.now()}.${ext}`;
  return uploadImage(bucket, path, picked);
}
