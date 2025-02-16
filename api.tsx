import { GOOGLE_API_KEY, OPENWEATHER_API_KEY, NEWSAPI_KEY } from '@env';
import axios from 'axios';

export type WeatherData = {
    temp: number;
    description: string;
    icon: string;
};

export type NewsArticle = {
    title: string;
    source: { name: string };
    urlToImage?: string;
};

/**
 * Fetch the city name from latitude and longitude coordinates.
 * @param latitude Latitude of the location.
 * @param longitude Longitude of the location.
 * @returns The city name as a string, or null if not found.
 */
export async function fetchCityName(latitude: number, longitude: number): Promise<string | null> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`;
    try {
        const response = await axios.get(url);
        if (response.data && response.data.results && response.data.results.length > 0) {
            const addressComponents = response.data.results[0].address_components;
            const cityComponent = addressComponents.find((ac: any) => ac.types.includes('locality'));
            return cityComponent ? cityComponent.long_name : null;
        }
        return null;
    } catch (error) {
        console.error('Error fetching city name:', error);
        return null;
    }
}

/**
 * Fetch current weather data for a given city.
 * @param city Name of the city.
 * @returns WeatherData object or null if an error occurs.
 */
export async function fetchWeatherByCity(city: string): Promise<WeatherData | null> {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    try {
        const response = await axios.get(url);
        if (response.data) {
            const { main, weather } = response.data;
            return {
                temp: main.temp,
                description: weather[0].description,
                icon: `http://openweathermap.org/img/wn/${weather[0].icon}@2x.png`,
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching weather data:', error);
        return null;
    }
}

/**
 * Fetch local news for a given city.
 * @param city Name of the city.
 * @returns An array of news articles or an empty array if an error occurs.
 */
export async function fetchLocalNews(city: string): Promise<NewsArticle[]> {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(city)}&apiKey=${NEWSAPI_KEY}&language=en&pageSize=10`;
    try {
        const response = await axios.get(url);
        if (response.data && response.data.articles) {
            return response.data.articles.map((article: any) => ({
                title: article.title,
                source: { name: article.source.name },
                urlToImage: article.urlToImage,
            }));
        }
        return [];
    } catch (error) {
        console.error('Error fetching news data:', error);
        return [];
    }
}

import { AxiosRequestConfig } from 'axios';

/**
 * Fetch places based on query and location.
 * @param query Search text for the type of places.
 * @param latitude Latitude of the location.
 * @param longitude Longitude of the location.
 * @returns An array of places or an empty array if an error occurs.
 */
export const fetchPlacesByText = async (
    query: string,
    latitude: number,
    longitude: number
): Promise<any[]> => {
    try {
        const url = `https://places.googleapis.com/v1/places:searchText`;

        // Define the payload
        const payload = {
            textQuery: query,
            locationBias: {
                circle: {
                    center: { latitude, longitude },
                    radius: 5000, // Adjust radius as needed
                },
            },
        };

        // Define the AxiosRequestConfig object with correct types
        const config: AxiosRequestConfig = {
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_API_KEY,
                'X-Goog-FieldMask': '*',
            },
        };

        console.log('Headers:', config.headers);
        console.log('Payload:', payload);

        const response = await axios.post(url, payload, config);

        if (response.data && response.data.places) {
            console.log('Fetched places:', response.data.places);
            return response.data.places;
        }

        console.error('No places found in response:', response.data);
        return [];
    } catch (error: any) {
        console.error('Error fetching places:', error.message || error);
        throw new Error('Error fetching places data.');
    }
};