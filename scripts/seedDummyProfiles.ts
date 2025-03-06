// scripts/seedDummyProfiles.ts

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import serviceAccount from '../serviceAccountKey.json';

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    storageBucket: 'digitalnomadapp-139fa.firebasestorage.app', // Replace with your bucket name (without "gs://")
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Helper function: Upload a local image to Firebase Storage and return its download URL
async function uploadImage(filePath: string, destination: string): Promise<string> {
    await bucket.upload(filePath, {
        destination,
        metadata: {
            cacheControl: 'public,max-age=31536000',
        },
    });
    const file = bucket.file(destination);
    const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2491', // Far-future expiry date
    });
    return url;
}

// Define a type for a dummy profile (without uid so Firestore auto-generates it)
interface DummyProfile {
    name: string;
    age: number;
    city: string;
    orientation: string;
    interests: string[];
    gender: string;
    favoriteFood: string;
    funFact: string;
    favoriteMeme: string;
    favoriteApp: string;
    favoriteStreaming: string;
    favoriteSong: string;
    relationshipGoals: string;
    occupation: string;
    education: string;
    hobbies: string[];
    favoriteMovie: string;
    localPhotoPath: string;
    enableDating: boolean;
}

// Dummy profiles array including all fields from your dating questions
const dummyProfiles: DummyProfile[] = [
    {
        name: 'Alice',
        age: 28,
        city: 'San Francisco',
        orientation: 'Straight',
        interests: ['hiking', 'cooking', 'traveling'],
        gender: 'female',
        favoriteFood: 'Sushi',
        funFact: 'I can solve a Rubik’s Cube in 30s',
        favoriteMeme: 'Doge',
        favoriteApp: 'Instagram',
        favoriteStreaming: 'Netflix',
        favoriteSong: 'Blinding Lights',
        relationshipGoals: 'Serious',
        occupation: 'Software Engineer',
        education: "Bachelor's",
        hobbies: ['photography', 'yoga'],
        favoriteMovie: 'Inception',
        localPhotoPath: path.join(__dirname, '..', 'assets', 'dummyImages', 'alice.jpg'),
        enableDating: true,
    },
    {
        name: 'Bob',
        age: 30,
        city: 'San Francisco',
        orientation: 'Straight',
        interests: ['gaming', 'reading', 'movies'],
        gender: 'male',
        favoriteFood: 'Pizza',
        funFact: 'I once met my favorite actor in an elevator',
        favoriteMeme: 'Distracted Boyfriend',
        favoriteApp: 'TikTok',
        favoriteStreaming: 'Hulu',
        favoriteSong: 'Levitating',
        relationshipGoals: 'Casual',
        occupation: 'Graphic Designer',
        education: "Bachelor's",
        hobbies: ['skateboarding', 'blogging'],
        favoriteMovie: 'The Matrix',
        localPhotoPath: path.join(__dirname, '..', 'assets', 'dummyImages', 'bob.jpg'),
        enableDating: true,
    },
    {
        name: 'Charlie',
        age: 32,
        city: 'San Francisco',
        orientation: 'Gay',
        interests: ['music', 'art', 'dancing'],
        gender: 'male',
        favoriteFood: 'Burgers',
        funFact: 'I can juggle 5 balls at once',
        favoriteMeme: 'Pepe the Frog',
        favoriteApp: 'Twitter',
        favoriteStreaming: 'Disney+',
        favoriteSong: 'Shape of You',
        relationshipGoals: 'Friendship',
        occupation: 'Photographer',
        education: "Master's",
        hobbies: ['traveling', 'cooking'],
        favoriteMovie: 'Amélie',
        localPhotoPath: path.join(__dirname, '..', 'assets', 'dummyImages', 'charlie.jpg'),
        enableDating: true,
    },
    {
        name: 'Diana',
        age: 27,
        city: 'San Francisco',
        orientation: 'Bisexual',
        interests: ['yoga', 'cooking', 'traveling'],
        gender: 'female',
        favoriteFood: 'Pasta',
        funFact: 'I have a pet parrot that mimics phone calls',
        favoriteMeme: 'Woman Yelling at a Cat',
        favoriteApp: 'Facebook',
        favoriteStreaming: 'Amazon Prime',
        favoriteSong: 'Watermelon Sugar',
        relationshipGoals: 'Serious',
        occupation: 'Teacher',
        education: "Bachelor's",
        hobbies: ['reading', 'gardening'],
        favoriteMovie: 'The Notebook',
        localPhotoPath: path.join(__dirname, '..', 'assets', 'dummyImages', 'diana.jpg'),
        enableDating: true,
    },
    {
        name: 'Ethan',
        age: 29,
        city: 'San Francisco',
        orientation: 'Straight',
        interests: ['sports', 'technology', 'reading'],
        gender: 'male',
        favoriteFood: 'Burrito',
        funFact: 'I once ran a marathon in 4 hours',
        favoriteMeme: 'Grumpy Cat',
        favoriteApp: 'Snapchat',
        favoriteStreaming: 'YouTube',
        favoriteSong: 'Old Town Road',
        relationshipGoals: 'Casual',
        occupation: 'Entrepreneur',
        education: "Bachelor's",
        hobbies: ['cycling', 'cooking'],
        favoriteMovie: 'Fight Club',
        localPhotoPath: path.join(__dirname, '..', 'assets', 'dummyImages', 'ethan.jpg'),
        enableDating: true,
    },
];

async function seedProfiles() {
    for (const profile of dummyProfiles) {
        let photoURL = '';
        if (fs.existsSync(profile.localPhotoPath)) {
            const destination = `dummyProfiles/${profile.name.toLowerCase()}-${Date.now()}.jpg`;
            try {
                photoURL = await uploadImage(profile.localPhotoPath, destination);
                console.log(`Uploaded image for ${profile.name}`);
            } catch (uploadErr) {
                console.error(`Error uploading image for ${profile.name}:`, uploadErr);
            }
        } else {
            console.error(`Image not found for ${profile.name} at ${profile.localPhotoPath}`);
        }

        // Create a new object without the localPhotoPath field
        const { localPhotoPath, ...profileData } = { ...profile, photoURL };

        try {
            // Use add() so Firestore auto-generates a UID
            await db.collection('users').add(profileData);
            console.log(`Added profile for ${profile.name}`);
        } catch (error) {
            console.error(`Error adding profile for ${profile.name}:`, error);
        }
    }
    console.log('Dummy profiles seeded successfully.');
}

seedProfiles();
