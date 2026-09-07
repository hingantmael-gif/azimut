import { Tabs, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { TabHeaderActions } from '../../src/ui/TabHeaderActions';
import { HeaderBrand } from '../../src/ui/brand/AppBrandBlocks';
import { TabIcon } from '../../src/ui/icons/TabBarIcons';
import { useThemeColors } from '../../src/theme/ThemeContext';
import { UI_PLAIN } from '../../src/constants/authLabels';
import { NewProgramLabel } from '../../src/ui/brand/NewProgramLabel';

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

/** Accueil · Plan · + Nouveau Programme · Corps · Vous */
export default function TabsLayout() {
  const { colors } = useThemeColors();
  const router = useRouter();

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
            <TabLabel label="Accueil" focused={focused} activeColor={colors.accent} inactiveColor={colors.tabInactive} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Plan',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="plan" focused={focused} color={color} />
          ),
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Plan" focused={focused} activeColor={colors.accent} inactiveColor={colors.tabInactive} />
          ),
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: UI_PLAIN.newProgram,
          headerTitle: () => (
            <NewProgramLabel color={colors.text} size={22} />
          ),
          tabBarLabel: ({ focused }) => (
            <TabLabel
              label="Nouveau"
              focused={focused}
              activeColor={colors.accent}
              inactiveColor={colors.tabInactive}
            />
          ),
          tabBarIcon: () => (
            <View style={[styles.recordBtn, { backgroundColor: colors.accent }]}>
              <TabIcon name="record" focused color="#FFFFFF" size={26} />
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/program/new');
          },
        }}
      />
      <Tabs.Screen
        name="body"
        options={{
          title: 'Corps',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="corps" focused={focused} color={color} />
          ),
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Corps" focused={focused} activeColor={colors.accent} inactiveColor={colors.tabInactive} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Vous',
          headerRight: () => <TabHeaderActions showSettings />,
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="vous" focused={focused} color={color} />
          ),
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Vous" focused={focused} activeColor={colors.accent} inactiveColor={colors.tabInactive} />
          ),
        }}
      />
      <Tabs.Screen name="analyse" options={{ href: null }} />
      <Tabs.Screen name="maps" options={{ href: null }} />
      <Tabs.Screen name="groups" options={{ href: null }} />
      <Tabs.Screen name="social" options={{ href: null }} />
      <Tabs.Screen name="training" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  recordBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
