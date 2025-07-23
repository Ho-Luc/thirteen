import React from 'react'
import { Stack } from "expo-router";

const RootLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: "#fff",
          paddingHorizontal: 10,
          paddingTop: 10,
        },
      }}>
      <Stack.Screen 
        name="index" 
        options={{
          title: "Home"
        }}
      />
      <Stack.Screen 
        name="my-groups/index" 
        options={{
          title: "Home" 
        }}
      />
      <Stack.Screen 
        name="group_calendar/index" 
        options={{
          headerShown: true,
          title: "Calendar",
          headerStyle: {
            backgroundColor: "#fff",
          },
          headerTintColor: "#4287f5", // Blue color for back button
          headerTitleStyle: {
            fontWeight: "bold",
            fontSize: 18,
          },
          headerShadowVisible: false,
          headerBackTitle: "Groups", // This specifically sets the back button text
        }}
      />
    </Stack>
  );
};

export default RootLayout;