"use client"
import { useEffect, useState, useCallback } from "react";
import Movie from "../components/ui/movie";
import { fetchUserGroupsAction, addMovieToGroupWatchlistAction } from "@/lib/actions"; // Import actions
import { TrendingUp } from "lucide-react";


export default function Trending() {
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userGroups, setUserGroups] = useState([]); // State for user's groups
    const [groupsLoading, setGroupsLoading] = useState(true); // Loading state for groups
    const [notAuthenticatedError, setNotAuthenticatedError] = useState(false); // Restore state

    // New state to track movies added during the client session for immediate feedback
    const [addedMoviesTracker, setAddedMoviesTracker] = useState(new Map());

    // Callback to update the client-side tracker immediately after a successful add
    const handleClientMovieAdd = useCallback((movieId, groupId) => {
        setAddedMoviesTracker(prevTracker => {
            const newTracker = new Map(prevTracker);
            if (!newTracker.has(movieId)) {
                newTracker.set(movieId, new Set());
            }
            newTracker.get(movieId).add(groupId);
            return newTracker;
        });
    }, []);

    const getGroups = useCallback(async () => {
        setGroupsLoading(true);
        setNotAuthenticatedError(false); // Reset error on new fetch attempt
        const result = await fetchUserGroupsAction();
        if (result.success) {
            setUserGroups(result.groups);
            // Re-initialize tracker from fresh data
            const newTracker = new Map();
            result.groups.forEach(group => {
                group.watchlistItems.forEach(item => {
                    if (!newTracker.has(item.movieId)) {
                        newTracker.set(item.movieId, new Set());
                    }
                    newTracker.get(item.movieId).add(item.groupId);
                });
            });
            setAddedMoviesTracker(newTracker);
        } else {
            console.log("Error fetching user groups:", result.error);
            if (result.error === "User not authenticated to fetch groups.") {
                setNotAuthenticatedError(true);
            }
        }
        setGroupsLoading(false);
    }, []); // No dependencies for initial fetch, will be called on mount

    useEffect(() => {
        async function fetchTrending() {
            setLoading(true);
            try {
                const res = await fetch(
                    `/api/trending` // Fetch from your new internal API endpoint
                );
                const data = await res.json();
                setMovies(data.results);
            } catch (err) {
                setMovies([]);
                console.error("Error fetching trending movies:", err);
            }
            setLoading(false);
        }

        fetchTrending();
        getGroups(); // Fetch groups on component mount and on refresh
    }, [getGroups]); // Depend on getGroups so it re-runs when getGroups memoization changes

    const isLoading = loading || groupsLoading;

    return (
        <section id="trending" className="xl:max-w-7xl lg:max-w-4xl md:max-w-2xl sm:max-w-xl max-w-sm mx-auto space-y-8 mt-6 md:mt-12">
            <div className="bg-[#0E0E10] border border-[#1C1C21] p-4 rounded-xl space-y-5">
                <>
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
                                    onWatchlistAddSuccess={getGroups}
                                    addedMoviesTracker={addedMoviesTracker}
                                    handleClientMovieAdd={handleClientMovieAdd}
                                />
                            ))
                        )}
                    </div>
                </>
            </div>
        </section>
    );
}