import { NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY;

export async function GET() {
    try {
        if (!TMDB_API_KEY) {
            throw new Error("TMDB_API_KEY is not defined in environment variables.");
        }

        const res = await fetch(
            `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}`
        );

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Failed to fetch trending movies from TMDB: ${res.status} ${res.statusText} - ${errorText}`);
        }

        const data = await res.json();
        const trendingMovies = data.results.slice(0, 5);

        return NextResponse.json(trendingMovies);
    } catch (error) {
        console.error("Error in trending API route:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch trending movies." },
            { status: 500 }
        );
    }
} 