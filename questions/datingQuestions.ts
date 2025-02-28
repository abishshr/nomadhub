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
        placeholder: "City name..."
    },
    {
        field: 'orientation',
        question: "Who are you interested in? (guys/gals/anyone)?",
        placeholder: "e.g. 'anyone'"
    },
    {
        field: 'interests',
        question: "Got any fun hobbies or passions?",
        placeholder: "e.g. cooking, gaming, reading",
        parse: (val) => {
            return val
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
        },
    },
    // You can add more if you like:
    {
        field: 'favoriteFood',
        question: "What's your go-to comfort food?",
        placeholder: "Pizza, sushi, etc."
    },
    {
        field: 'funFact',
        question: "Tell us one fun fact about you!",
        placeholder: "I can solve a Rubik's Cube in 30s"
    },
];
