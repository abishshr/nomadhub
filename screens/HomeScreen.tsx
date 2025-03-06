// screens/HomeScreen.tsx
import React, { useEffect, useState, memo, useCallback } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    ScrollView,
    StyleSheet,
    Image,
    TextInput,
    Dimensions,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import * as Location from 'expo-location';
import {
    fetchCityName,
    fetchWeatherByCity,
    fetchLocalNews,
    fetchAirPollutionByCity,
} from '../api';
import { fetchChatGPTResponse } from '../services/ChatGPTService';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import LoadingScreen from './LoadingScreen';

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

type VisaOption = {
    visaType: string;
    numberOfDays: string;
    eligibility: string;
    countries: string;
};

// Memoized SearchInput component – keeps search input behavior unchanged
const SearchInput = memo(
    ({ value, onChangeText }: { value: string; onChangeText: (text: string) => void }) => (
        <TextInput
            style={styles.searchInput}
            placeholder="Search for anything in your current city..."
            placeholderTextColor="#aaa"
            value={value}
            onChangeText={onChangeText}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus={false}
        />
    )
);

// Memoized SearchResultCard – displays a single search result in a card with an icon
const SearchResultCard = memo(({ result }: { result: string }) => (
    <View style={styles.searchResultCard}>
        <Ionicons name="location-outline" size={20} color="#007bff" style={styles.searchResultIcon} />
        <Text style={styles.searchResultCardText}>{result}</Text>
    </View>
));

// Memoized HeaderComponent – renders the search input, search button, welcome message,
// info card, and the search results as vertical cards.
const HeaderComponent = memo(({
                                  searchQuery,
                                  city,
                                  weather,
                                  airPollution,
                                  searchResults,
                                  handleSearch,
                                  setSearchQuery,
                              }: {
    searchQuery: string;
    city: string;
    weather: WeatherData | null;
    airPollution: { aqi: number | null; pm2_5: number | null };
    searchResults: string[];
    handleSearch: () => void;
    setSearchQuery: (text: string) => void;
}) => {
    const getAQIDescription = (aqi: number) => {
        switch (aqi) {
            case 1:
                return 'Good';
            case 2:
                return 'Fair';
            case 3:
                return 'Moderate';
            case 4:
                return 'Poor';
            case 5:
                return 'Very Poor';
            default:
                return 'Unknown';
        }
    };

    return (
        <View style={styles.headerContainer}>
            <View style={styles.searchRow}>
                <SearchInput value={searchQuery} onChangeText={setSearchQuery} />
                <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                    <Ionicons name="search" size={24} color="#fff" />
                </TouchableOpacity>
            </View>
            <Text style={styles.welcomeTitle}>Welcome to {city}!</Text>
            <View style={styles.infoCard}>
                <View style={styles.weatherContainer}>
                    {weather && (
                        <>
                            <Image source={{ uri: weather.icon }} style={styles.weatherIcon} />
                            <View style={styles.weatherTextContainer}>
                                <Text style={styles.weatherTemp}>{Math.round(weather.temp)}°C</Text>
                                <Text style={styles.weatherDesc}>{weather.description}</Text>
                            </View>
                        </>
                    )}
                </View>
                <View style={styles.airContainer}>
                    {airPollution.aqi !== null && (
                        <View style={styles.airQualityItem}>
                            <Ionicons name="speedometer-outline" size={20} color="#2ecc71" />
                            <Text style={styles.airQualityText}>
                                AQI: {airPollution.aqi} {getAQIDescription(airPollution.aqi)}
                            </Text>
                        </View>
                    )}
                    {airPollution.pm2_5 !== null && (
                        <View style={styles.airQualityItem}>
                            <MaterialCommunityIcons name="smog" size={20} color="#2ecc71" />
                            <Text style={styles.airQualityText}>PM2.5: {airPollution.pm2_5} μg/m³</Text>
                        </View>
                    )}
                </View>
            </View>
            {searchResults.length > 0 && (
                <View style={styles.searchResultsContainer}>
                    <Text style={styles.searchResultsTitle}>
                        Results :
                    </Text>
                    {searchResults.map((result, index) => (
                        <SearchResultCard key={index} result={result} />
                    ))}
                </View>
            )}
        </View>
    );
});

export default function HomeScreen() {
    const [loading, setLoading] = useState(true);
    const [city, setCity] = useState<string>('');
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [news, setNews] = useState<NewsItem[]>([]);
    const [visaOptions, setVisaOptions] = useState<VisaOption[]>([]);
    const [visaLoading, setVisaLoading] = useState<boolean>(true);
    const [airPollution, setAirPollution] = useState<{ aqi: number | null; pm2_5: number | null }>({
        aqi: null,
        pm2_5: null,
    });
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [searchLoading, setSearchLoading] = useState<boolean>(false);
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
                const airData = await fetchAirPollutionByCity(detectedCity);
                setAirPollution(airData);
                fetchVisaOptions(detectedCity);
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

    const fetchVisaOptions = async (cityName: string) => {
        try {
            const prompt = `Return a JSON array of digital nomad visa options for someone in ${cityName}. Each object should include:
- "visaType": The name of the visa (e.g., "Digital Nomad Visa", "Tourist Visa"),
- "numberOfDays": The number of days allowed on this visa,
- "eligibility": A brief description of eligibility criteria,
- "countries": A comma-separated list of countries where this visa is required.
Only output the JSON array.`;
            const responseText = await fetchChatGPTResponse(prompt);
            const options = JSON.parse(responseText) as VisaOption[];
            setVisaOptions(options);
            setVisaLoading(false);
        } catch (error) {
            console.error('Error fetching visa options:', error);
            setVisaLoading(false);
        }
    };

    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) return;
        setSearchLoading(true);
        try {
            const prompt = `Return a JSON array of search results for local places or services in ${city} regarding "${searchQuery}". Only include results that are relevant to ${city}. Each result should be a short string.`;
            const responseText = await fetchChatGPTResponse(prompt);
            const parsed = JSON.parse(responseText);
            // Check if response is an object with a "results" property
            const results = Array.isArray(parsed)
                ? parsed
                : parsed.results || [];
            setSearchResults(results);
        } catch (err) {
            console.error('Error fetching search results:', err);
            Alert.alert('Error', 'Search failed. Please try again.');
        } finally {
            setSearchLoading(false);
        }
    }, [searchQuery, city]);

    if (loading) {
        return <LoadingScreen />;
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

    const featuredNews = news.length > 0 ? news[0] : null;
    const otherNews = news.length > 1 ? news.slice(1) : [];

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="none"
            >
                <HeaderComponent
                    searchQuery={searchQuery}
                    city={city}
                    weather={weather}
                    airPollution={airPollution}
                    searchResults={searchResults}
                    handleSearch={handleSearch}
                    setSearchQuery={setSearchQuery}
                />
                <Text style={styles.sectionTitle}>Local News</Text>
                {featuredNews && (
                    <View style={styles.featuredNewsCard}>
                        {featuredNews.urlToImage ? (
                            <Image source={{ uri: featuredNews.urlToImage }} style={styles.featuredNewsImage} />
                        ) : (
                            <View style={styles.noImagePlaceholder}>
                                <Text style={styles.noImageText}>No Image</Text>
                            </View>
                        )}
                        <Text style={styles.featuredNewsTitle}>{featuredNews.title}</Text>
                        <Text style={styles.featuredNewsSource}>{featuredNews.source.name}</Text>
                    </View>
                )}
                <View style={styles.smallNewsGrid}>
                    {otherNews.map((item, index) => (
                        <View key={index} style={styles.smallNewsCard}>
                            {item.urlToImage ? (
                                <Image source={{ uri: item.urlToImage }} style={styles.smallNewsImage} />
                            ) : (
                                <View style={styles.noImagePlaceholder}>
                                    <Text style={styles.noImageText}>No Image</Text>
                                </View>
                            )}
                            <Text style={styles.smallNewsTitle}>{item.title}</Text>
                            <Text style={styles.featuredNewsSource}>{item.source.name}</Text>
                        </View>
                    ))}
                </View>
                <Text style={styles.sectionTitle}>Visa Options</Text>
                {visaLoading ? (
                    <ActivityIndicator size="small" color="#007bff" />
                ) : visaOptions.length === 0 ? (
                    <Text style={styles.noVisaText}>No visa options found.</Text>
                ) : (
                    <View style={styles.visaGrid}>
                        {visaOptions.map((option, index) => renderVisaCard(option, index))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// Helper function for rendering visa cards
const renderVisaCard = (item: VisaOption, index: number) => (
    <View style={styles.visaCard} key={index}>
        <View style={styles.visaHeader}>
            <MaterialCommunityIcons name="file-document-outline" size={20} color="#007bff" />
            <Text style={styles.visaCardTitle}>{item.visaType}</Text>
        </View>
        <View style={styles.visaDetailRow}>
            <Ionicons name="calendar-outline" size={16} color="#222" style={styles.visaIcon} />
            <Text style={styles.visaDetailText}>{item.numberOfDays} days allowed</Text>
        </View>
        <View style={styles.visaDetailRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#222" style={styles.visaIcon} />
            <Text style={styles.visaDetailText}>Eligibility: {item.eligibility}</Text>
        </View>
        <View style={styles.visaDetailRow}>
            <Ionicons name="flag-outline" size={16} color="#222" style={styles.visaIcon} />
            <Text style={styles.visaDetailText}>Countries: {item.countries}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    container: { padding: 20, paddingBottom: 40 },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
    errorText: { fontSize: 14, color: 'red', textAlign: 'center', marginBottom: 20 },
    retryButton: { backgroundColor: '#007bff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
    retryButtonText: { color: '#fff', fontWeight: 'bold' },
    headerContainer: { marginBottom: 30 },
    searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    searchInput: {
        flex: 1,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        fontSize: 14,
        color: '#333',
        backgroundColor: '#fff',
    },
    searchButton: {
        backgroundColor: '#007bff',
        padding: 12,
        marginLeft: 10,
        borderRadius: 10,
    },
    welcomeTitle: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, color: '#222' },
    infoCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        marginBottom: 20,
    },
    weatherContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRightWidth: 1,
        borderColor: '#f0f0f0',
    },
    weatherIcon: { width: 50, height: 50, marginRight: 10 },
    weatherTextContainer: {},
    weatherTemp: { fontSize: 18, fontWeight: 'bold', color: '#222' },
    weatherDesc: { fontSize: 14, color: '#555' },
    airContainer: { flex: 1, justifyContent: 'center', padding: 12 },
    airQualityItem: { flexDirection: 'row', alignItems: 'center' },
    airQualityText: { fontSize: 14, color: '#2ecc71', marginLeft: 4 },
    sectionTitle: { fontSize: 22, fontWeight: 'bold', marginVertical: 15, color: '#222' },
    // Featured News Card
    featuredNewsCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 20,
        padding: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    featuredNewsImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: 12, resizeMode: 'cover' },
    featuredNewsTitle: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 8 },
    featuredNewsSource: { fontSize: 14, color: '#666' },
    // Small News Grid
    smallNewsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    smallNewsCard: {
        width: (width - 60) / 2,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 20,
        padding: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    smallNewsImage: { width: '100%', height: 100, borderRadius: 8, marginBottom: 8, resizeMode: 'cover' },
    smallNewsTitle: { fontSize: 12, fontWeight: '700', color: '#222', marginBottom: 4 },
    visaGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    visaCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 15,
        width: (width - 60) / 2,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        overflow: 'hidden',
    },
    visaHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    visaCardTitle: { fontSize: 14, fontWeight: 'bold', color: '#222', marginLeft: 4, flex: 1, textAlign: 'center' },
    visaDetailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    visaIcon: { marginRight: 4 },
    visaDetailText: { fontSize: 10, color: '#333' },
    // Search results container – displayed as vertical cards
    searchResultsContainer: { marginTop: 10, paddingHorizontal: 10 },
    searchResultsTitle: { fontSize: 14, fontWeight: '600', color: '#007bff', marginBottom: 4 },
    searchResultCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f7f7f7',
        borderRadius: 8,
        padding: 8,
        marginBottom: 8,
        elevation: 1,
    },
    searchResultIcon: { marginRight: 4 },
    searchResultCardText: { fontSize: 14, color: '#333' },
    // Overall header container
    headerContainer: { marginBottom: 30 },
    searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
});

