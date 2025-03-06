// screens/LocationGridScreen.tsx
import React, { useEffect, useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import LoadingScreen from './LoadingScreen';

// Vector icons
import {Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';

/**
 * CategoryItem defines the shape of each category:
 *  - key: string
 *  - label: string (the text displayed)
 *  - iconName: name of the MaterialCommunityIcons icon
 */
type CategoryItem = {
    key: string;
    label: string;
    iconName: string;
};

/**
 * We define our categories with iconName matching MaterialCommunityIcons names.
 * For example, see https://materialdesignicons.com/ for valid names.
 * Adjust iconName as needed for your categories.
 */
const CATEGORIES: CategoryItem[] = [
    { key: 'gyms', label: 'Gyms', iconName: 'dumbbell' },
    { key: 'yoga', label: 'Yoga', iconName: 'yoga' },
    { key: 'crossfit', label: 'CrossFit', iconName: 'weight-lifter' },
    { key: 'hostels', label: 'Hostels', iconName: 'home-group' },
    { key: 'hotels', label: 'Hotels', iconName: 'bed' },
    { key: 'restaurants', label: 'Restaurants', iconName: 'silverware-fork-knife' },
    { key: 'cafes', label: 'Cafés', iconName: 'coffee' },
    { key: 'beach', label: 'Beach', iconName: 'beach' },
    { key: 'supermarket', label: 'Supermarket', iconName: 'cart' },
];

export default function LocationGridScreen() {
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [userLat, setUserLat] = useState<number | null>(null);
    const [userLng, setUserLng] = useState<number | null>(null);

    const navigation = useNavigation();

    useEffect(() => {
        (async () => {
            try {
                // 1) Get current user from Firebase Auth
                const auth = getAuth();
                const currentUser = auth.currentUser;
                if (!currentUser) {
                    setErrorMessage('No current user found. Please log in.');
                    setLoading(false);
                    return;
                }

                // 2) Read user doc in Firestore to get lat & lng
                const uid = currentUser.uid;
                const userRef = doc(db, 'users', uid);
                const snapshot = await getDoc(userRef);

                if (!snapshot.exists()) {
                    setErrorMessage('User doc not found in Firestore.');
                    setLoading(false);
                    return;
                }

                const data = snapshot.data();
                const lat = data?.lat;
                const lng = data?.lng;

                if (lat == null || lng == null) {
                    // If lat/lng are missing in the user doc
                    setErrorMessage('No lat/lng stored in your profile.');
                    setLoading(false);
                    return;
                }

                // We have lat/lng
                setUserLat(lat);
                setUserLng(lng);
                setLoading(false);

            } catch (error) {
                console.error('Error reading user doc for lat/lng:', error);
                setErrorMessage('Error loading location from your user profile.');
                setLoading(false);
            }
        })();
    }, []);

    // If still loading
    if (loading) {
        return <LoadingScreen />;
    }

    // If there's an error (missing lat/lng or doc not found)
    if (errorMessage) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
        );
    }

    /**
     * Pressing a category navigates to CategoryDetails
     * with the categoryKey plus userLat/userLng
     */
    const handleCategoryPress = (categoryKey: string) => {
        navigation.navigate('CategoryDetails' as never, {
            categoryKey,
            userLat,
            userLng,
        } as never);
    };

    /**
     * Renders each category as a card with a MaterialCommunityIcons icon
     */
    const renderCategoryItem = ({ item }: { item: CategoryItem }) => (
        <TouchableOpacity style={styles.categoryCard} onPress={() => handleCategoryPress(item.key)}>
            <MaterialCommunityIcons
                name={item.iconName}
                size={60}
                color="#333"
                style={styles.iconStyle}
            />
            <Text style={styles.categoryLabel}>{item.label}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <FlatList
                data={CATEGORIES}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                contentContainerStyle={styles.gridContainer}
                renderItem={renderCategoryItem}
                keyExtractor={(item) => item.key}
            />
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
    loadingText: {
        marginTop: 8,
        fontSize: 16,
        color: '#555',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: 'red',
        textAlign: 'center',
    },
    gridContainer: {
        paddingBottom: 24,
        paddingHorizontal: 16,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    categoryCard: {
        width: '48%',
        backgroundColor: '#fafafa',
        borderRadius: 14,
        borderWidth: 0.5,
        borderColor: '#ddd',
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 10,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 3 },
    },
    iconStyle: {
        marginBottom: 12,
    },
    categoryLabel: {
        fontSize: 17,
        fontWeight: '500',
        color: '#333',
    },
});
