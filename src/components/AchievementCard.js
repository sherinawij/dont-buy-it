// The shareable "win" card. Fixed 4:5 size so the screenshot looks the same on every phone.
// forwardRef exposes the root View so react-native-view-shot can capture it as a PNG.
import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Sprout from './Sprout';
import { categoryInfo } from '../config';
import { formatMoney } from '../calc';
import { radius } from '../theme';
import { useStyles } from '../useTheme';

export const CARD_WIDTH = 320;
export const CARD_HEIGHT = 400; // 4:5, like a 1080×1350 social post

const AchievementCard = forwardRef(function AchievementCard({ achievement: a }, ref) {
  const styles = useStyles(makeStyles);
  const date = new Date(a.earnedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const showItem = a.itemName && a.type !== 'milestone';

  return (
    // collapsable={false}: Android must keep this View real so it can be captured.
    <View ref={ref} collapsable={false} style={styles.card}>
      <Text style={styles.brand}>Don’t Buy It! 🌱</Text>
      <Text style={styles.title}>{a.title}</Text>

      {/* still: no animation, so the capture is crisp */}
      <View style={styles.sprout}>
        <Sprout stage={a.plantStage} mood={a.mood} size={130} still />
      </View>

      {showItem && (
        <Text style={styles.item} numberOfLines={1}>
          {categoryInfo(a.category).emoji} {a.itemName}
        </Text>
      )}
      {a.amountAvoided != null && (
        <Text style={styles.amount}>{formatMoney(a.amountAvoided)} of spending avoided</Text>
      )}
      {a.detail && <Text style={styles.detail}>{a.detail}</Text>}

      <View style={styles.quote}>
        <Text style={styles.quoteText} numberOfLines={3}>“{a.line}”</Text>
        <Text style={styles.quoteBy}>— Sprout</Text>
      </View>

      <Text style={styles.footer}>{date}</Text>
    </View>
  );
});

export default AchievementCard;

const makeStyles = (colors) => StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 3,
    borderColor: colors.leaf,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    overflow: 'hidden',
  },
  brand: { fontSize: 14, fontWeight: '800', color: colors.primaryDark, letterSpacing: 0.5 },
  title: { fontSize: 28, fontWeight: '900', color: colors.text, marginTop: 4, textAlign: 'center' },
  sprout: { marginVertical: 6 },
  item: { fontSize: 18, fontWeight: '700', color: colors.text, maxWidth: '100%' },
  amount: { fontSize: 20, fontWeight: '800', color: colors.primary, marginTop: 4 },
  detail: { fontSize: 15, color: colors.primaryDark, marginTop: 4, textAlign: 'center' },
  quote: {
    marginTop: 'auto',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: '100%',
  },
  quoteText: { fontSize: 15, fontStyle: 'italic', color: colors.text, textAlign: 'center' },
  quoteBy: { fontSize: 13, color: colors.muted, textAlign: 'right', marginTop: 2 },
  footer: { fontSize: 12, color: colors.muted, marginTop: 8 },
});
