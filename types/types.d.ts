/** types.d.ts */
export {};

declare global {
    interface Photo {
        photo_reference: string;
    }

    interface OpeningHours {
        open_now?: boolean;
    }

    interface Review {
        author_name: string;
        rating: number;
        text: string;
    }

    interface FitnessCenter {
        place_id: string;
        name: string;
        rating?: number;
        user_ratings_total?: number;
        price_level?: number;
        vicinity: string;
        photos?: Photo[];
        opening_hours?: OpeningHours;
        reviews: Review[]; // non-optional
        chatGPTRefinedReviews?: string;
    }
}
