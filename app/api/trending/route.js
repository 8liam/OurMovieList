import { NextResponse } from 'next/server';

const TMDB_API_KEY = process.env.TMDB_API_KEY;

export async function GET(request) {
    const { searchParams } = request.nextUrl;
    const page = searchParams.get('page') || 1;
    try {
        if (!TMDB_API_KEY) {
            throw new Error("TMDB_API_KEY is not defined in environment variables.");
        }

        const res = await fetch(
            `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}&page=${page}`
        );

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Failed to fetch trending movies from TMDB: ${res.status} ${res.statusText} - ${errorText}`);
        }

        const data = await res.json();
        const trendingMovies = data.results;

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error in trending API route:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch trending movies." },
            { status: 500 }
        );
    }
} 