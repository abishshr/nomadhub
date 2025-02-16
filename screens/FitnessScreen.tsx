// screens/FitnessScreen.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    Image,
    StyleSheet,
    ActivityIndicator,
    Alert
} from 'react-native';
import * as Location from 'expo-location';
import { GOOGLE_API_KEY } from '@env';

type FitnessCenter = {
    place_id: string;
    name: string;
    rating?: number;
    photos?: Array<{ photo_reference: string }>;
};

const FitnessScreen: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [fitnessCenters, setFitnessCenters] = useState<FitnessCenter[]>([]);
    const [errorMessage, setErrorMessage] = useState<string>('');

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
                const { latitude, longitude } = location.coords;
                await fetchFitnessCenters(latitude, longitude);
            } catch (error) {
                console.error('Error obtaining location:', error);
                setErrorMessage('Error fetching location.');
                setLoading(false);
            }
        })();
    }, []);

    const fetchFitnessCenters = async (latitude: number, longitude: number) => {
        const radius = 5000; // search within 5 km
        const type = 'gym';  // search for gyms
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=${type}&key=${GOOGLE_API_KEY}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.results) {
                setFitnessCenters(data.results);
            } else {
                setErrorMessage('No fitness centers found.');
            }
        } catch (error) {
            console.error('Error fetching fitness centers:', error);
            setErrorMessage('Error fetching fitness centers.');
        }
        setLoading(false);
    };

    const renderItem = ({ item }: { item: FitnessCenter }) => (
        <View style={styles.itemContainer}>
            {item.photos && item.photos.length > 0 ? (
                <Image
                    style={styles.image}
                    source={{ uri: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${item.photos[0].photo_reference}&key=${GOOGLE_API_KEY}` }}
                />
            ) : (
                <View style={[styles.image, styles.noImage]}>
                    <Text style={styles.noImageText}>No Image</Text>
                </View>
            )}
            <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.rating}>Rating: {item.rating ? item.rating.toFixed(1) : 'N/A'}</Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={styles.loadingText}>Loading fitness centers...</Text>
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

    return (
        <View style={styles.container}>
            <FlatList
                data={fitnessCenters}
                keyExtractor={(item) => item.place_id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

export default FitnessScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 10,
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
    list: {
        paddingBottom: 20,
    },
    itemContainer: {
        marginBottom: 15,
        backgroundColor: '#f9f9f9',
        borderRadius: 10,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
    },
    image: {
        width: '100%',
        height: 200,
    },
    noImage: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ccc',
    },
    noImageText: {
        fontSize: 16,
        color: '#555',
    },
    info: {
        padding: 10,
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#333',
    },
    rating: {
        fontSize: 16,
        color: '#777',
    },
});
