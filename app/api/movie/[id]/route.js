import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const { id } = params;
    const TMDB_API_KEY = process.env.TMDB_API_KEY;

    if (!TMDB_API_KEY) {
        return NextResponse.json({ error: 'TMDB API key not configured.' }, { status: 500 });
    }

    if (!id) {
        return NextResponse.json({ error: 'Movie ID is required.' }, { status: 400 });
    }

    const movieDetailsUrl = `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}`;

    try {
        const response = await fetch(movieDetailsUrl);
        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json({ error: 'Movie not found.' }, { status: 404 });
            }
            throw new Error(`Failed to fetch movie details: ${response.statusText}`);
        }
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching movie details from TMDB:", error);
        return NextResponse.json({ error: 'Failed to fetch movie details.', details: error.message }, { status: 500 });
    }
} 