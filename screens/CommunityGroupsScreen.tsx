// screens/CommunityGroupsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    where,
    addDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getGroupIcon } from '../utils/groupIcons';

const DEFAULT_GROUPS = [
    () => ({ name: 'General Chat', icon: 'chatbubble-ellipses-outline' }),
    () => ({ name: 'Foodies', icon: 'foodies' }), // custom key for Foodies
    () => ({ name: 'Nightlife', icon: 'nightlife' }), // custom key for Nightlife
    () => ({ name: 'Events', icon: 'calendar-outline' }),
];

type Group = {
    id: string;
    name: string;
    icon?: string;
    createdAt?: any;
};

type EventItem = {
    id: string;
    title: string;
    description: string;
    date: any;
    city: string;
    rsvps?: string[];
};

const { width } = Dimensions.get('window');
const CARD_MARGIN = 8;
const CARD_WIDTH = (width - CARD_MARGIN * 3) / 2;

function fetchCityGroups(
    cityName: string,
    setGroups: (groups: Group[]) => void,
    setLoading: (loading: boolean) => void
) {
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

async function createDefaultGroupsForCity(city: string) {
    try {
        const groupsRef = collection(db, 'chat', 'master', 'groups');
        for (const buildGroup of DEFAULT_GROUPS) {
            const groupData = buildGroup();
            await addDoc(groupsRef, {
                ...groupData,
                city, // stored for filtering
                createdAt: serverTimestamp(),
            });
        }
        console.log(`Default groups for '${city}' created.`);
    } catch (err) {
        console.error('Error creating default groups:', err);
        Alert.alert('Error', 'Could not create default groups. Check permissions.');
    }
}

function fetchCityEvents(
    cityName: string,
    setEvents: (events: EventItem[]) => void,
    setEventsLoading: (loading: boolean) => void
) {
    const eventsRef = collection(db, 'chat', 'master', 'events');
    const qEvents = query(eventsRef, where('city', '==', cityName), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(
        qEvents,
        (snapshot) => {
            const list: EventItem[] = [];
            snapshot.forEach((docSnap) => {
                list.push({ id: docSnap.id, ...docSnap.data() } as EventItem);
            });
            setEvents(list);
            setEventsLoading(false);
        },
        (error) => {
            console.error('Error fetching events:', error);
            setEventsLoading(false);
        }
    );
    return unsubscribe;
}

export default function CommunityGroupsScreen() {
    const navigation = useNavigation();
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const [groups, setGroups] = useState<Group[]>([]);
    const [events, setEvents] = useState<EventItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [eventsLoading, setEventsLoading] = useState(true);
    const [userCity, setUserCity] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            if (!currentUser) {
                Alert.alert('Error', 'No current user found. Are you logged in?');
                setLoading(false);
                return;
            }
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
                    fetchCityGroups(city, setGroups, setLoading);
                    fetchCityEvents(city, setEvents, setEventsLoading);
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

    const handleCreateGroup = () => {
        navigation.navigate('CreateGroup' as never);
    };

    const handlePressGroup = (groupId: string) => {
        navigation.navigate('GroupChat' as never, { groupId } as never);
    };

    const handleCreateEvent = () => {
        navigation.navigate('CreateEvent' as never);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#007bff" />
                    <Text>Loading...</Text>
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
                {/* Top Header with City Name */}
                <Text style={styles.cityHeader}>{userCity}</Text>

                {/* Chat Groups Section Header */}
                <View style={styles.sectionHeaderContainer}>
                    <Text style={styles.sectionHeader}>Chat Groups</Text>
                    <TouchableOpacity style={styles.createIconButton} onPress={handleCreateGroup}>
                        <Ionicons name="add-circle-outline" size={32} color="#007bff" />
                    </TouchableOpacity>
                </View>
                {groups.length === 0 ? (
                    <Text style={styles.placeholderText}>No chat groups yet...</Text>
                ) : (
                    <FlatList
                        key="groupsGrid"
                        data={groups}
                        keyExtractor={(item) => item.id}
                        numColumns={2}
                        columnWrapperStyle={styles.columnWrapper}
                        renderItem={({ item }) => {
                            const groupName = item.name.replace(/\s*\(.*\)$/, '');
                            return (
                                <TouchableOpacity style={styles.card} onPress={() => handlePressGroup(item.id)}>
                                    {getGroupIcon(groupName, item.icon)}
                                    <Text style={styles.cardTitle}>{groupName}</Text>
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}

                {/* Upcoming Events Section Header */}
                <View style={styles.divider} />
                <View style={styles.sectionHeaderContainer}>
                    <Text style={styles.sectionHeader}>Upcoming Events</Text>
                    <TouchableOpacity style={styles.createIconButton} onPress={handleCreateEvent}>
                        <Ionicons name="add-circle-outline" size={32} color="#28a745" />
                    </TouchableOpacity>
                </View>
                {eventsLoading ? (
                    <ActivityIndicator size="small" color="#007bff" />
                ) : events.length === 0 ? (
                    <Text style={styles.placeholderText}>No upcoming events yet...</Text>
                ) : (
                    <FlatList
                        key="eventsList"
                        data={events}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.eventCard}
                                onPress={() =>
                                    navigation.navigate('EventDetails' as never, { eventId: item.id } as never)
                                }
                            >
                                <Ionicons name="calendar" size={32} color="#28a745" style={styles.cardIcon} />
                                <View style={styles.eventInfo}>
                                    <Text style={styles.eventTitle}>{item.title}</Text>
                                    <Text style={styles.eventDetail}>
                                        {item.date ? new Date(item.date.seconds * 1000).toLocaleString() : ''}
                                    </Text>
                                    <Text style={styles.eventDetail}>
                                        RSVPs: {item.rsvps ? item.rsvps.length : 0}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    container: { flex: 1, padding: 16 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    cityHeader: {
        fontSize: 28,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 20,
        fontFamily: 'sans-serif',
        color: '#333',
    },
    sectionHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionHeader: {
        fontSize: 22,
        fontWeight: '700',
        color: '#333',
        fontFamily: 'sans-serif',
    },
    createIconButton: {
        padding: 4,
    },
    placeholderText: {
        textAlign: 'center',
        color: '#555',
        marginVertical: 20,
        fontFamily: 'sans-serif',
    },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
    columnWrapper: { justifyContent: 'space-between', marginBottom: CARD_MARGIN },
    card: {
        backgroundColor: '#f9f9f9',
        width: CARD_WIDTH,
        padding: 12,
        borderRadius: 10,
        marginBottom: CARD_MARGIN,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    cardIcon: { marginBottom: 8 },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        textAlign: 'center',
        fontFamily: 'sans-serif',
    },
    // Event card (list layout)
    eventCard: {
        flexDirection: 'row',
        backgroundColor: '#f9f9f9',
        padding: 12,
        borderRadius: 10,
        marginBottom: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    eventInfo: {
        marginLeft: 12,
        flex: 1,
    },
    eventTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
        fontFamily: 'sans-serif',
    },
    eventDetail: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'sans-serif',
    },
});
