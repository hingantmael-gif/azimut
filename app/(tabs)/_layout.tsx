/** Accueil · Plan · Enregistrer · Progrès · Vous — FAB + remplace Nouveau */
import { Tabs, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { TabHeaderActions } from '../../src/ui/TabHeaderActions';
import { HeaderBrand } from '../../src/ui/brand/AppBrandBlocks';
import { TabIcon } from '../../src/ui/icons/TabBarIcons';
import { AlwaysBackButton } from '../../src/ui/navigation/AlwaysBackButton';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { useI18n } from '../../src/i18n/I18nContext';

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
  const { colors } = useThemeColors();
  const router = useRouter();
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 22, writingDirection: 'ltr' },
        headerShadowVisible: false,
        headerRight: () => <TabHeaderActions />,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          height: 58,
          paddingTop: 2,
          paddingBottom: 4,
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
                {
                  backgroundColor: focused ? colors.accent : colors.bgElevated,
                  borderWidth: focused ? 0 : 1,
                  borderColor: colors.border,
                },
              ]}
            >
              <TabIcon
                name="record"
                focused={focused}
                color={focused ? '#FFFFFF' : color}
                size={22}
              />
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
      <Tabs.Screen name="analyse" options={{ href: null }} />
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
