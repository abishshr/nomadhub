// screens/GroupsListScreen.tsx
import React, { useEffect, useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    where,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

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
    const auth = getAuth();
    const currentUser = auth.currentUser;

    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [userCity, setUserCity] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            if (!currentUser) {
                Alert.alert('Error', 'No current user found. Are you logged in?');
                setLoading(false);
                return;
            }

            // 1) Read user doc to get city
            const uid = currentUser.uid;
            const userRef = doc(db, 'users', uid);
            try {
                const snapshot = await getDoc(userRef);
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    const city = data.city;
                    if (!city) {
                        Alert.alert('No City Found', 'We do not have a city stored for your account.');
                        setLoading(false);
                        return;
                    }
                    setUserCity(city);
                    // 2) fetch groups for that city
                    fetchCityGroups(city);
                } else {
                    Alert.alert('Error', 'User doc not found.');
                    setLoading(false);
                }
            } catch (err) {
                console.error('Error fetching user doc:', err);
                Alert.alert('Error', 'Could not load user city.');
                setLoading(false);
            }
        })();
    }, [currentUser]);

    /**
     * Query Firestore for groups where city == userCity
     */
    function fetchCityGroups(cityName: string) {
        const groupsRef = collection(db, 'chat', 'master', 'groups');
        const qCity = query(groupsRef, where('city', '==', cityName), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(
            qCity,
            async (snapshot) => {
                const list: Group[] = [];
                snapshot.forEach((docSnap) => {
                    list.push({ id: docSnap.id, ...docSnap.data() } as Group);
                });
                setGroups(list);
                setLoading(false);

                // If no groups exist for this city, create default
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
        navigation.navigate('CreateGroup' as never);
    };

    const handlePressGroup = (groupId: string) => {
        navigation.navigate('GroupChat' as never, { groupId } as never);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#007bff" />
                    <Text>Loading groups for your city...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!userCity) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loaderContainer}>
                    <Text>No city found in your profile.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
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
