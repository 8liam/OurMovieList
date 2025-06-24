import { NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY;

export async function GET(request) {
    try {
        if (!TMDB_API_KEY) {
            throw new Error("TMDB_API_KEY is not defined in environment variables.");
        }

        const { searchParams } = new URL(request.url);
        const movieId = searchParams.get('id');

        if (!movieId) {
            return NextResponse.json(
                { error: "Movie ID is required." },
                { status: 400 }
            );
        }

        const res = await fetch(
            `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}`
        );

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Failed to fetch movie details from TMDB: ${res.status} ${res.statusText} - ${errorText}`);
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error in movie details API route:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch movie details." },
            { status: 500 }
        );
    }
} 