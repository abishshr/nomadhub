// screens/EditProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, Alert
} from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebaseConfig';

export default function EditProfileScreen({ navigation }: any) {
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [city, setCity] = useState('');

    const auth = getAuth();
    const uid = auth.currentUser?.uid;

    useEffect(() => {
        if (!uid) return;
        const userRef = doc(db, 'users', uid);
        getDoc(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setName(data.name || '');
                setBio(data.bio || '');
                setCity(data.city || '');
            }
        }).catch((err) => {
            console.error('Error fetching user doc:', err);
        });
    }, [uid]);

    const handleSave = async () => {
        if (!uid) return;
        const userRef = doc(db, 'users', uid);
        try {
            await updateDoc(userRef, {
                name: name.trim(),
                bio: bio.trim(),
                city: city.trim(),
            });
            Alert.alert('Success', 'Profile updated.');
            navigation.goBack();
        } catch (err) {
            console.error('Error updating profile:', err);
            Alert.alert('Error', 'Could not update profile.');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} />

            <Text style={styles.label}>City</Text>
            <TextInput style={styles.input} value={city} onChangeText={setCity} />

            <Text style={styles.label}>Bio</Text>
            <TextInput
                style={[styles.input, { height: 80 }]}
                value={bio}
                onChangeText={setBio}
                multiline
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
        </View>
    );
}

// ... styling omitted
