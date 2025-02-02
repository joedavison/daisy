import React from "react"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { createStackNavigator } from "@react-navigation/stack"

import { ProfileScreen } from "screens/Profile"
import { SettingsScreen } from "screens/Settings"
import { ThreadScreen } from "screens/Thread"
import { LoadingScreen } from "screens/Loading"
import { AuthScreen } from "screens/Auth"

import { BottomTabNavigator } from "navigation/TabNavigator"

// const Stack = createNativeStackNavigator()
const Stack = createStackNavigator()

function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Loading" component={LoadingScreen} />
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="Home" component={BottomTabNavigator} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Thread" component={ThreadScreen} />
    </Stack.Navigator>
  )
}

export { HomeStackNavigator }
