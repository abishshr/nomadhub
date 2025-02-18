// firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Use your Firebase v11 config object here
const firebaseConfig = {
    apiKey: "AIzaSyAy7E-0Rlk63Odj-tO-Sy5brPf8Pj_zEgM",
    authDomain: "digitalnomadapp-139fa.firebaseapp.com",
    projectId: "digitalnomadapp-139fa",
    storageBucket: "digitalnomadapp-139fa.firebasestorage.app",
    messagingSenderId: "1043074810401",
    appId: "1:1043074810401:web:bc3ac709f719380e2e9960"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
