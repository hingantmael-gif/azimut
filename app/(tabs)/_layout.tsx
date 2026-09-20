/** Accueil · Plan · Enregistrer · Progrès · Vous — FAB + remplace Nouveau */
import { Tabs, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../src/ui/Text';
import { TabHeaderActions } from '../../src/ui/TabHeaderActions';
import { HeaderBrand } from '../../src/ui/brand/AppBrandBlocks';
import { TabIcon } from '../../src/ui/icons/TabBarIcons';
import { AlwaysBackButton } from '../../src/ui/navigation/AlwaysBackButton';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { fonts, rgba } from '../../src/theme/tokens';
import { useI18n } from '../../src/i18n/I18nContext';
import { AtmosphereLayer, useHeaderColor } from '../../src/ui/atmosphere/ScreenAtmosphere';

function TabLabel({
  label,
  focused,
  activeColor,
  inactiveColor,
}: {
  label: string;
  focused: boolean;
  activeColor: string;
  inactiveColor: string;
}) {
  const plain = label.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');
  return (
    <Text
      style={[
        styles.label,
        { color: inactiveColor, writingDirection: 'ltr' },
        focused && { color: activeColor, fontWeight: '700' },
      ]}
      numberOfLines={1}
      accessibilityLabel={plain}
    >
      {plain}
    </Text>
  );
}

export default function TabsLayout() {
  const { colors, isDark } = useThemeColors();
  const headerColor = useHeaderColor();
  const router = useRouter();
  const { t } = useI18n();

  return (
    <Tabs
      screenLayout={({ children }) => <AtmosphereLayer>{children}</AtmosphereLayer>}
      screenOptions={{
        headerStyle: { backgroundColor: headerColor },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.extrabold, fontSize: 22, letterSpacing: -0.3, writingDirection: 'ltr' },
        headerShadowVisible: false,
        headerRight: () => <TabHeaderActions />,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopWidth: 0,
          height: 66,
          paddingTop: 6,
          paddingBottom: 6,
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          // Ombre vers le haut : la barre « flotte » au-dessus du contenu.
          boxShadow: `0px -6px 24px ${rgba(colors.shadow, isDark ? 0.5 : 0.09)}`,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.tabInactive,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          headerTitle: '',
          headerLeft: () => <HeaderBrand />,
          headerLeftContainerStyle: { paddingLeft: 16 },
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="accueil" focused={focused} color={color} />
          ),
          tabBarLabel: ({ focused }) => (
            <TabLabel
              label={t('tabs.home')}
              focused={focused}
              activeColor={colors.accent}
              inactiveColor={colors.tabInactive}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t('tabs.plan'),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="plan" focused={focused} color={color} />
          ),
          tabBarLabel: ({ focused }) => (
            <TabLabel
              label={t('tabs.plan')}
              focused={focused}
              activeColor={colors.accent}
              inactiveColor={colors.tabInactive}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="record"
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push({
              pathname: '/session/live',
              params: { mode: 'free', sport: 'run' },
            });
          },
        }}
        options={{
          title: t('tabs.record'),
          tabBarIcon: ({ focused, color }) => (
            <View
              style={[
                styles.recordBtn,
                { boxShadow: `0px 6px 16px ${rgba(colors.accent, isDark ? 0.4 : 0.42)}` },
              ]}
            >
              <LinearGradient
                colors={colors.gradientHero}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.recordGrad}
              >
                <TabIcon name="record" focused={focused} color={colors.onAccent} size={22} />
              </LinearGradient>
            </View>
          ),
          tabBarLabel: ({ focused }) => (
            <TabLabel
              label={t('tabs.record')}
              focused={focused}
              activeColor={colors.accent}
              inactiveColor={colors.tabInactive}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="body"
        options={{
          title: t('tabs.progress'),
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="corps" focused={focused} color={color} />
          ),
          tabBarLabel: ({ focused }) => (
            <TabLabel
              label={t('tabs.progress')}
              focused={focused}
              activeColor={colors.accent}
              inactiveColor={colors.tabInactive}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.you'),
          headerRight: () => <TabHeaderActions showSettings />,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="vous" focused={focused} color={color} />
          ),
          tabBarLabel: ({ focused }) => (
            <TabLabel
              label={t('tabs.you')}
              focused={focused}
              activeColor={colors.accent}
              inactiveColor={colors.tabInactive}
            />
          ),
        }}
      />
      {/* Nouveau retiré de la barre → FAB + sur Accueil / Plan */}
      <Tabs.Screen name="create" options={{ href: null }} />
      <Tabs.Screen
        name="analyse"
        options={{
          href: null,
          title: 'Progrès',
          headerLeft: () => (
            <AlwaysBackButton fallbackHref="/(tabs)/body" tintColor={colors.text} />
          ),
        }}
      />
      <Tabs.Screen
        name="maps"
        options={{
          href: null,
          title: 'Cartes',
          headerLeft: () => (
            <AlwaysBackButton fallbackHref="/(tabs)/profile" tintColor={colors.text} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          href: null,
          title: 'Groupes',
          headerShown: true,
          headerLeft: () => (
            <AlwaysBackButton fallbackHref="/(tabs)/profile" tintColor={colors.text} />
          ),
          headerLeftContainerStyle: { paddingLeft: 4 },
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          href: null,
          title: 'Fil social',
          headerLeft: () => (
            <AlwaysBackButton fallbackHref="/(tabs)/profile" tintColor={colors.text} />
          ),
        }}
      />
      <Tabs.Screen name="training" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  recordBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    marginBottom: 4,
  },
  recordGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
