"use client"
import { useEffect, useState } from "react";
import Movie from "../components/ui/movie";
import { fetchUserGroupsAction, addMovieToGroupWatchlistAction } from "@/lib/actions"; // Import actions
import { TrendingUp } from "lucide-react";

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
                setMovies(data);
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

    const isLoading = loading || groupsLoading; // Combined loading state

    return (
        <section id="trending" className="xl:max-w-7xl lg:max-w-4xl md:max-w-2xl sm:max-w-xl max-w-sm mx-auto space-y-8 mt-6 md:mt-12">
            <div className="bg-[#0E0E10] border border-[#1C1C21] p-4 rounded-xl space-y-5">
                <h2 className="flex items-center gap-2 text-white text-2xl font-semibold">
                    <TrendingUp className="w-5 h-5" /> Trending This Week
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {isLoading ? (
                        // Render 5 skeleton movies when loading
                        Array.from({ length: 5 }).map((_, index) => (
                            <Movie key={index} loading={true} />
                        ))
                    ) : (
                        // Render actual movies when loaded
                        movies.map(movie => (
                            <Movie
                                id={movie.id}
                                key={movie.id}
                                title={movie.title}
                                poster={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                                description={movie.overview}
                                userGroups={userGroups}
                                addMovieToGroupWatchlistAction={addMovieToGroupWatchlistAction}
                                loading={false}
                            />
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}