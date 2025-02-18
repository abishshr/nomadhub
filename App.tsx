// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

// Import your existing screens
import HomeScreen from './screens/HomeScreen';
import LocationGridScreen from './screens/LocationGridScreen';
import CategoryDetailsScreen from './screens/CategoryDetailsScreen';

// Import the new chat screens
import GroupsListScreen from './screens/GroupsListScreen';
import CreateGroupScreen from './screens/CreateGroupScreen';
import GroupChatScreen from './screens/GroupChatScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

/**
 * 1) A nested stack for “Locations”
 *    (LocationGridScreen + CategoryDetailsScreen)
 */
function LocationStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: true }}>
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

/**
 * 2) A nested stack for “Chat”
 *    (GroupsListScreen + CreateGroupScreen + GroupChatScreen)
 */
function ChatStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: true }}>
            <Stack.Screen
                name="GroupsList"
                component={GroupsListScreen}
                options={{ title: 'Chat Groups' }}
            />
            <Stack.Screen
                name="CreateGroup"
                component={CreateGroupScreen}
                options={{ title: 'Create a Group' }}
            />
            <Stack.Screen
                name="GroupChat"
                component={GroupChatScreen}
                options={{ title: 'Group Chat' }}
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
                    headerShown: false,
                }}
            >
                <Tab.Screen
                    name="Home"
                    component={HomeScreen}
                    options={{ title: 'Home' }}
                />
                <Tab.Screen
                    name="Locations"
                    component={LocationStack}
                    options={{ title: 'Locations' }}
                />
                <Tab.Screen
                    name="ChatTab"
                    component={ChatStack}
                    options={{ title: 'Chat' }}
                />
            </Tab.Navigator>
        </NavigationContainer>
    );
}
