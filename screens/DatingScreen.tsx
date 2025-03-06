// screens/DatingFeatureScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Alert,
    FlatList,
    Switch,
    Modal,
    TouchableOpacity,
    TextInput,
    Dimensions,
    Animated,
    Easing,
} from 'react-native';
import { Image } from 'react-native';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import axios from 'axios';
import { db } from '../firebaseConfig';
import { OPENAI_API_KEY } from '@env';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { DATING_QUESTIONS, WizardQuestion } from '../questions/datingQuestions';
import LoadingScreen from "./LoadingScreen";

const { width } = Dimensions.get('window');

export type UserProfile = {
    uid: string;
    name?: string;
    photoURL?: string;
    enableDating?: boolean;
    age?: number;
    orientation?: string;
    gender?: string;
    city?: string;
    interests?: string[];
    [key: string]: any;
};

export type MatchResult = {
    uid: string;
    name?: string;
    reason?: string;
};

// Custom Heart Loader Component
const HeartLoader = () => {
    const spinValue = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.timing(spinValue, {
                toValue: 1,
                duration: 1000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, [spinValue]);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="heart" size={48} color="#e74c3c" />
        </Animated.View>
    );
};

export default function DatingFeatureScreen() {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [enableDatingLocal, setEnableDatingLocal] = useState<boolean>(false);
    const [topMatches, setTopMatches] = useState<MatchResult[]>([]);
    const [matchedProfiles, setMatchedProfiles] = useState<UserProfile[]>([]);
    const [matchesLoading, setMatchesLoading] = useState<boolean>(false);
    const [showWizard, setShowWizard] = useState(false);
    const [wizardStep, setWizardStep] = useState(0);
    const [wizardAnswers, setWizardAnswers] = useState<any>({});
    const [missingQuestions, setMissingQuestions] = useState<WizardQuestion[]>([]);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        if (!currentUser) {
            setError('No current user found. Please log in.');
            setLoading(false);
            return;
        }
        fetchUserData();
    }, [currentUser]);

    async function fetchUserData() {
        try {
            const uid = currentUser!.uid;
            const userRef = doc(db, 'users', uid);
            const snap = await getDoc(userRef);
            if (!snap.exists()) {
                setError('User profile not found.');
                setLoading(false);
                return;
            }
            const data = snap.data() as UserProfile;
            data.uid = uid;
            setEnableDatingLocal(data.enableDating === true);
            setUserProfile(data);
            setLoading(false);
            if (data.enableDating === true) {
                await fetchCandidatesAndMatches(data);
            }
        } catch (err) {
            console.error('Error fetching user data:', err);
            setError('Error loading user data.');
            setLoading(false);
        }
    }

    async function handleToggleDating(value: boolean) {
        setEnableDatingLocal(value);
        if (!userProfile) return;
        try {
            const userRef = doc(db, 'users', userProfile.uid);
            await updateDoc(userRef, { enableDating: value });
            userProfile.enableDating = value;
            if (value) {
                const neededQuestions = getMissingQuestions(userProfile);
                if (neededQuestions.length > 0) {
                    setWizardAnswers({});
                    setWizardStep(0);
                    setMissingQuestions(neededQuestions);
                    setShowWizard(true);
                } else {
                    await fetchCandidatesAndMatches(userProfile);
                }
            } else {
                setTopMatches([]);
                setMatchedProfiles([]);
            }
        } catch (err) {
            console.error('Error updating enableDating:', err);
            Alert.alert('Error', 'Could not update dating preference. Try again.');
            setEnableDatingLocal(!value);
        }
    }

    function getMissingQuestions(user: UserProfile): WizardQuestion[] {
        const missing: WizardQuestion[] = [];
        DATING_QUESTIONS.forEach((q) => {
            const val = user[q.field];
            if (!val || (Array.isArray(val) && val.length === 0)) {
                missing.push(q);
            }
        });
        return missing;
    }

    async function finishWizard() {
        if (!userProfile) return;
        const updatedProfile: any = { ...userProfile, ...wizardAnswers };
        try {
            const userRef = doc(db, 'users', userProfile.uid);
            await updateDoc(userRef, updatedProfile);
            setUserProfile(updatedProfile);
            setShowWizard(false);
            await fetchCandidatesAndMatches(updatedProfile);
        } catch (err) {
            console.error('Error updating user profile after wizard:', err);
            Alert.alert('Error', 'Could not save your info. Try again.');
        }
    }

    async function fetchCandidatesAndMatches(user: UserProfile) {
        try {
            setMatchesLoading(true);
            const colRef = collection(db, 'users');
            const docsSnap = await getDocs(colRef);
            let candidates: UserProfile[] = [];
            docsSnap.forEach((docSnap) => {
                if (docSnap.id !== user.uid) {
                    const data = docSnap.data() as UserProfile;
                    data.uid = docSnap.id;
                    candidates.push(data);
                }
            });
            // Orientation-based filtering: if target user is straight, filter candidates to the opposite gender.
            if (
                user.orientation &&
                user.orientation.toLowerCase() === 'straight' &&
                user.gender
            ) {
                const targetGender = user.gender.toLowerCase();
                const oppositeGender = targetGender === 'male' ? 'female' : 'male';
                candidates = candidates.filter(
                    (candidate) =>
                        candidate.gender &&
                        candidate.gender.toLowerCase() === oppositeGender
                );
            }
            const limited = candidates.slice(0, 20);
            const matches = await getTopMatchesViaChatGPT(user, limited);
            setTopMatches(matches);
            const matchUids = Array.isArray(matches) ? matches.map((m) => m.uid) : [];
            const matched = await fetchMatchedProfiles(matchUids);
            setMatchedProfiles(matched);
            setMatchesLoading(false);
        } catch (err) {
            console.error('Error fetching candidates:', err);
            setMatchesLoading(false);
        }
    }

    async function fetchMatchedProfiles(matchUids: string[]): Promise<UserProfile[]> {
        const profiles = await Promise.all(
            matchUids.map(async (uid) => {
                const userRef = doc(db, 'users', uid);
                const snap = await getDoc(userRef);
                if (snap.exists()) {
                    const data = snap.data() as UserProfile;
                    data.uid = uid;
                    return data;
                }
                return null;
            })
        );
        return profiles.filter((p): p is UserProfile => p !== null);
    }

    const safeJoin = (arr: any): string =>
        Array.isArray(arr) ? arr.filter((item) => item != null).join(', ') : '';

    function buildPrompt(user: UserProfile, cands: UserProfile[]): string {
        const userText = `
Target user:
Name: ${String(user.name || '')}
Age: ${String(user.age || '')}
City: ${String(user.city || '')}
Orientation: ${String(user.orientation || '')}
Gender: ${String(user.gender || '')}
Interests: ${Array.isArray(user.interests) ? safeJoin(user.interests) : String(user.interests || '')}
    `.trim();

        let candidatesText = 'Candidates:\n';
        cands.forEach((c, idx) => {
            candidatesText += `
${idx + 1}) UID: ${String(c.uid)}, Name: ${String(c.name || '')}, Age: ${String(c.age || '')}, City: ${String(c.city || '')},
Orientation: ${String(c.orientation || '')},
Gender: ${String(c.gender || '')},
Interests: ${Array.isArray(c.interests) ? safeJoin(c.interests) : String(c.interests || '')}
      `.trim();
            candidatesText += '\n';
        });

        return `
You are a matchmaking assistant. 
Here is the target user's data:

${userText}

Below are candidate user profiles:

${candidatesText}

Please pick the top 5 most compatible candidates based on age, city, orientation, and shared interests. Return a JSON array with "uid" and "reason".
    `.trim();
    }

    async function getTopMatchesViaChatGPT(
        user: UserProfile,
        cands: UserProfile[]
    ): Promise<MatchResult[]> {
        if (!OPENAI_API_KEY) {
            console.warn('No OPENAI_API_KEY found. Returning empty matches.');
            return [];
        }
        const prompt = buildPrompt(user, cands);
        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: 'You are a helpful matchmaking assistant.' },
                        { role: 'user', content: prompt },
                    ],
                    temperature: 0.7,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${OPENAI_API_KEY}`,
                    },
                }
            );
            let content = response.data.choices[0].message.content;
            content = content.replace(/```json/g, '').replace(/```/g, '').trim();
            let parsed: any;
            try {
                parsed = JSON.parse(content);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.matches)) {
                    parsed = parsed.matches;
                }
                if (!Array.isArray(parsed)) {
                    parsed = [];
                }
            } catch (jsonErr) {
                parsed = [];
            }
            return parsed;
        } catch (err) {
            console.error('Error calling ChatGPT for matches:', err);
            return [];
        }
    }

    function renderWizardStep() {
        if (wizardStep >= missingQuestions.length) {
            return (
                <View>
                    <Text style={styles.wizardQuestion}>All set! Let's find your matches!</Text>
                    <TouchableOpacity style={styles.wizardButton} onPress={finishWizard}>
                        <Text style={styles.wizardButtonText}>Done</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        const questionObj = missingQuestions[wizardStep];
        const { field, question, placeholder, parse } = questionObj;
        return (
            <View>
                <Text style={styles.wizardQuestion}>{question}</Text>
                <TextInput
                    style={styles.wizardInput}
                    placeholder={placeholder}
                    value={inputValue}
                    onChangeText={(val) => setInputValue(val)}
                />
                <TouchableOpacity
                    style={styles.wizardButton}
                    onPress={() => {
                        let parsedVal = inputValue;
                        if (parse) {
                            parsedVal = parse(inputValue);
                        }
                        setWizardAnswers((prev) => ({ ...prev, [field]: parsedVal }));
                        setInputValue('');
                        setWizardStep(wizardStep + 1);
                    }}
                >
                    <Text style={styles.wizardButtonText}>Next</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (loading) {
        return <LoadingScreen />;
    }

    if (error) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loaderContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            </SafeAreaView>
        );
    }

    const renderHeader = () => (
        <View>
            <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Enable Dating</Text>
                <Switch
                    value={enableDatingLocal}
                    onValueChange={(val) => handleToggleDating(val)}
                />
            </View>
            {!enableDatingLocal && (
                <Text style={styles.infoText}>
                    Dating is off. Turn it on if you're ready to find matches!
                </Text>
            )}
            {enableDatingLocal && (
                <Text style={styles.headerTitle}>Your Top Matches</Text>
            )}
            {matchesLoading && (
                <View style={styles.loaderContainer}>
                    <HeartLoader />
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <FlatList
                data={matchedProfiles}
                keyExtractor={(item) => item.uid}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                ListHeaderComponent={renderHeader}
                renderItem={({ item }) => (
                    <View style={styles.profileCard}>
                        <View style={styles.profileImageContainer}>
                            {item.photoURL ? (
                                <Image source={{ uri: item.photoURL }} style={styles.profileImage} />
                            ) : (
                                <Ionicons name="person-circle-outline" size={48} color="#ccc" />
                            )}
                        </View>
                        <Text style={styles.profileName}>{item.name || item.uid}</Text>
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.infoText}>No matches yet or missing data.</Text>}
                contentContainerStyle={styles.mainContainer}
            />
            <Modal visible={showWizard} animationType="slide">
                <View style={styles.wizardContainer}>
                    <Text style={styles.wizardTitle}>Quick Questions!</Text>
                    {renderWizardStep()}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    mainContainer: { padding: 16 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    toggleLabel: { fontSize: 18, fontWeight: '600', color: '#333' },
    infoText: { fontSize: 16, color: '#555', marginVertical: 10, textAlign: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '600', marginBottom: 10, color: '#333', textAlign: 'center' },
    columnWrapper: { justifyContent: 'space-between', marginBottom: 16 },
    profileCard: {
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        width: (width - 48) / 2,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    profileImageContainer: {
        width: 80,
        height: 80,
        borderRadius: 10,
        backgroundColor: '#fff',
        overflow: 'hidden',
        marginBottom: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    profileName: { fontSize: 16, fontWeight: '600', color: '#333', textAlign: 'center' },
    wizardContainer: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
        justifyContent: 'center',
    },
    wizardTitle: {
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    wizardQuestion: {
        fontSize: 18,
        color: '#333',
        marginBottom: 12,
        textAlign: 'center',
    },
    wizardInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#333',
        marginBottom: 20,
    },
    wizardButton: {
        backgroundColor: '#007bff',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignSelf: 'center',
    },
    wizardButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
