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
    ScrollView,
} from 'react-native';
import { getAuth, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

type UserProfile = {
    name?: string;
    photoURL?: string;
    additionalPhotos?: string[];
    bio?: string;
    city?: string;
    age?: number;
    orientation?: string;
    interests?: string[];
    lifestyle?: Record<string, unknown>;
    personality?: string[];
    lookingFor?: string;
    lat?: number;
    lng?: number;
};

export default function ProfileScreen() {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<UserProfile>({});
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (!currentUser) {
            setError('No user found. Please log in.');
            setLoading(false);
            return;
        }
        fetchUserProfile(currentUser.uid);
    }, [currentUser]);

    async function fetchUserProfile(uid: string) {
        try {
            const userRef = doc(db, 'users', uid);
            const snapshot = await getDoc(userRef);
            if (snapshot.exists()) {
                setUserData(snapshot.data() as UserProfile);
            } else {
                setError('User profile not found.');
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            setError('Error loading profile.');
        }
        setLoading(false);
    }

    const pickImageForField = async (
        path: string,
        field: keyof UserProfile,
        index?: number
    ) => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert('Permission Denied', 'We need camera roll permissions!');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled && result.assets?.[0]?.uri) {
            const { uri } = result.assets[0];
            await uploadImageAndSave(uri, path, field, index);
        }
    };

    const uploadImageAndSave = async (
        originalUri: string,
        path: string,
        field: keyof UserProfile,
        index?: number
    ) => {
        if (!currentUser) return;
        setUploading(true);

        try {
            let localUri = originalUri;
            if (originalUri.startsWith('ph://') || originalUri.startsWith('assets-library://')) {
                const tempUri = FileSystem.cacheDirectory + 'temp-photo.jpg';
                await FileSystem.copyAsync({ from: originalUri, to: tempUri });
                localUri = tempUri;
            }

            // Use fetch -> blob (this approach works for some but can cause issues on iOS bridgeless).
            // If you still see "Creating blobs from 'ArrayBuffer' not supported," you can fallback to
            // a base64 decode approach with 'uploadBytes' from a Uint8Array.
            const response = await fetch(localUri);
            const blob = await response.blob();

            const fileName = index !== undefined
                ? `${currentUser.uid}-${index}.jpg`
                : `${currentUser.uid}.jpg`;

            const storageRef = ref(storage, `${path}/${fileName}`);
            await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });

            const downloadURL = await getDownloadURL(storageRef);
            const userRef = doc(db, 'users', currentUser.uid);

            if (field === 'photoURL') {
                await updateDoc(userRef, { [field]: downloadURL });
                setUserData(prev => ({ ...prev, [field]: downloadURL }));
            } else if (field === 'additionalPhotos') {
                const updatedPhotos = [...(userData.additionalPhotos || [])];
                if (index !== undefined) {
                    updatedPhotos[index] = downloadURL;
                    await updateDoc(userRef, { [field]: updatedPhotos });
                    setUserData(prev => ({ ...prev, [field]: updatedPhotos }));
                }
            } else {
                await updateDoc(userRef, { [field]: downloadURL });
                setUserData(prev => ({ ...prev, [field]: downloadURL }));
            }

            Alert.alert('Success', 'Photo updated!');
        } catch (err) {
            console.error('Error uploading image:', err);
            Alert.alert('Error', 'Could not upload photo. Try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (err) {
            console.error('Logout error:', err);
            Alert.alert('Error', 'Could not log out. Try again.');
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loaderContainer}>
                    {/* Discord-like blurple color */}
                    <ActivityIndicator size="large" color="#5865F2" />
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

    const {
        name,
        photoURL,
        additionalPhotos,
        bio,
        city,
        age,
        orientation,
        interests,
        lifestyle,
        personality,
        lookingFor,
        lat,
        lng,
    } = userData;

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.container}>
                    {/* Main Photo */}
                    {photoURL ? (
                        <Image source={{ uri: photoURL }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.noAvatar]}>
                            <Text style={styles.noAvatarText}>No Photo</Text>
                        </View>
                    )}

                    {/* Button to change main photo */}
                    <TouchableOpacity
                        style={styles.photoButton}
                        onPress={() => pickImageForField('profilePhotos', 'photoURL')}
                        disabled={uploading}
                    >
                        {uploading ? (
                            // Show a smaller spinner if uploading
                            <View style={styles.uploadingRow}>
                                <ActivityIndicator size="small" color="#5865F2" />
                                <Text style={styles.photoButtonText}> Uploading...</Text>
                            </View>
                        ) : (
                            <Text style={styles.photoButtonText}>Change Main Photo</Text>
                        )}
                    </TouchableOpacity>

                    {/* Additional Photos */}
                    <View style={styles.photoGrid}>
                        {(additionalPhotos || []).map((photoUri, idx) => (
                            <View key={idx} style={styles.photoSlot}>
                                {photoUri ? (
                                    <Image source={{ uri: photoUri }} style={styles.additionalPhoto} />
                                ) : (
                                    <View style={[styles.additionalPhoto, styles.noPhoto]}>
                                        <Text style={styles.noAvatarText}>No Photo</Text>
                                    </View>
                                )}
                                <TouchableOpacity
                                    style={styles.photoButton}
                                    onPress={() =>
                                        pickImageForField('additionalPhotos', 'additionalPhotos', idx)
                                    }
                                    disabled={uploading}
                                >
                                    {uploading ? (
                                        <View style={styles.uploadingRow}>
                                            <ActivityIndicator size="small" color="#5865F2" />
                                            <Text style={styles.photoButtonText}> ...</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.photoButtonText}>Change #{idx + 1}</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>

                    {/* Name */}
                    <Text style={styles.nameText}>{name || 'No Name'}</Text>

                    {/* Bio */}
                    {bio ? (
                        <Text style={styles.bioText}>{bio}</Text>
                    ) : (
                        <Text style={styles.bioPlaceholder}>No bio yet...</Text>
                    )}

                    {/* Additional Info */}
                    <View style={styles.infoSection}>
                        {age !== undefined && <Text style={styles.infoText}>Age: {age}</Text>}
                        {city && <Text style={styles.infoText}>City: {city}</Text>}
                        {orientation && <Text style={styles.infoText}>Orientation: {orientation}</Text>}
                        {lookingFor && <Text style={styles.infoText}>Looking For: {lookingFor}</Text>}
                        {Array.isArray(interests) && interests.length > 0 && (
                            <Text style={styles.infoText}>
                                Interests: {interests.join(', ')}
                            </Text>
                        )}
                        {Array.isArray(personality) && personality.length > 0 && (
                            <Text style={styles.infoText}>
                                Personality: {personality.join(', ')}
                            </Text>
                        )}
                        {lifestyle && (
                            <Text style={styles.infoText}>
                                Lifestyle: {JSON.stringify(lifestyle)}
                            </Text>
                        )}
                        {lat !== undefined && lng !== undefined && (
                            <Text style={styles.infoText}>
                                Coordinates: {lat.toFixed(4)}, {lng.toFixed(4)}
                            </Text>
                        )}
                    </View>

                    {/* Logout */}
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Text style={styles.logoutButtonText}>Log Out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContainer: {
        paddingBottom: 20,
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
        color: 'red',
        fontSize: 16,
        textAlign: 'center',
        marginHorizontal: 20,
    },
    container: {
        alignItems: 'center',
        padding: 20,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginTop: 20,
        marginBottom: 8,
        backgroundColor: '#eee',
        resizeMode: 'cover',
    },
    noAvatar: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    noAvatarText: {
        color: '#aaa',
    },
    photoButton: {
        backgroundColor: '#5865F2', // Discord blurple color
        borderRadius: 10,
        paddingVertical: 6,
        paddingHorizontal: 14,
        marginVertical: 6,
    },
    uploadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    photoButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    photoGrid: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginVertical: 10,
    },
    photoSlot: {
        alignItems: 'center',
        margin: 5,
    },
    additionalPhoto: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#eee',
    },
    noPhoto: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    nameText: {
        fontSize: 22,
        fontWeight: '600',
        marginTop: 10,
        color: '#333',
    },
    bioText: {
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
        marginHorizontal: 30,
        marginBottom: 20,
        marginTop: 8,
    },
    bioPlaceholder: {
        fontSize: 16,
        color: '#aaa',
        fontStyle: 'italic',
        textAlign: 'center',
        marginHorizontal: 30,
        marginBottom: 20,
    },
    infoSection: {
        width: '100%',
        marginVertical: 10,
        paddingHorizontal: 10,
    },
    infoText: {
        fontSize: 16,
        color: '#333',
        marginBottom: 4,
    },
    logoutButton: {
        marginTop: 30,
        backgroundColor: '#5865F2', // Discord color
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
