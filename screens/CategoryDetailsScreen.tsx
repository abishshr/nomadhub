// screens/CategoryDetailsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Image,
    TouchableOpacity,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import { GOOGLE_API_KEY } from '@env';
import { fetchChatGPTResponse } from '../services/ChatGPTService';
import { haversineDistance } from '../utils/haversine';

type CategoryDetailsRouteProp = RouteProp<
    { CategoryDetails: { categoryKey?: string } },
    'CategoryDetails'
>;

type LocationPlace = {
    place_id: string;
    name: string;
    rating?: number;
    user_ratings_total?: number;
    price_level?: number;
    vicinity: string;
    geometry?: {
        location: {
            lat: number;
            lng: number;
        };
    };
    photos?: any[];
    distance?: number;
    reviews?: any[];
    chatGPTRefinedReviews?: string;
    isSummarizing?: boolean;
};

export default function CategoryDetailsScreen() {
    // Retrieve categoryKey from route (default 'gyms' if none)
    const route = useRoute<CategoryDetailsRouteProp>();
    const { categoryKey = 'gyms' } = route.params ?? {};

    const [userLat, setUserLat] = useState<number | null>(null);
    const [userLng, setUserLng] = useState<number | null>(null);

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [places, setPlaces] = useState<LocationPlace[]>([]);

    useEffect(() => {
        getUserLocation();
    }, []);

    /**
     * 1) Fetch user location
     */
    const getUserLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMessage('Location permission denied. Please enable location services.');
                setLoading(false);
                return;
            }
            const loc = await Location.getCurrentPositionAsync({});
            setUserLat(loc.coords.latitude);
            setUserLng(loc.coords.longitude);

            // 2) Once we have lat/lng, fetch places for category
            fetchCategoryPlaces(loc.coords.latitude, loc.coords.longitude);
        } catch (err) {
            console.error('Error obtaining location:', err);
            setErrorMessage('Error fetching location.');
            setLoading(false);
        }
    };

    /**
     * 2) Fetch places for chosen category, sorted by distance
     */
    const fetchCategoryPlaces = async (lat: number, lng: number) => {
        setLoading(true);

        const radius = 5000;
        const baseUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&key=${GOOGLE_API_KEY}`;

        let url = '';
        switch (categoryKey) {
            case 'gyms':
                url = `${baseUrl}&type=gym`;
                break;
            case 'yoga':
                url = `${baseUrl}&keyword=yoga`;
                break;
            case 'crossfit':
                url = `${baseUrl}&keyword=crossfit`;
                break;
            case 'hostels':
                url = `${baseUrl}&keyword=hostel`;
                break;
            case 'hotels':
                url = `${baseUrl}&type=lodging`;
                break;
            case 'restaurants':
                url = `${baseUrl}&type=restaurant`;
                break;
            case 'cafes':
                url = `${baseUrl}&type=cafe`;
                break;
            /**
             * NEW CATEGORIES:
             * beach => &keyword=beach
             * supermarket => &type=supermarket
             */
            case 'beach':
                url = `${baseUrl}&keyword=beach`;
                break;
            case 'supermarket':
                url = `${baseUrl}&type=supermarket`;
                break;
            default:
                url = baseUrl; // fallback
                break;
        }

        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.results) {
                const results: LocationPlace[] = data.results.map((place: any) => {
                    let distance = 0;
                    if (place.geometry?.location) {
                        distance = haversineDistance(
                            lat,
                            lng,
                            place.geometry.location.lat,
                            place.geometry.location.lng
                        );
                    }
                    return {
                        ...place,
                        distance,
                        reviews: [],
                        chatGPTRefinedReviews: '',
                        isSummarizing: false,
                    };
                });
                // Sort ascending by distance
                results.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
                setPlaces(results);
            }
        } catch (err) {
            console.error('Error fetching category places:', err);
            setErrorMessage('Error fetching places.');
        }
        setLoading(false);
    };

    /**
     * Format price level
     */
    const renderPriceLevel = (level?: number) => {
        if (level == null) return 'N/A';
        if (level === 0) return 'Free';
        return '$'.repeat(level);
    };

    /**
     * Summarize place reviews with ChatGPT
     */
    const handleSummarizeReviews = async (placeId: string) => {
        setPlaces((prev) =>
            prev.map((p) => (p.place_id === placeId ? { ...p, isSummarizing: true } : p))
        );

        const place = places.find((p) => p.place_id === placeId);
        if (!place) return;

        try {
            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&key=${GOOGLE_API_KEY}`;
            const resp = await fetch(detailsUrl);
            const detailsData = await resp.json();
            const reviews = detailsData.result?.reviews ?? [];

            if (reviews.length > 0) {
                const prompt = buildChatGPTPrompt(place.name, reviews);
                const chatGPTResponse = await fetchChatGPTResponse(prompt);

                setPlaces((prev) =>
                    prev.map((p) =>
                        p.place_id === placeId
                            ? { ...p, reviews, chatGPTRefinedReviews: chatGPTResponse, isSummarizing: false }
                            : p
                    )
                );
            } else {
                setPlaces((prev) =>
                    prev.map((p) =>
                        p.place_id === placeId
                            ? {
                                ...p,
                                reviews: [],
                                chatGPTRefinedReviews: 'No reviews available to summarize.',
                                isSummarizing: false,
                            }
                            : p
                    )
                );
            }
        } catch (err) {
            console.error('Error summarizing reviews:', err);
            setPlaces((prev) =>
                prev.map((p) =>
                    p.place_id === placeId
                        ? { ...p, chatGPTRefinedReviews: 'Unable to summarize reviews.', isSummarizing: false }
                        : p
                )
            );
        }
    };

    /**
     * Build ChatGPT prompt from reviews
     */
    const buildChatGPTPrompt = (placeName: string, reviews: any[]) => {
        let prompt = `We have the following reviews for ${placeName}:\n`;
        reviews.forEach((rev: any, idx: number) => {
            prompt += `${idx + 1}) Rating: ${rev.rating} - "${rev.text}"\n`;
        });
        prompt += `
Please summarize these reviews in 2–5 lines total, highlighting main positives and negatives.
`;
        return prompt;
    };

    /**
     * Render each place as a modern card
     */
    const renderPlaceCard = (item: LocationPlace) => {
        const {
            place_id,
            name,
            vicinity,
            distance,
            rating,
            user_ratings_total,
            price_level,
            photos,
            chatGPTRefinedReviews,
            isSummarizing,
        } = item;

        let imageUri: string | null = null;
        if (photos && photos.length > 0) {
            imageUri = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photos[0].photo_reference}&key=${GOOGLE_API_KEY}`;
        }

        return (
            <View style={styles.card} key={place_id}>
                {imageUri ? (
                    <Image style={styles.cardImage} source={{ uri: imageUri }} />
                ) : (
                    <View style={[styles.cardImage, styles.noImage]}>
                        <Text style={styles.noImageText}>No Image</Text>
                    </View>
                )}
                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{name}</Text>
                    <Text style={styles.cardSubtitle}>{vicinity || 'No address'}</Text>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Distance:</Text>
                        <Text style={styles.infoValue}>
                            {distance !== undefined ? `${distance.toFixed(2)} km` : 'N/A'}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Rating:</Text>
                        <Text style={styles.infoValue}>{rating ? rating.toFixed(1) : 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Reviews:</Text>
                        <Text style={styles.infoValue}>
                            {user_ratings_total !== undefined ? user_ratings_total : 'N/A'}
                        </Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Price:</Text>
                        <Text style={styles.infoValue}>{renderPriceLevel(price_level)}</Text>
                    </View>

                    {!chatGPTRefinedReviews && (
                        <TouchableOpacity
                            style={styles.summarizeButton}
                            onPress={() => handleSummarizeReviews(place_id)}
                            disabled={isSummarizing}
                        >
                            <Text style={styles.summarizeButtonText}>
                                {isSummarizing ? 'Summarizing...' : 'Summarize Reviews'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {chatGPTRefinedReviews ? (
                        <View style={styles.reviewContainer}>
                            <Text style={styles.reviewTitle}>Refined Reviews (2–5 lines):</Text>
                            <Text style={styles.reviewText}>{chatGPTRefinedReviews}</Text>
                        </View>
                    ) : null}
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={styles.loadingText}>Loading {categoryKey.toUpperCase()}...</Text>
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
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.screenTitle}>{categoryKey.toUpperCase()}</Text>
                {places.map(renderPlaceCard)}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        padding: 16,
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
    screenTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginVertical: 12,
        textAlign: 'center',
        color: '#333',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
    },
    cardImage: {
        width: '100%',
        height: 180,
    },
    noImage: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ddd',
    },
    noImageText: {
        fontSize: 16,
        color: '#555',
    },
    cardContent: {
        padding: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#777',
        marginBottom: 8,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 2,
    },
    infoLabel: {
        fontWeight: '600',
        color: '#555',
        marginRight: 4,
    },
    infoValue: {
        color: '#333',
    },
    summarizeButton: {
        marginTop: 8,
        backgroundColor: '#007bff',
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    summarizeButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    reviewContainer: {
        marginTop: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        padding: 8,
    },
    reviewTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    reviewText: {
        fontSize: 14,
        color: '#555',
        lineHeight: 20,
    },
});
