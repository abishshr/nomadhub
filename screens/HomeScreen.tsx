// screens/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Image,
    TextInput,
    Dimensions,
    TouchableOpacity,
} from 'react-native';
import * as Location from 'expo-location';
import { fetchCityName, fetchWeatherByCity, fetchLocalNews } from '../api'; // Adjust path if needed

const { width } = Dimensions.get('window');

type WeatherData = {
    temp: number;
    description: string;
    icon: string;
};

type NewsItem = {
    title: string;
    source: { name: string };
    urlToImage?: string;
};

export default function HomeScreen() {
    const [loading, setLoading] = useState(true);
    const [city, setCity] = useState<string>('');
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [news, setNews] = useState<NewsItem[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');

    useEffect(() => {
        initializeLocationAndData();
    }, []);

    const initializeLocationAndData = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMessage('Location permission denied. Please enable location services.');
                setLoading(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;
            const detectedCity = await fetchCityName(latitude, longitude);

            if (detectedCity) {
                setCity(detectedCity);
                const fetchedWeather = await fetchWeatherByCity(detectedCity);
                const fetchedNews = await fetchLocalNews(detectedCity);
                setWeather(fetchedWeather);
                setNews(fetchedNews);
            } else {
                setErrorMessage('Unable to determine city from location.');
            }

            setLoading(false);
        } catch (err) {
            console.error('Initialization error:', err);
            setErrorMessage('An error occurred while fetching data.');
            setLoading(false);
        }
    };

    const renderNewsItem = ({ item }: { item: NewsItem }) => (
        <View style={styles.newsItem}>
            {item.urlToImage ? (
                <Image source={{ uri: item.urlToImage }} style={styles.newsImage} />
            ) : (
                <View style={styles.noImagePlaceholder}>
                    <Text style={styles.noImageText}>No Image</Text>
                </View>
            )}
            <View style={styles.newsContent}>
                <Text style={styles.newsTitle}>{item.title}</Text>
                <Text style={styles.newsSource}>{item.source.name}</Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#007bff" />
                    <Text style={styles.loadingText}>Loading data...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (errorMessage) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={initializeLocationAndData}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search (e.g., 'café', 'gym')"
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={() => {
                            // Future: fetch places based on searchQuery and user location
                        }}
                    />
                </View>

                <Text style={styles.title}>Welcome to {city}!</Text>

                {weather ? (
                    <View style={styles.weatherSection}>
                        <Image source={{ uri: weather.icon }} style={styles.weatherIcon} />
                        <View>
                            <Text style={styles.weatherTemp}>{Math.round(weather.temp)}°C</Text>
                            <Text style={styles.weatherDesc}>{weather.description}</Text>
                        </View>
                    </View>
                ) : (
                    <Text style={styles.noWeatherText}>Weather information not available.</Text>
                )}

                <Text style={styles.sectionTitle}>Local News</Text>
                {news.length > 0 ? (
                    <FlatList
                        data={news}
                        keyExtractor={(item, index) => `news-${index}`}
                        renderItem={renderNewsItem}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.newsListContent}
                    />
                ) : (
                    <Text style={styles.noNewsText}>No news found for this location.</Text>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
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
        paddingHorizontal: 20,
    },
    errorText: {
        fontSize: 16,
        color: 'red',
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        alignSelf: 'center',
        backgroundColor: '#007bff',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    header: {
        marginBottom: 20,
    },
    searchInput: {
        padding: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        fontSize: 16,
        color: '#333',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
    },
    weatherSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
        padding: 15,
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    weatherIcon: {
        width: 60,
        height: 60,
        marginRight: 15,
    },
    weatherTemp: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#333',
    },
    weatherDesc: {
        fontSize: 16,
        color: '#555',
    },
    noWeatherText: {
        fontSize: 16,
        color: '#888',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginVertical: 10,
        color: '#333',
    },
    noNewsText: {
        fontSize: 16,
        color: '#888',
    },
    newsListContent: {
        paddingBottom: 20,
    },
    newsItem: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 20,
        overflow: 'hidden',
        padding: 10,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    newsImage: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        marginBottom: 12,
        resizeMode: 'cover',
    },
    noImagePlaceholder: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        backgroundColor: '#ddd',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    noImageText: {
        color: '#555',
        fontSize: 16,
    },
    newsContent: {
        flex: 1,
    },
    newsTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        color: '#333',
        lineHeight: 24,
    },
    newsSource: {
        fontSize: 14,
        color: '#777',
    },
});
