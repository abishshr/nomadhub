import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert
} from 'react-native';
import * as Location from 'expo-location';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    where,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { db } from '../firebaseConfig';

// Import your fetchCityName from the snippet you provided:
import { fetchCityName } from '../api';
// ^ Adjust path to wherever that snippet is stored.

// Some default group templates
const DEFAULT_GROUPS = [
    (city: string) => ({ name: `General Chat (${city})`, city }),
    (city: string) => ({ name: `Foodies in ${city}`, city }),
    (city: string) => ({ name: `Nightlife in ${city}`, city }),
    (city: string) => ({ name: `Events in ${city}`, city }),
];

type Group = {
    id: string;
    name: string;
    city?: string;
    createdAt?: any; // Firestore timestamp
};

export default function GroupsListScreen() {
    const navigation = useNavigation();
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [userCity, setUserCity] = useState<string | null>(null);

    useEffect(() => {
        // Step 1) Get user location (lat/lng)
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Denied', 'Location permission is required to fetch city.');
                    setLoading(false);
                    return;
                }

                const loc = await Location.getCurrentPositionAsync({});
                const { latitude, longitude } = loc.coords;

                // Step 2) Use fetchCityName from your snippet to get city
                const cityName = await fetchCityName(latitude, longitude);
                if (!cityName) {
                    Alert.alert('Error', 'Could not determine city from location.');
                    setLoading(false);
                    return;
                }

                setUserCity(cityName);

                // Step 3) Now that we have cityName, fetch the groups from Firestore
                fetchCityGroups(cityName);
            } catch (error) {
                console.error('Error obtaining location:', error);
                Alert.alert('Error', 'Error fetching location or city.');
                setLoading(false);
            }
        })();
    }, []);

    /**
     * Fetch city-based groups from Firestore
     */
    function fetchCityGroups(cityName: string) {
        const groupsRef = collection(db, 'chat', 'master', 'groups');
        const qCity = query(
            groupsRef,
            where('city', '==', cityName),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(
            qCity,
            async (snapshot) => {
                const list: Group[] = [];
                snapshot.forEach((doc) => {
                    list.push({ id: doc.id, ...doc.data() } as Group);
                });
                setGroups(list);
                setLoading(false);

                // If no groups exist for this city, create default ones
                if (list.length === 0) {
                    await createDefaultGroupsForCity(cityName);
                }
            },
            (error) => {
                console.error('Error fetching groups:', error);
                Alert.alert('Error', 'Missing or insufficient permissions.');
                setLoading(false);
            }
        );

        // Cleanup if the component unmounts
        return unsubscribe;
    }

    /**
     * Create multiple default groups for the city
     */
    async function createDefaultGroupsForCity(city: string) {
        try {
            const groupsRef = collection(db, 'chat', 'master', 'groups');
            for (const buildGroup of DEFAULT_GROUPS) {
                const groupData = buildGroup(city);
                await addDoc(groupsRef, {
                    ...groupData,
                    createdAt: serverTimestamp(),
                });
            }
            console.log(`Default groups for '${city}' created.`);
        } catch (err) {
            console.error('Error creating default groups:', err);
            Alert.alert('Error', 'Could not create default groups. Check permissions.');
        }
    }

    const handleCreateGroup = () => {
        // Navigate to CreateGroup screen
        navigation.navigate('CreateGroup' as never);
    };

    const handlePressGroup = (groupId: string) => {
        // Navigate to GroupChat screen with the group ID
        navigation.navigate('GroupChat' as never, { groupId } as never);
    };

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text>Determining city and loading groups...</Text>
            </View>
        );
    }

    if (!userCity) {
        return (
            <View style={styles.loaderContainer}>
                <Text>Could not determine city from location.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.cityTitle}>Groups in {userCity}</Text>

            <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
                <Text style={styles.createButtonText}>+ Create Group</Text>
            </TouchableOpacity>

            {groups.length === 0 ? (
                <Text style={styles.noGroupsText}>No groups found for {userCity} yet...</Text>
            ) : (
                <FlatList
                    data={groups}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.groupItem}
                            onPress={() => handlePressGroup(item.id)}
                        >
                            <Text style={styles.groupName}>{item.name}</Text>
                            {item.city && <Text style={styles.cityName}>City: {item.city}</Text>}
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cityTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 10,
        color: '#333',
    },
    createButton: {
        backgroundColor: '#007bff',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignSelf: 'flex-end',
        marginBottom: 16,
    },
    createButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    noGroupsText: {
        textAlign: 'center',
        color: '#555',
        marginTop: 20,
    },
    groupItem: {
        padding: 14,
        backgroundColor: '#f9f9f9',
        marginBottom: 10,
        borderRadius: 8,
    },
    groupName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    cityName: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
});
