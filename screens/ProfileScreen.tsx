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
    ScrollView,
    Dimensions,
} from 'react-native';
import { getAuth, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import LoadingScreen from './LoadingScreen';

const { width } = Dimensions.get('window');

// PhotoLoader component: displays a mini loading screen while the image loads.
// PhotoLoader Component
const PhotoLoader = ({
                         uri,
                         containerStyle,
                         imageStyle,
                     }: {
    uri?: string;
    containerStyle?: any;
    imageStyle?: any;
}) => {
    const [loading, setLoading] = useState(true);
    return (
        <View style={[containerStyle, { justifyContent: 'center', alignItems: 'center' }]}>
            {loading && (
                <View
                    style={[
                        StyleSheet.absoluteFill,
                        { justifyContent: 'center', alignItems: 'center', transform: [{ scale: 0.5 }] },
                    ]}
                >
                    <LoadingScreen mini />
                </View>
            )}
            <Image
                source={{ uri }}
                style={[imageStyle, { opacity: loading ? 0 : 1 }]}
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
            />
        </View>
    );
};


export type UserProfile = {
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
    relationshipGoals?: string;
    occupation?: string;
    education?: string;
    hobbies?: string[];
    favoriteMovie?: string;
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
            const response = await fetch(localUri);
            const blob = await response.blob();
            const fileName =
                index !== undefined
                    ? `${currentUser.uid}-${index}.jpg`
                    : `${currentUser.uid}-${Date.now()}.jpg`;
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
                } else {
                    updatedPhotos.push(downloadURL);
                }
                await updateDoc(userRef, { [field]: updatedPhotos });
                setUserData(prev => ({ ...prev, [field]: updatedPhotos }));
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

    // For editing bio – using Alert.prompt (iOS demo; consider a custom modal for cross-platform)
    const editBio = () => {
        Alert.prompt(
            'Edit Bio',
            'Enter your new bio:',
            (text) => {
                const userRef = doc(db, 'users', currentUser!.uid);
                updateDoc(userRef, { bio: text })
                    .then(() => setUserData(prev => ({ ...prev, bio: text })))
                    .catch((err) => {
                        console.error('Error updating bio:', err);
                        Alert.alert('Error', 'Could not update bio.');
                    });
            },
            'plain-text',
            userData.bio || ''
        );
    };

    if (loading) {
        return <LoadingScreen />;
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
        relationshipGoals,
        occupation,
        education,
        hobbies,
        favoriteMovie,
        lat,
        lng,
    } = userData;

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header with Logout Icon */}
            <View style={styles.header}>
                <View style={styles.headerSpacer} />
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={24} color="#007bff" />
                </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.container}>
                    {/* Main Profile Photo with overlay edit icon using PhotoLoader */}
                    <View style={styles.photoWrapper}>
                        {photoURL ? (
                            <View style={styles.avatarWrapper}>
                                <PhotoLoader uri={photoURL} containerStyle={styles.avatarWrapper} imageStyle={styles.avatar} />
                            </View>
                        ) : (
                            <View style={[styles.avatar, styles.noAvatar]}>
                                <Text style={styles.noAvatarText}>No Photo</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.editIconOverlay}
                            onPress={() => pickImageForField('profilePhotos', 'photoURL')}
                        >
                            <MaterialCommunityIcons name="pencil-outline" size={18} color="#007bff" />
                        </TouchableOpacity>
                    </View>

                    {/* Name */}
                    <Text style={styles.nameText}>{name || 'No Name'}</Text>

                    {/* Bio Section with inline edit icon */}
                    <View style={styles.bioContainer}>
                        <Text style={styles.bioText}>{bio || 'No bio yet.'}</Text>
                        <TouchableOpacity style={styles.editBioIcon} onPress={editBio}>
                            <MaterialCommunityIcons name="pencil-outline" size={16} color="#007bff" />
                        </TouchableOpacity>
                    </View>

                    {/* Additional Photos Grid */}
                    <View style={styles.photoGrid}>
                        {(additionalPhotos || []).map((photoUri, idx) => (
                            <View key={idx} style={styles.photoWrapperSmall}>
                                <PhotoLoader uri={photoUri} containerStyle={styles.photoWrapperSmall} imageStyle={styles.additionalPhoto} />
                                <TouchableOpacity
                                    style={styles.editIconOverlaySmall}
                                    onPress={() => pickImageForField('additionalPhotos', 'additionalPhotos', idx)}
                                >
                                    <MaterialCommunityIcons name="pencil-outline" size={14} color="#007bff" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {/* "Add Photo" cell integrated into the grid */}
                        <TouchableOpacity
                            style={[styles.photoWrapperSmall, styles.addPhotoCell]}
                            onPress={() => pickImageForField('additionalPhotos', 'additionalPhotos')}
                            disabled={uploading}
                        >
                            <Ionicons name="add-circle-outline" size={24} color="#007bff" />
                        </TouchableOpacity>
                    </View>

                    {/* Profile Details */}
                    <View style={styles.infoSection}>
                        {age !== undefined && (
                            <View style={styles.infoRow}>
                                <Ionicons name="calendar-outline" size={16} color="#333" />
                                <Text style={styles.infoText}> Age: {age}</Text>
                            </View>
                        )}
                        {city && (
                            <View style={styles.infoRow}>
                                <Ionicons name="location-outline" size={16} color="#333" />
                                <Text style={styles.infoText}> City: {city}</Text>
                            </View>
                        )}
                        {orientation && (
                            <View style={styles.infoRow}>
                                <MaterialCommunityIcons name="account-heart-outline" size={16} color="#333" />
                                <Text style={styles.infoText}> Orientation: {orientation}</Text>
                            </View>
                        )}
                        {lookingFor && (
                            <View style={styles.infoRow}>
                                <Ionicons name="search-outline" size={16} color="#333" />
                                <Text style={styles.infoText}> Looking For: {lookingFor}</Text>
                            </View>
                        )}
                        {interests && interests.length > 0 && (
                            <View style={styles.infoRow}>
                                <Ionicons name="pricetags-outline" size={16} color="#333" />
                                <Text style={styles.infoText}> Interests: {interests.join(', ')}</Text>
                            </View>
                        )}
                        {personality && personality.length > 0 && (
                            <View style={styles.infoRow}>
                                <MaterialCommunityIcons name="face-profile" size={16} color="#333" />
                                <Text style={styles.infoText}> Personality: {personality.join(', ')}</Text>
                            </View>
                        )}
                        {lifestyle && (
                            <View style={styles.infoRow}>
                                <MaterialCommunityIcons name="home-modern-outline" size={16} color="#333" />
                                <Text style={styles.infoText}> Lifestyle: {JSON.stringify(lifestyle)}</Text>
                            </View>
                        )}
                        {relationshipGoals && (
                            <View style={styles.infoRow}>
                                <MaterialCommunityIcons name="heart-multiple-outline" size={16} color="#333" />
                                <Text style={styles.infoText}> Relationship Goals: {relationshipGoals}</Text>
                            </View>
                        )}
                        {occupation && (
                            <View style={styles.infoRow}>
                                <MaterialCommunityIcons name="briefcase-outline" size={16} color="#333" />
                                <Text style={styles.infoText}> Occupation: {occupation}</Text>
                            </View>
                        )}
                        {education && (
                            <View style={styles.infoRow}>
                                <MaterialCommunityIcons name="school-outline" size={16} color="#333" />
                                <Text style={styles.infoText}> Education: {education}</Text>
                            </View>
                        )}
                        {hobbies && hobbies.length > 0 && (
                            <View style={styles.infoRow}>
                                <MaterialCommunityIcons name="run" size={16} color="#333" />
                                <Text style={styles.infoText}> Hobbies: {hobbies.join(', ')}</Text>
                            </View>
                        )}
                        {favoriteMovie && (
                            <View style={styles.infoRow}>
                                <MaterialCommunityIcons name="movie-outline" size={16} color="#333" />
                                <Text style={styles.infoText}> Favorite Movie: {favoriteMovie}</Text>
                            </View>
                        )}
                        {lat !== undefined && lng !== undefined && (
                            <View style={styles.infoRow}>
                                <Ionicons name="pin-outline" size={16} color="#333" />
                                <Text style={styles.infoText}>
                                    Coordinates: {lat.toFixed(4)}, {lng.toFixed(4)}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    scrollContainer: { paddingBottom: 20 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loaderText: { marginTop: 8, fontSize: 16, color: '#555' },
    errorText: { color: 'red', fontSize: 14, textAlign: 'center', marginHorizontal: 20 },
    container: { alignItems: 'center', padding: 20 },
    // Header with Logout Icon
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    logoutButton: {
        // No background color, simple icon.
    },
    headerSpacer: { flex: 1 },
    // Main Profile Photo & Edit Overlay
    photoWrapper: { position: 'relative', marginBottom: 10 },
    avatarWrapper: { position: 'relative' },
    avatar: { width: 150, height: 150, borderRadius: 10, backgroundColor: '#eee', resizeMode: 'cover' },
    noAvatar: { justifyContent: 'center', alignItems: 'center' },
    noAvatarText: { color: '#aaa' },
    nameText: { fontSize: 20, fontWeight: '600', color: '#333', marginTop: 10 },
    editIconOverlay: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: 'transparent',
        borderRadius: 20,
        padding: 4,
    },
    imageLoaderOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    // Additional Photos Grid
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 15 },
    photoWrapperSmall: { position: 'relative', margin: 5 },
    additionalPhoto: { width: 80, height: 80, borderRadius: 8, backgroundColor: 'transparent', resizeMode: 'cover' },
    noPhoto: { justifyContent: 'center', alignItems: 'center' },
    editIconOverlaySmall: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'transparent',
        borderRadius: 12,
        padding: 2,
    },
    addPhotoCell: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: 80,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    // Bio Section
    bioContainer: {
        width: '100%',
        backgroundColor: 'transparent',
        borderRadius: 12,
        padding: 12,
        marginVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bioText: { fontSize: 16, color: '#555', textAlign: 'center', marginRight: 8 },
    editBioIcon: { backgroundColor: 'transparent' },
    // Info Section for Profile Details
    infoSection: { width: '100%', marginVertical: 10, paddingHorizontal: 10 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    infoText: { fontSize: 16, color: '#333', marginLeft: 4 },
});
