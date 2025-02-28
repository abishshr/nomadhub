// screens/DatingFeatureScreen.tsx
import React, { useEffect, useState } from 'react';
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
    TextInput
} from 'react-native';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import axios from 'axios';
import { db } from '../firebaseConfig';
import { OPENAI_API_KEY } from '@env';

// Import your question list
import { DATING_QUESTIONS, WizardQuestion } from '../questions/datingQuestions';

// Types for user profile and match results
type UserProfile = {
    uid: string;
    name?: string;
    enableDating?: boolean;
    age?: number;
    orientation?: string;
    city?: string;
    interests?: string[];
    [key: string]: any; // For any additional fields
};

type MatchResult = {
    uid: string;
    name?: string;
    reason?: string;
};

export default function DatingFeatureScreen() {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    // Local state for the "Enable Dating" toggle
    const [enableDatingLocal, setEnableDatingLocal] = useState<boolean>(false);

    // Storing ChatGPT matches
    const [topMatches, setTopMatches] = useState<MatchResult[]>([]);

    // For the wizard that collects missing data
    const [showWizard, setShowWizard] = useState(false);
    const [wizardStep, setWizardStep] = useState(0);
    const [wizardAnswers, setWizardAnswers] = useState<any>({});
    // We store the subset of questions the user actually needs to answer
    const [missingQuestions, setMissingQuestions] = useState<WizardQuestion[]>([]);

    // **Local state for the current question's typed input**:
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        if (!currentUser) {
            setError('No current user found. Please log in.');
            setLoading(false);
            return;
        }
        fetchUserData();
    }, [currentUser]);

    // Fetch the user doc from Firestore
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

            const datingEnabled = data.enableDating === true;
            setEnableDatingLocal(datingEnabled);
            setUserProfile(data);

            setLoading(false);
        } catch (err) {
            console.error('Error fetching user data:', err);
            setError('Error loading user data.');
            setLoading(false);
        }
    }

    /**
     * Toggle the Dating on/off
     */
    async function handleToggleDating(value: boolean) {
        setEnableDatingLocal(value);

        if (!userProfile) return;
        try {
            const userRef = doc(db, 'users', userProfile.uid);
            await updateDoc(userRef, { enableDating: value });
            userProfile.enableDating = value;

            if (value) {
                // If turned on, check which fields are missing
                const neededQuestions = getMissingQuestions(userProfile);
                if (neededQuestions.length > 0) {
                    // Show the wizard to fill missing data
                    setWizardAnswers({});
                    setWizardStep(0);
                    setMissingQuestions(neededQuestions);
                    setShowWizard(true);
                } else {
                    // All data present, fetch matches
                    fetchCandidatesAndMatches(userProfile);
                }
            } else {
                // turned off => clear matches
                setTopMatches([]);
            }
        } catch (err) {
            console.error('Error updating enableDating:', err);
            Alert.alert('Error', 'Could not update dating preference. Try again.');
            setEnableDatingLocal(!value);
        }
    }

    /**
     * Return only the questions for which the user is missing data
     */
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

    /**
     * When wizard is done, we update Firestore with the new answers,
     * then fetch matches
     */
    async function finishWizard() {
        if (!userProfile) return;

        // Merge wizardAnswers into userProfile
        const updatedProfile: any = { ...userProfile };
        for (const [k, v] of Object.entries(wizardAnswers)) {
            updatedProfile[k] = v;
        }

        try {
            const userRef = doc(db, 'users', userProfile.uid);
            await updateDoc(userRef, updatedProfile);
            setUserProfile(updatedProfile);
            setShowWizard(false);

            // Now fetch matches
            fetchCandidatesAndMatches(updatedProfile);
        } catch (err) {
            console.error('Error updating user profile after wizard:', err);
            Alert.alert('Error', 'Could not save your info. Try again.');
        }
    }

    /**
     * Fetch candidate profiles & get top matches from ChatGPT
     */
    async function fetchCandidatesAndMatches(user: UserProfile) {
        try {
            // fetch up to 20 other user docs
            const colRef = collection(db, 'users');
            const docsSnap = await getDocs(colRef);

            const cands: UserProfile[] = [];
            docsSnap.forEach((docSnap) => {
                if (docSnap.id !== user.uid) {
                    const cData = docSnap.data() as UserProfile;
                    cData.uid = docSnap.id;
                    cands.push(cData);
                }
            });
            const limited = cands.slice(0, 20);

            // call ChatGPT or your logic
            const matches = await getTopMatchesViaChatGPT(user, limited);
            setTopMatches(matches);
        } catch (err) {
            console.error('Error fetching candidates:', err);
        }
    }

    /**
     * Build the ChatGPT prompt
     */
    function buildPrompt(user: UserProfile, cands: UserProfile[]): string {
        const userText = `
Target user:
Name: ${user.name}
Age: ${user.age}
City: ${user.city}
Orientation: ${user.orientation}
Interests: ${Array.isArray(user.interests) ? user.interests.join(', ') : ''}
`.trim();

        let candidatesText = 'Candidates:\n';
        cands.forEach((c, idx) => {
            candidatesText += `
${idx + 1}) Name: ${c.name}, Age: ${c.age}, City: ${c.city}, 
    Orientation: ${c.orientation}, 
    Interests: ${Array.isArray(c.interests) ? c.interests.join(', ') : ''}
`.trim();
            candidatesText += '\n';
        });

        return `
You are a matchmaking assistant. 
Here is the target user's data:

${userText}

Below are candidate user profiles:

${candidatesText}

Please pick the top 5 most compatible candidates. Return a JSON array with "uid" and "reason".
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

            const content = response.data.choices[0].message.content;
            let parsed: MatchResult[] = [];
            try {
                parsed = JSON.parse(content);
            } catch (jsonErr) {
                console.warn('Could not parse JSON from ChatGPT. Full response:', content);
            }
            return parsed;
        } catch (err) {
            console.error('Error calling ChatGPT for matches:', err);
            return [];
        }
    }

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#007bff" />
                    <Text>Loading dating feature...</Text>
                </View>
            </SafeAreaView>
        );
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

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Toggle row */}
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
                    <>
                        <Text style={styles.headerTitle}>Your Top Matches</Text>
                        {topMatches.length === 0 ? (
                            <Text style={styles.infoText}>
                                No matches yet or missing data.
                            </Text>
                        ) : (
                            <FlatList
                                data={topMatches}
                                keyExtractor={(item, idx) => `match-${idx}`}
                                renderItem={({ item }) => (
                                    <View style={styles.matchItem}>
                                        <Text style={styles.matchName}>{item.name || item.uid}</Text>
                                        {item.reason && <Text style={styles.matchReason}>{item.reason}</Text>}
                                    </View>
                                )}
                            />
                        )}
                    </>
                )}

                {/* Modal Wizard for missing fields */}
                <Modal visible={showWizard} animationType="slide">
                    <View style={styles.wizardContainer}>
                        <Text style={styles.wizardTitle}>Quick Questions!</Text>
                        {renderWizardStep()}
                    </View>
                </Modal>
            </View>
        </SafeAreaView>
    );

    /**
     * Render the current wizard step from `missingQuestions`
     *
     * We use a local state `inputValue` to ensure each question starts blank.
     * When "Next" is pressed, we save `inputValue` into `wizardAnswers` and then reset `inputValue` to ''.
     */
    function renderWizardStep() {
        if (wizardStep >= missingQuestions.length) {
            // all questions answered
            return (
                <View>
                    <Text style={styles.wizardQuestion}>
                        All set! Let's find your matches!
                    </Text>
                    <TouchableOpacity
                        style={styles.wizardButton}
                        onPress={finishWizard}
                    >
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

                {/* CONTROLLED TEXTINPUT */}
                <TextInput
                    style={styles.wizardInput}
                    placeholder={placeholder}
                    value={inputValue}
                    onChangeText={(val) => {
                        setInputValue(val);
                    }}
                />

                <TouchableOpacity
                    style={styles.wizardButton}
                    onPress={() => {
                        // If there's a parse function, apply it
                        let parsedVal = inputValue;
                        if (parse) {
                            parsedVal = parse(inputValue);
                        }

                        // Store the answer in wizardAnswers
                        setWizardAnswers((prev) => ({ ...prev, [field]: parsedVal }));

                        // CLEAR inputValue for the next question
                        setInputValue('');

                        // Move to next question
                        setWizardStep(wizardStep + 1);
                    }}
                >
                    <Text style={styles.wizardButtonText}>Next</Text>
                </TouchableOpacity>
            </View>
        );
    }

    /**
     * Called once user finishes the last wizard question
     */
    async function finishWizard() {
        setShowWizard(false);
        if (!userProfile) return;

        try {
            const updatedProfile = { ...userProfile, ...wizardAnswers };
            const userRef = doc(db, 'users', userProfile.uid);
            await updateDoc(userRef, updatedProfile);
            setUserProfile(updatedProfile);

            // now fetch matches
            fetchCandidatesAndMatches(updatedProfile);
        } catch (err) {
            console.error('Error saving wizard answers:', err);
            Alert.alert('Error', 'Could not save your info. Try again.');
        }
    }
}

// Styles
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
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    toggleLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    infoText: {
        fontSize: 16,
        color: '#555',
        marginVertical: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 10,
        color: '#333',
    },
    matchItem: {
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 2 },
    },
    matchName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    matchReason: {
        fontSize: 14,
        color: '#555',
    },
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
    wizardButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    errorText: {
        color: 'red',
        fontSize: 16,
        textAlign: 'center',
        marginHorizontal: 20,
    },
});
