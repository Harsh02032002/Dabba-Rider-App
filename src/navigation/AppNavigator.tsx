import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme/colors';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ActiveOrderScreen from '../screens/ActiveOrderScreen';
import EarningsScreen from '../screens/EarningsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const tabIcons: Record<string, { active: string; inactive: string }> = {
  Home: { active: '🏠', inactive: '🏡' },
  Earnings: { active: '💰', inactive: '💵' },
  Profile: { active: '👤', inactive: '👤' },
};

const HomeTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused }) => {
        const icons = tabIcons[route.name] || { active: '•', inactive: '•' };
        return <Text style={{ fontSize: 22 }}>{focused ? icons.active : icons.inactive}</Text>;
      },
      tabBarActiveTintColor: theme.primary,
      tabBarInactiveTintColor: theme.mutedForeground,
      tabBarStyle: {
        backgroundColor: theme.card,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        height: 70,
        paddingBottom: 12,
        paddingTop: 8,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '500',
      },
      headerShown: false,
    })}
  >
    <Tab.Screen name="Home" component={DashboardScreen} />
    <Tab.Screen name="Earnings" component={EarningsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={HomeTabs} />
            <Stack.Screen name="ActiveOrder" component={ActiveOrderScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
});

export default AppNavigator;
