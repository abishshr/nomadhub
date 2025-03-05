// screens/CreateEventScreen.tsx
import React, { useState, useEffect } from 'react';
import {
    SafeAreaView,
    ScrollView,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as Location from 'expo-location';
import { fetchCityName } from '../api'; // your common function to get city from lat/lng
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';

export default function CreateEventScreen() {
    const navigation = useNavigation();
    const auth = getAuth();
    const currentUser = auth.currentUser;

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [locationInput, setLocationInput] = useState('');
    const [date, setDate] = useState(new Date());
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [userCity, setUserCity] = useState<string>('');

    // Request location permissions and fetch the current city.
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required.');
                return;
            }
            try {
                const loc = await Location.getCurrentPositionAsync({});
                const city = await fetchCityName(loc.coords.latitude, loc.coords.longitude);
                if (city) {
                    setUserCity(city);
                } else {
                    Alert.alert('Error', 'Could not determine city from your location.');
                }
            } catch (error) {
                console.error('Error fetching location:', error);
                Alert.alert('Error', 'Could not get current location.');
            }
        })();
    }, []);

    const showDatePicker = () => setDatePickerVisibility(true);
    const hideDatePicker = () => setDatePickerVisibility(false);
    const handleConfirm = (selectedDate: Date) => {
        setDate(selectedDate);
        hideDatePicker();
    };

    const handleCreateEvent = async () => {
        if (!title || !description || (!locationInput && !userCity)) {
            Alert.alert('Error', 'Please fill in all fields.');
            return;
        }
        if (!userCity) {
            Alert.alert('Error', 'City not determined from your location.');
            return;
        }
        try {
            const eventsRef = collection(db, 'chat', 'master', 'events');
            await addDoc(eventsRef, {
                title,
                description,
                location: locationInput || userCity,
                date,
                city: userCity,
                creatorId: currentUser?.uid,
                createdAt: serverTimestamp(),
                rsvps: [],
            });
            Alert.alert('Success', 'Event created successfully.');
            navigation.goBack();
        } catch (error) {
            console.error('Error creating event:', error);
            Alert.alert('Error', 'Could not create event.');
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                {/* Back Button */}
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.header}>Create New Event</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Event Title"
                    value={title}
                    onChangeText={setTitle}
                />
                <TextInput
                    style={[styles.input, { height: 150 }]}
                    placeholder="Event Description"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                />
                <TextInput
                    style={styles.input}
                    placeholder="Location (optional)"
                    value={locationInput}
                    onChangeText={setLocationInput}
                />
                <TouchableOpacity onPress={showDatePicker} style={styles.dateButton}>
                    <Text style={styles.dateButtonText}>Select Date & Time</Text>
                </TouchableOpacity>
                <DateTimePickerModal
                    isVisible={isDatePickerVisible}
                    mode="datetime"
                    onConfirm={handleConfirm}
                    onCancel={hideDatePicker}
                />
                <Text style={styles.selectedDate}>Selected: {date.toLocaleString()}</Text>
                <Text style={styles.cityText}>Detected City: {userCity ? userCity : 'Detecting...'}</Text>
                <TouchableOpacity style={styles.submitButton} onPress={handleCreateEvent}>
                    <Text style={styles.submitButtonText}>Create Event</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    container: { padding: 16, backgroundColor: '#fff', flexGrow: 1 },
    backButton: { marginBottom: 16 },
    backButtonText: { fontSize: 16, color: '#007bff', fontFamily: 'sans-serif' },
    header: { fontSize: 24, fontWeight: '700', marginBottom: 20, fontFamily: 'sans-serif', color: '#333' },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        fontFamily: 'sans-serif',
    },
    dateButton: {
        backgroundColor: '#007bff',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    dateButtonText: { color: '#fff', fontWeight: '600', fontFamily: 'sans-serif' },
    selectedDate: { fontSize: 16, marginBottom: 10, fontFamily: 'sans-serif' },
    cityText: { fontSize: 16, marginBottom: 20, fontFamily: 'sans-serif', color: '#555' },
    submitButton: { backgroundColor: '#28a745', padding: 14, borderRadius: 8, alignItems: 'center' },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', fontFamily: 'sans-serif' },
});
