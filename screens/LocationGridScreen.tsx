// screens/LocationGridScreen.tsx
import React, { useEffect, useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Image,
    TouchableOpacity,
    FlatList,
} from 'react-native';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';

type CategoryItem = {
    key: string;    // e.g. 'gyms'
    label: string;  // e.g. 'Gyms'
    icon: any;      // local image or icon reference
};

const CATEGORIES: CategoryItem[] = [
    { key: 'gyms', label: 'Gyms', icon: require('../assets/location/gymIcon.png') },
    { key: 'yoga', label: 'Yoga', icon: require('../assets/location/yogaIcon.png') },
    { key: 'crossfit', label: 'CrossFit', icon: require('../assets/location/crossfitIcon.png') },
    { key: 'hostels', label: 'Hostels', icon: require('../assets/location/hostelIcon.png') },
    { key: 'hotels', label: 'Hotels', icon: require('../assets/location/hotelIcon.png') },
    { key: 'restaurants', label: 'Restaurants', icon: require('../assets/location/restaurantIcon.png') },
    { key: 'cafes', label: 'Cafés', icon: require('../assets/location/cafeIcon.png') },
    { key: 'beach', label: 'Beach', icon: require('../assets/location/beachIcon.png') },
    { key: 'supermarket', label: 'Supermarket', icon: require('../assets/location/supermarketIcon.png') },
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
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setErrorMessage('Location permission denied. Please enable location services.');
                    setLoading(false);
                    return;
                }
                const location = await Location.getCurrentPositionAsync({});
                setUserLat(location.coords.latitude);
                setUserLng(location.coords.longitude);
                setLoading(false);
            } catch (error) {
                console.error('Error obtaining location:', error);
                setErrorMessage('Error fetching location.');
                setLoading(false);
            }
        })();
    }, []);

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={styles.loadingText}>Fetching location...</Text>
            </View>
        );
    }

    if (errorMessage) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
        );
    }

    const handleCategoryPress = (categoryKey: string) => {
        navigation.navigate('CategoryDetails' as never, {
            categoryKey,
            userLat,
            userLng,
        } as never);
    };

    const renderCategoryItem = ({ item }: { item: CategoryItem }) => (
        <TouchableOpacity style={styles.categoryCard} onPress={() => handleCategoryPress(item.key)}>
            <Image source={item.icon} style={styles.categoryIcon} />
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
        // Apple-like minimal background
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
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
        // Slight extra bottom padding for nicer scroll
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    categoryCard: {
        // More "Apple-like" minimal styling
        width: '48%', // for 2 columns with some gap
        backgroundColor: '#fafafa',
        borderRadius: 14,
        borderWidth: 0.5,
        borderColor: '#ddd',
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 10,
        // Very subtle shadow for a raised look
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 3 },
    },
    categoryIcon: {
        width: 80,
        height: 80,
        marginBottom: 12,
        resizeMode: 'cover', // Fill more space
    },
    categoryLabel: {
        fontSize: 17,
        fontWeight: '500',
        color: '#333',
    },
});
