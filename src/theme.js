// Calm, friendly palettes. Sprout is loud; the UI is not.
// Light = "Greenhouse" (warm cream, deep forest green). Dark = "Midnight Garden" (glowing mint, gold).
// Screens read the active palette with useTheme() / useStyles() from src/useTheme.js.
// Both palettes must have the same keys.
export const lightColors = {
  bg: '#FFF8EC',
  card: '#FFFFFF',
  border: '#ECE2CF',
  text: '#1E2B22',
  muted: '#5A675E',
  primary: '#1F3D2B', // filled buttons
  onPrimary: '#FFFFFF', // text on primary
  primaryDark: '#1F5E3A', // green text accents (money, links, chips)
  primarySoft: '#E3F0DF',
  hero: '#E3F0DF', // the panel behind Sprout on Home
  accent: '#C2502A', // small highlights in Sprout's speech bubble
  leaf: '#4FAE69',
  sun: '#F6C453',
  error: '#B3261E',
  userBubble: '#1F3D2B',
  onUserBubble: '#FFFFFF',
  debatingBg: '#FFF3D9',
  debatingText: '#7A5A00',
  neutralBg: '#EFEAE0',
  neutralText: '#56625A',
  glow: '#1F3D2B', // shadow under primary buttons
  debatingBorder: '#F0DCA4', // "Still debating" card on Home
  resumeBg: '#16201A',
  onResume: '#FFFFFF',
  tabBar: '#1C2A21',
  tabBorder: '#1C2A21',
  tabText: '#B4C0B7',
  tabActive: '#FFFFFF',
};

export const darkColors = {
  bg: '#0E1511',
  card: '#18231D',
  border: '#27362D',
  text: '#EEF5EF',
  muted: '#9EB1A4',
  primary: '#86E0A0',
  onPrimary: '#0E1511',
  primaryDark: '#9BE6B1',
  primarySoft: '#1E3327',
  hero: '#14251B',
  accent: '#F6C453',
  leaf: '#6FD08C',
  sun: '#F6C453',
  error: '#FF8A80',
  userBubble: '#2C4A38',
  onUserBubble: '#EEF5EF',
  debatingBg: '#2A2414',
  debatingText: '#F6D58A',
  neutralBg: '#26302B',
  neutralText: '#BAC6BE',
  glow: '#86E0A0',
  debatingBorder: '#4A3D1C',
  resumeBg: '#F6C46A',
  onResume: '#1E1A10',
  tabBar: '#18231D',
  tabBorder: '#27362D',
  tabText: '#8FA295',
  tabActive: '#86E0A0',
};

// Light palette only, for code that hasn't moved to useTheme() yet. Prefer useTheme().
export const colors = lightColors;

export const radius = { sm: 12, md: 18, lg: 28 };

export const font = { body: 17, small: 14, title: 26, big: 34 };
