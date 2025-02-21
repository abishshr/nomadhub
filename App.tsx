// App.tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

// Firebase config (ensure it's initialized)
import './firebaseConfig';

// Screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import LocationGridScreen from './screens/LocationGridScreen';
import CategoryDetailsScreen from './screens/CategoryDetailsScreen';
import GroupsListScreen from './screens/GroupsListScreen';
import CreateGroupScreen from './screens/CreateGroupScreen';
import GroupChatScreen from './screens/GroupChatScreen';
import ProfileScreen from './screens/ProfileScreen';

// Vector icons from @expo/vector-icons (included in Expo)
import { Ionicons } from '@expo/vector-icons';

const Auth = getAuth();

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const NestedStack = createStackNavigator();

/**
 * 1) AuthStack: (Login + Register)
 */
function AuthStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
    );
}

/**
 * 2) Nested stack for “Locations”
 */
function LocationStack() {
    return (
        <NestedStack.Navigator screenOptions={{ headerShown: false }}>
            <NestedStack.Screen name="LocationGrid" component={LocationGridScreen} />
            <NestedStack.Screen name="CategoryDetails" component={CategoryDetailsScreen} />
        </NestedStack.Navigator>
    );
}

/**
 * 3) Nested stack for “Chat”
 */
function ChatStack() {
    return (
        <NestedStack.Navigator screenOptions={{ headerShown: false }}>
            <NestedStack.Screen name="GroupsList" component={GroupsListScreen} />
            <NestedStack.Screen name="CreateGroup" component={CreateGroupScreen} />
            <NestedStack.Screen name="GroupChat" component={GroupChatScreen} />
        </NestedStack.Navigator>
    );
}

/**
 * 4) MainTab: shown if user is logged in
 *    Using Ionicons for tabBar icons
 */
function MainTab() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: false, // hide text labels
                tabBarActiveTintColor: '#007bff',
                tabBarInactiveTintColor: '#555',
                // Provide a function to map route.name to an icon
                tabBarIcon: ({ color, size }) => {
                    let iconName: string = 'home';

                    if (route.name === 'Home') {
                        iconName = 'home-outline';
                    } else if (route.name === 'Locations') {
                        iconName = 'location-outline';
                    } else if (route.name === 'ChatTab') {
                        iconName = 'chatbubble-ellipses-outline';
                    } else if (route.name === 'Profile') {
                        iconName = 'person-outline';
                    }

                    // Return Ionicons
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Locations" component={LocationStack} />
            <Tab.Screen name="ChatTab" component={ChatStack} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
}

export default function App() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(Auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#007bff" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            {user ? <MainTab /> : <AuthStack />}
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
