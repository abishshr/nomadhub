// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './screens/HomeScreen';
import LocationGridScreen from './screens/LocationGridScreen';
import CategoryDetailsScreen from './screens/CategoryDetailsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// A nested stack that holds the grid + details
// In your stack, set headerShown: true (or remove the line that sets it to false)
function LocationStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: true, // <-- show the default header with a back button
            }}
        >
            <Stack.Screen
                name="LocationGrid"
                component={LocationGridScreen}
                options={{ title: 'Around Me' }}
            />
            <Stack.Screen
                name="CategoryDetails"
                component={CategoryDetailsScreen}
                options={{ title: 'Category Details' }}
            />
        </Stack.Navigator>
    );
}


export default function App() {
    return (
        <NavigationContainer>
            <Tab.Navigator
                screenOptions={{
                    tabBarActiveTintColor: '#007bff',
                    tabBarInactiveTintColor: '#555',
                    headerShown: false, // Hide default headers for tab screens
                }}
            >
                <Tab.Screen
                    name="Home"
                    component={HomeScreen}
                    options={{ title: 'Home' }}
                />
                {/* Our nested stack for the location screens */}
                <Tab.Screen
                    name="Locations"
                    component={LocationStack}
                    options={{ title: 'Locations' }}
                />
            </Tab.Navigator>
        </NavigationContainer>
    );
}
