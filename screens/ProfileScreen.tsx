// screens/ProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    Image,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
} from 'react-native';
import { getAuth, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function ProfileScreen() {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<any>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!currentUser) {
            setError('No user found. Please log in.');
            setLoading(false);
            return;
        }
        const uid = currentUser.uid;
        const userRef = doc(db, 'users', uid);

        getDoc(userRef)
            .then((snapshot) => {
                if (snapshot.exists()) {
                    setUserData(snapshot.data());
                } else {
                    setError('User profile not found.');
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error('Error fetching profile:', err);
                setError('Error loading profile.');
                setLoading(false);
            });
    }, [currentUser]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            // onAuthStateChanged in App.tsx will redirect to login
        } catch (err) {
            console.error('Logout error:', err);
            Alert.alert('Error', 'Could not log out. Try again.');
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#007bff" />
                    <Text style={styles.loaderText}>Loading Profile...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loaderContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            </SafeAreaView>
        );
    }

    // userData might have fields like { name, photoURL, bio }
    const { name, photoURL, bio } = userData || {};

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Avatar */}
                {photoURL ? (
                    <Image source={{ uri: photoURL }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.noAvatar]}>
                        <Text style={styles.noAvatarText}>No Photo</Text>
                    </View>
                )}

                {/* Name */}
                <Text style={styles.nameText}>{name || 'No Name'}</Text>

                {/* Bio */}
                {bio ? (
                    <Text style={styles.bioText}>{bio}</Text>
                ) : (
                    <Text style={styles.bioPlaceholder}>No bio yet...</Text>
                )}

                {/* Optional: Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutButtonText}>Log Out</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loaderText: {
        marginTop: 8,
        fontSize: 16,
        color: '#555',
    },
    errorText: {
        fontSize: 16,
        color: 'red',
        textAlign: 'center',
        marginHorizontal: 20,
    },
    container: {
        flex: 1,
        alignItems: 'center',
        padding: 20,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginTop: 20,
        marginBottom: 16,
        backgroundColor: '#eee',
    },
    noAvatar: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    noAvatarText: {
        color: '#aaa',
    },
    nameText: {
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 6,
        color: '#333',
    },
    bioText: {
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
        marginHorizontal: 30,
        marginBottom: 20,
    },
    bioPlaceholder: {
        fontSize: 16,
        color: '#aaa',
        fontStyle: 'italic',
        textAlign: 'center',
        marginHorizontal: 30,
        marginBottom: 20,
    },
    logoutButton: {
        marginTop: 40,
        backgroundColor: '#007bff',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 30,
    },
    logoutButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
});
