// screens/RegisterScreen.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function RegisterScreen() {
    const navigation = useNavigation();
    const auth = getAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleRegister = async () => {
        if (!name.trim() || !email.trim() || !password.trim()) {
            Alert.alert('Error', 'Please fill all fields.');
            return;
        }
        try {
            // 1) Create user in Auth
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            const uid = cred.user.uid;

            // 2) Store user doc with name & email in Firestore
            await setDoc(doc(db, 'users', uid), {
                name: name.trim(),
                email: email.trim(),
                createdAt: new Date().toISOString(),
            });

            // The user is now logged in automatically
            // onAuthStateChanged in App.tsx will navigate to MainTab
        } catch (error: any) {
            console.error('Register error:', error);
            Alert.alert('Register Error', error.message);
        }
    };

    const goToLogin = () => {
        navigation.navigate('Login' as never);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Create an Account</Text>

            <TextInput
                style={styles.input}
                placeholder="Name"
                value={name}
                onChangeText={setName}
            />

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

            <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
                <Text style={styles.registerButtonText}>Sign Up</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginLink} onPress={goToLogin}>
                <Text style={styles.loginLinkText}>Already have an account? Log In</Text>
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
    registerButton: {
        backgroundColor: '#007bff',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: 10,
    },
    registerButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    loginLink: {
        alignSelf: 'center',
        marginTop: 10,
    },
    loginLinkText: {
        color: '#007bff',
        fontWeight: '500',
    },
});
