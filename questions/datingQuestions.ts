// questions/datingQuestions.ts
export type WizardQuestion = {
    field: string;
    question: string;      // The fun, short question text
    placeholder: string;   // Placeholder for the TextInput
    parse?: (val: string) => any; // Optional parse function for age, interests, etc.
};

export const DATING_QUESTIONS: WizardQuestion[] = [
    {
        field: 'age',
        question: "Hey! How young are you feeling these days?",
        placeholder: "Enter your age...",
        parse: (val) => {
            const num = parseInt(val, 10);
            return isNaN(num) ? null : num;
        },
    },
    {
        field: 'city',
        question: "Where do you call home? (City)",
        placeholder: "City name...",
    },
    {
        field: 'orientation',
        question: "Who are you interested in? (guys/gals/anyone)?",
        placeholder: "e.g. 'anyone'",
    },
    {
        field: 'interests',
        question: "Got any fun hobbies or passions?",
        placeholder: "e.g. cooking, gaming, reading",
        parse: (val) =>
            val
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
    },
    {
        field: 'favoriteFood',
        question: "What's your go-to comfort food?",
        placeholder: "Pizza, sushi, etc.",
    },
    {
        field: 'funFact',
        question: "Tell us one fun fact about you!",
        placeholder: "I can solve a Rubik's Cube in 30s",
    },
    // New questions for creating a dating match profile:
    {
        field: 'relationshipGoals',
        question: "What are your relationship goals? (e.g., casual, serious, friendship)",
        placeholder: "Enter your relationship goals...",
    },
    {
        field: 'occupation',
        question: "What's your occupation?",
        placeholder: "e.g., Software Engineer, Teacher...",
    },
    {
        field: 'education',
        question: "What's your highest level of education?",
        placeholder: "e.g., Bachelor's, Master's, Ph.D.",
    },
    {
        field: 'hobbies',
        question: "What do you love to do in your free time?",
        placeholder: "e.g., hiking, painting, coding",
        parse: (val) =>
            val
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
    },
    {
        field: 'favoriteMovie',
        question: "What's your favorite movie?",
        placeholder: "e.g., Inception, The Matrix...",
    },
];
