"use client"
import { useEffect, useState } from "react";
import Movie from "../components/ui/movie";
import { fetchUserGroupsAction, addMovieToGroupWatchlistAction } from "@/lib/actions"; // Import actions

// const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY; // No longer needed on client

export default function Trending() {
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userGroups, setUserGroups] = useState([]); // State for user's groups
    const [groupsLoading, setGroupsLoading] = useState(true); // Loading state for groups

    useEffect(() => {
        async function fetchTrending() {
            setLoading(true);
            try {
                const res = await fetch(
                    `/api/trending` // Fetch from your new internal API endpoint
                );
                const data = await res.json();
                setMovies(data); // Data is already sliced to 5 on the server
            } catch (err) {
                setMovies([]);
                console.error("Error fetching trending movies:", err);
            }
            setLoading(false);
        }

        async function getGroups() {
            setGroupsLoading(true);
            const result = await fetchUserGroupsAction();
            if (result.success) {
                setUserGroups(result.groups);
            } else {
                console.error("Error fetching user groups:", result.error);
            }
            setGroupsLoading(false);
        }

        fetchTrending();
        getGroups(); // Fetch groups on component mount
    }, []);

    return (
        <section id="trending">
            <h2 className="text-xl font-bold mb-4">Trending This Week</h2>
            {(loading || groupsLoading) ? (
                <p>Loading movies.</p>
            ) : (
                <div className="grid grid-cols-2 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-2">
                    {movies.map((movie) => (
                        <Movie
                            id={movie.id}
                            key={movie.id}
                            title={movie.title}
                            poster={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                            description={movie.overview}
                            userGroups={userGroups} // Pass user groups
                            addMovieToGroupWatchlistAction={addMovieToGroupWatchlistAction} // Pass the action
                        />
                    ))}
                </div>
            )}
        </section>
    );
}