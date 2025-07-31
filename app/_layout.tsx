// app/_layout.tsx - Updated with Stripe Provider
import React from 'react';
import { Stack } from "expo-router";
import { StripeProvider } from '@stripe/stripe-react-native';

const RootLayout = () => {
  // Replace with your actual Stripe publishable key
  const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here';

  return (
    <StripeProvider 
      publishableKey={stripePublishableKey}
      merchantIdentifier="merchant.com.yourapp.thirteen" // For Apple Pay
    >
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
    </StripeProvider>
  );
};

export default RootLayout;