// Item photos, kept ON THIS PHONE ONLY. Never uploaded: not to Firestore, not to any storage bucket.
// We save a small thumbnail (~240px, a few KB) as a base64 data URI in AsyncStorage, keyed by item id,
// so the catalog can show the real photo even after the app restarts.
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const THUMB_WIDTH = 240;
const keyFor = (itemId) => `dontbuyit:photo:${itemId}`;

// In-memory cache so screens don't re-read storage on every render.
const cache = new Map();

// Call right after the item is created. Safe to not await; failures just mean no photo (emoji fallback).
export async function savePhoto(itemId, photoUri) {
  if (!itemId || !photoUri) return;
  cache.set(itemId, photoUri); // show the full photo immediately during this session
  try {
    const context = ImageManipulator.manipulate(photoUri);
    context.resize({ width: THUMB_WIDTH, height: null });
    const rendered = await context.renderAsync();
    const thumb = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.5, base64: true });
    if (thumb.base64) await AsyncStorage.setItem(keyFor(itemId), `data:image/jpeg;base64,${thumb.base64}`);
  } catch {
    // Not critical: the catalog falls back to the category emoji.
  }
}

export async function loadPhoto(itemId) {
  if (cache.has(itemId)) return cache.get(itemId);
  try {
    const uri = await AsyncStorage.getItem(keyFor(itemId));
    if (uri) cache.set(itemId, uri);
    return uri;
  } catch {
    return null;
  }
}

// React hook: the photo's URI for an item, or null (show the emoji instead).
export function usePhoto(itemId) {
  const [uri, setUri] = useState(() => cache.get(itemId) ?? null);
  useEffect(() => {
    let alive = true;
    loadPhoto(itemId).then((u) => alive && setUri(u ?? null));
    return () => {
      alive = false;
    };
  }, [itemId]);
  return uri;
}
