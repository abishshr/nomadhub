// screens/EventDetailsScreen.tsx
import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import LoadingScreen from "./LoadingScreen";

export default function EventDetailsScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const { eventId } = route.params as { eventId: string };
    const auth = getAuth();
    const currentUser = auth.currentUser;

    const [event, setEvent] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchEvent() {
            try {
                const eventDoc = await getDoc(doc(db, 'chat', 'master', 'events', eventId));
                if (eventDoc.exists()) {
                    setEvent({ id: eventDoc.id, ...eventDoc.data() });
                } else {
                    Alert.alert('Error', 'Event not found');
                    navigation.goBack();
                }
            } catch (error) {
                console.error('Error fetching event:', error);
                Alert.alert('Error', 'Could not load event');
            } finally {
                setLoading(false);
            }
        }
        fetchEvent();
    }, [eventId]);

    const handleRSVP = async () => {
        try {
            await updateDoc(doc(db, 'chat', 'master', 'events', eventId), {
                rsvps: arrayUnion(currentUser?.uid),
            });
            Alert.alert('Success', 'RSVP recorded');
        } catch (error) {
            console.error('Error RSVPing:', error);
            Alert.alert('Error', 'Could not RSVP');
        }
    };

    if (loading || !event) {
        return <LoadingScreen />;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                {/* Back Button */}
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#007bff" />
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>

                <Text style={styles.title}>{event.title}</Text>
                <Text style={styles.description}>{event.description}</Text>
                <Text style={styles.detail}>Location: {event.location}</Text>
                <Text style={styles.detail}>
                    Date: {event.date ? new Date(event.date.seconds * 1000).toLocaleString() : ''}
                </Text>
                <TouchableOpacity style={styles.rsvpButton} onPress={handleRSVP}>
                    <Text style={styles.rsvpButtonText}>RSVP</Text>
                </TouchableOpacity>
                {event.creatorId === currentUser?.uid && (
                    <TouchableOpacity
                        style={styles.updateButton}
                        onPress={() => Alert.alert('Update', 'Update Event functionality here')}
                    >
                        <Text style={styles.updateButtonText}>Update Event</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    container: {
        padding: 16,
        backgroundColor: '#fff',
        flexGrow: 1
    },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButtonText: {
        fontSize: 16,
        color: '#007bff',
        marginLeft: 4,
        fontFamily: 'sans-serif',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 10,
        fontFamily: 'sans-serif'
    },
    description: {
        fontSize: 16,
        marginBottom: 10,
        fontFamily: 'sans-serif'
    },
    detail: {
        fontSize: 16,
        marginBottom: 5,
        fontFamily: 'sans-serif'
    },
    rsvpButton: {
        backgroundColor: '#007bff',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginVertical: 10
    },
    rsvpButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'sans-serif'
    },
    updateButton: {
        backgroundColor: '#28a745',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginVertical: 10
    },
    updateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'sans-serif'
    },
});
