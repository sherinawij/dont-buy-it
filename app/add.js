import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Linking, Platform,
  Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analyzeItem } from '../src/api';
import { createItem, getRecentHistory } from '../src/db';
import { setDraft } from '../src/memory';
import { parseAmount } from '../src/calc';
import { CANNED_LINES, CATEGORIES } from '../src/config';
import { colors, font, radius } from '../src/theme';
import { Button, Card } from '../src/components/ui';
import Sprout from '../src/components/Sprout';

// History is useful context, but an unavailable database must not delay the manual fallback.
async function recentHistory() {
  let timer;
  try {
    return await Promise.race([
      getRecentHistory(10),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('History unavailable')), 4000); }),
    ]);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function validAnalysis(data) {
  return data && typeof data.name === 'string' && data.name.trim()
    && typeof data.essential === 'boolean'
    && typeof data.openingLine === 'string' && data.openingLine.trim();
}

export default function Add() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [link, setLink] = useState('');
  const [photo, setPhoto] = useState(null);
  const [manual, setManual] = useState(false);
  const [essential, setEssential] = useState(false);
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const alive = useRef(true);
  const locked = useRef(false);
  const analysisCache = useRef(null);
  const busy = phase !== 'idle';

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  async function pickPhoto(source) {
    if (locked.current) return;
    locked.current = true;
    setPhase('photo');
    setPhotoError('');
    setShowSettings(false);
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!alive.current) return;
        if (!permission.granted) {
          setPhotoError('No camera access? No problem. Choose a photo or just type the item’s name. You can allow camera access in your phone settings.');
          setShowSettings(!permission.canAskAgain);
          return;
        }
      }
      // The system photo picker needs no broad library permission, including limited-access libraries.
      const options = { mediaTypes: /** @type {ImagePicker.MediaType[]} */ (['images']), allowsEditing: false, quality: 1 };
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !alive.current) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error('No photo selected');
      const width = asset.width || 800;
      const height = asset.height || 800;
      // Cap the long portrait edge too, so very tall photos stay small enough for the API.
      const ratio = Math.min(1, 800 / width, 1600 / height);
      const context = ImageManipulator.manipulate(asset.uri);
      context.resize({ width: Math.max(1, Math.round(width * ratio)), height: null });
      const rendered = await context.renderAsync();
      const resized = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
      if (!resized.base64 || resized.base64.length > 2000000) throw new Error('Photo too large');
      if (alive.current) setPhoto({ uri: resized.uri, base64: resized.base64 });
    } catch {
      if (alive.current) {
        setPhotoError('That photo couldn’t be opened. Try another photo, allow access in your phone settings, or just type the item’s name.');
        setShowSettings(Platform.OS !== 'web');
      }
    } finally {
      locked.current = false;
      if (alive.current) setPhase('idle');
    }
  }

  async function submit() {
    if (locked.current) return;
    setError('');
    const itemName = name.trim();
    const itemLink = link.trim();
    const userPrice = parseAmount(price);
    if (!itemName && (manual || !photo)) {
      setError(manual ? 'Add the item’s name to continue.' : 'Choose a photo or add the item’s name so Sprout knows what you’re considering.');
      return;
    }
    if (Number.isNaN(userPrice) || (manual && userPrice === null)) {
      setError('Enter a valid price, such as 29.99. Zero is okay too.');
      return;
    }
    if (itemLink) {
      try {
        const url = new URL(itemLink);
        if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid link');
      } catch {
        setError('Use a full product link starting with https://, or leave it blank.');
        return;
      }
    }

    locked.current = true;
    setPhase(manual ? 'saving' : 'analyze');
    let saveNotice;
    try {
      let data;
      if (manual) {
        data = {
          name: itemName, category: 'other', estimatedPrice: null, essential,
          openingLine: CANNED_LINES[essential ? 'opening_essential' : 'opening_want'][0],
          suggestedReplies: essential ? [] : ['Hear me out…', 'Ugh, fine, you’re right.'],
        };
      } else {
        // Reuse a successful analysis if saving fails and the user retries unchanged details.
        const cacheKey = JSON.stringify([photo?.uri, itemName, userPrice, itemLink]);
        if (analysisCache.current?.key === cacheKey) {
          data = analysisCache.current.data;
        } else {
          const history = await recentHistory();
          if (!alive.current) return;
          const result = await analyzeItem({ imageBase64: photo?.base64, name: itemName || undefined, price: userPrice ?? undefined, link: itemLink || undefined, history });
          if (!alive.current) return;
          if (!result.ok || !validAnalysis(result.data)) {
            setManual(true);
            setError('Sprout couldn’t analyze this one. Add a name and price below; you can still talk it through.');
            return;
          }
          data = result.data;
          analysisCache.current = { key: cacheKey, data };
        }
      }
      if (!alive.current) return;
      setPhase('saving');
      // addDoc waits for server acknowledgement. Keep one write pending instead of retrying and duplicating it.
      saveNotice = setTimeout(() => {
        if (alive.current) setError('Waiting for a connection to save your item. Keep this screen open and reconnect; Sprout will continue automatically.');
      }, 8000);
      const id = await createItem({
        name: itemName || data.name.trim().slice(0, 100),
        category: Object.hasOwn(CATEGORIES, data.category) ? data.category : 'other',
        price: userPrice ?? null,
        estimatedPrice: typeof data.estimatedPrice === 'number' && Number.isFinite(data.estimatedPrice) && data.estimatedPrice >= 0 ? data.estimatedPrice : null,
        link: itemLink || null, essential: data.essential,
        messages: [{ role: 'sprout', text: data.openingLine.trim().slice(0, 500) }],
        criteriaMet: [], status: 'debating', outcome: null,
      });
      // Only the URI enters the transient draft. Neither the URI nor image bytes go to Firestore.
      setDraft(id, {
        photoUri: photo?.uri ?? null,
        suggestedReplies: Array.isArray(data.suggestedReplies) ? data.suggestedReplies.filter((text) => typeof text === 'string' && text.trim()).slice(0, 3).map((text) => text.slice(0, 160)) : [],
      });
      if (alive.current) router.replace(`/debate/${id}`);
    } catch {
      if (alive.current) setError('Your item couldn’t be saved. Check your connection and try again. Your details are still here.');
    } finally {
      clearTimeout(saveNotice);
      locked.current = false;
      if (alive.current) setPhase('idle');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 56 : 0}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
        <View style={styles.hero}>
          <Sprout stage={1} mood={phase === 'analyze' ? 'panicking' : manual && essential ? 'happy' : 'smug'} size={140} shakeKey={phase === 'analyze'} />
          <View style={styles.speech}><Text style={styles.speechText}>{phase === 'analyze' ? 'WAIT. What is THAT?!' : manual && essential ? 'A genuine need? No fight from me. Let’s take care of you.' : 'Show me what’s in your cart. I have opinions.'}</Text></View>
        </View>
        <Text style={styles.title}>Thinking of buying something?</Text>
        <Text style={styles.subtitle}>A little pause before you press buy.</Text>
        <Card style={styles.photoCard}>
          {photo ? <Image source={{ uri: photo.uri }} style={styles.photo} resizeMode="contain" accessibilityLabel="Selected item photo" />
            : <View style={styles.photoPlaceholder}><Text style={styles.photoEmoji}>🛍️</Text><Text style={styles.label}>Let Sprout take a look</Text><Text style={styles.hint}>Add a photo, or just type a name below.</Text></View>}
          <View style={styles.photoButtons}>
            <Button title="Take photo" variant="secondary" onPress={() => pickPhoto('camera')} disabled={busy} style={styles.photoButton} />
            <Button title="Choose photo" variant="secondary" onPress={() => pickPhoto('gallery')} disabled={busy} style={styles.photoButton} />
          </View>
          {photo && <Pressable accessibilityRole="button" onPress={() => setPhoto(null)} disabled={busy} style={styles.textButton}><Text style={styles.linkText}>Remove photo</Text></Pressable>}
          <Text style={styles.hint}>Only item details are saved to your catalog. Photos are sent for analysis and kept out of your saved item.</Text>
          {!!photoError && <Text accessibilityRole="alert" style={styles.error}>{photoError}</Text>}
          {showSettings && <Pressable accessibilityRole="button" style={styles.textButton} onPress={() => Linking.openSettings().catch(() => setPhotoError('Open your phone settings and allow camera or photo access for Expo Go.'))}><Text style={styles.linkText}>Open phone settings</Text></Pressable>}
        </Card>
        {manual && <Card style={styles.manualCard}><Text style={styles.label}>Let’s do this together</Text><Text style={styles.subtitle}>No analysis needed. Tell Sprout what it is and what it costs.</Text></Card>}
        <View style={styles.field}>
          <Text style={styles.label}>Item name {manual ? '(required)' : '(optional with a photo)'}</Text>
          <TextInput accessibilityLabel="Item name" value={name} onChangeText={setName} placeholder="The hoodie I keep thinking about…" placeholderTextColor={colors.muted} editable={!busy} maxLength={100} style={styles.input} returnKeyType="next" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Price {manual ? '(required)' : '(optional)'}</Text>
          <TextInput accessibilityLabel="Price" value={price} onChangeText={setPrice} placeholder="29.99" placeholderTextColor={colors.muted} editable={!busy} maxLength={20} keyboardType="decimal-pad" style={styles.input} />
          <Text style={styles.hint}>{manual ? 'Enter the price you’re considering, even if it’s an estimate.' : 'Your price is always used first. Otherwise Sprout can estimate.'}</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Product link (optional)</Text>
          <TextInput accessibilityLabel="Product link" value={link} onChangeText={setLink} placeholder="https://…" placeholderTextColor={colors.muted} editable={!busy} maxLength={2048} keyboardType="url" autoCapitalize="none" autoCorrect={false} style={styles.input} />
        </View>
        {manual && <Card style={styles.needCard}>
          <View style={styles.needRow}><Text style={styles.needLabel}>This is a genuine need (food, medicine, hygiene…)</Text><Switch accessibilityLabel="This is a genuine need" value={essential} onValueChange={setEssential} disabled={busy} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFFFFF" /></View>
          <Text style={styles.hint}>Sprout never argues with genuine essentials.</Text>
        </Card>}
        {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
        {busy && <View accessibilityLiveRegion="polite" style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>{phase === 'photo' ? 'Getting your photo ready…' : phase === 'saving' ? 'Saving your item…' : 'Sprout is panicking…'}</Text></View>}
        <Button title={busy ? 'One moment…' : manual ? 'Talk to Sprout' : 'Ask Sprout'} onPress={submit} disabled={busy} style={styles.submitButton} />
        {manual && !busy && <Pressable accessibilityRole="button" style={styles.textButton} onPress={() => { setManual(false); setError(''); }}><Text style={styles.linkText}>Try analysis again</Text></Pressable>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 18, maxWidth: 600, width: '100%', alignSelf: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  speech: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: 16, borderWidth: 1, borderColor: colors.border },
  speechText: { fontSize: font.body, fontWeight: '600', color: colors.primaryDark, lineHeight: 25 },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.body, color: colors.muted, lineHeight: 25 },
  photoCard: { gap: 14 },
  photo: { width: '100%', height: 210, borderRadius: radius.sm, backgroundColor: colors.bg },
  photoPlaceholder: { alignItems: 'center', gap: 8, paddingVertical: 14 },
  photoEmoji: { fontSize: 40 },
  photoButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoButton: { flex: 1, minWidth: 125, paddingHorizontal: 10 },
  textButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingVertical: 10 },
  linkText: { color: colors.primaryDark, fontSize: font.small, fontWeight: '700', textDecorationLine: 'underline' },
  field: { gap: 8 },
  label: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, minHeight: 54, padding: 14, fontSize: font.body, color: colors.text },
  hint: { color: colors.muted, fontSize: font.small, lineHeight: 21 },
  manualCard: { gap: 8, backgroundColor: colors.primarySoft },
  needCard: { gap: 8 },
  needRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  needLabel: { flex: 1, color: colors.text, fontSize: font.body, fontWeight: '600', lineHeight: 25 },
  error: { color: colors.error, fontSize: font.small, lineHeight: 22 },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: colors.primaryDark, fontSize: font.body, flexShrink: 1 },
  submitButton: { minHeight: 56 },
});
