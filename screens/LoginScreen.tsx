// screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import * as Location from 'expo-location';
import { db } from '../firebaseConfig';
import { fetchCityName } from '../api';

export default function LoginScreen() {
    const navigation = useNavigation();
    const auth = getAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password.');
            return;
        }
        try {
            // 1) Sign in
            const cred = await signInWithEmailAndPassword(auth, email, password);
            const uid = cred.user.uid;

            // 2) Check if user doc has city or lat/lng. If missing, fetch & store it.
            await ensureUserLocation(uid);

            // onAuthStateChanged in App.tsx will handle navigation to Main UI
        } catch (error: any) {
            console.error('Login error:', error);
            Alert.alert('Login Error', error.message);
        }
    };

    /**
     * If user doc is missing "city" or lat/lng, fetch location + city, store in doc
     */
    const ensureUserLocation = async (uid: string) => {
        try {
            const userRef = doc(db, 'users', uid);
            const snapshot = await getDoc(userRef);
            if (snapshot.exists()) {
                const data = snapshot.data();
                const city = data.city;
                const lat = data.lat;
                const lng = data.lng;

                // If any are missing, let's fetch location
                if (!city || lat == null || lng == null) {
                    console.log('User doc missing location fields. Attempting location fetch...');
                    await fetchAndStoreLocation(uid);
                } else {
                    console.log('User doc already has city, lat, lng:', city, lat, lng);
                }
            } else {
                console.log('User doc does not exist. Creating doc with location...');
                // If doc doesn't exist at all, also fetch location
                await fetchAndStoreLocation(uid);
            }
        } catch (err) {
            console.error('Error checking user doc for location:', err);
        }
    };

    /**
     * Actually do the location fetch + geocode
     */
    const fetchAndStoreLocation = async (uid: string) => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('Location permission denied. Skipping location update.');
                return;
            }
            const loc = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = loc.coords;

            // Attempt to geocode city
            const cityName = await fetchCityName(latitude, longitude);
            if (!cityName) {
                console.log('Could not determine city. Storing lat/lng only.');
            }

            // Store lat, lng, city (if found)
            const userRef = doc(db, 'users', uid);
            await updateDoc(userRef, {
                lat: latitude,
                lng: longitude,
                city: cityName || null,
            });
            console.log(`Stored lat/lng/city in user doc: ${latitude}, ${longitude}, city=${cityName}`);
        } catch (err) {
            console.error('Error fetching/storing location:', err);
        }
    };

    const goToRegister = () => {
        navigation.navigate('Register' as never);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome Back</Text>

            <TextInput
                style={styles.input}
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
            />

            <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                <Text style={styles.loginButtonText}>Log In</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.registerLink} onPress={goToRegister}>
                <Text style={styles.registerLinkText}>New user? Register</Text>
            </TouchableOpacity>
        </View>
    );
}

// minimal styling
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 28,
        fontWeight: '600',
        marginBottom: 20,
        alignSelf: 'center',
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
    },
    loginButton: {
        backgroundColor: '#007bff',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: 10,
    },
    loginButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    registerLink: {
        alignSelf: 'center',
        marginTop: 10,
    },
    registerLinkText: {
        color: '#007bff',
        fontWeight: '500',
    },
});
