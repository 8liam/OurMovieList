"use client"

import { useState, useEffect, useCallback } from "react";
import { useRouter } from 'next/navigation'; // Import useRouter
import Movie from "@/app/components/ui/movie";
import { SearchIcon } from "lucide-react";
import { fetchUserGroupsAction } from "@/lib/actions"; // Still import server action here for client use

export default function BrowseContent({
    initialSearchQuery,
    initialMovies,
    initialPage,
    initialUserGroups,
    moviesPerPage,
    initialError,
}) {
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
    const [movies, setMovies] = useState(initialMovies);
    const [page, setPage] = useState(initialPage);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(initialError);
    const [userGroups, setUserGroups] = useState(initialUserGroups);
    const [notAuthenticatedError, setNotAuthenticatedError] = useState(() => {
        // Initialize based on initialError if it's the specific auth error
        return initialError === "User not authenticated to fetch groups.";
    });

    // New state to track movies added during the client session for immediate feedback
    const [addedMoviesTracker, setAddedMoviesTracker] = useState(() => {
        const tracker = new Map();
        initialUserGroups.forEach(group => {
            group.watchlistItems.forEach(item => {
                if (!tracker.has(item.movieId)) {
                    tracker.set(item.movieId, new Set());
                }
                tracker.get(item.movieId).add(group.id);
            });
        });
        return tracker;
    });

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

    // Function to re-fetch movies and groups (will be passed to modal)
    // This now serves for eventual consistency after client-side immediate update
    const refreshData = useCallback(async () => {
        console.log("BrowseContent: refreshData called."); // DEBUG LOG
        setIsLoading(true);
        setError(null);
        setNotAuthenticatedError(false);
        try {
            // Re-fetch groups (can be a client-side call to a server action)
            const userGroupsResult = await fetchUserGroupsAction();
            if (userGroupsResult.success) {
                setUserGroups(userGroupsResult.groups);
                // Re-initialize tracker from fresh data
                const newTracker = new Map();
                userGroupsResult.groups.forEach(group => {
                    group.watchlistItems.forEach(item => {
                        if (!newTracker.has(item.movieId)) {
                            newTracker.set(item.movieId, new Set());
                        }
                        newTracker.get(item.movieId).add(item.groupId);
                    });
                });
                setAddedMoviesTracker(newTracker);
            } else {
                console.log("Error re-fetching user groups:", userGroupsResult.error);
                if (userGroupsResult.error === "User not authenticated to fetch groups.") {
                    setNotAuthenticatedError(true);
                } else {
                    setError(new Error(userGroupsResult.error));
                }
            }

            // Re-fetch movies based on current search/page
            const protocol = process.env.NODE_ENV === 'production' ? 'https://' : 'http://';
            const host = process.env.NEXT_PUBLIC_VERCEL_URL || 'localhost:3000';
            let apiUrl = '';
            if (searchQuery) {
                apiUrl = `${protocol}${host}/api/search-movies?query=${encodeURIComponent(searchQuery)}&page=${page}`;
            } else {
                apiUrl = `${protocol}${host}/api/trending?page=${page}`;
            }
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setMovies(data.results);
        } catch (err) {
            setError(err);
            console.error("Error refreshing data:", err);
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, page]);

    // Effect to re-fetch when search query or page changes
    useEffect(() => {
        // This useEffect will now be responsible for fetching data client-side
        // The initial data comes from server props, but subsequent changes trigger this.
        refreshData(); // Call refreshData here
    }, [searchQuery, page, refreshData]); // Depend on refreshData itself, and search query/page

    // Handle search form submission
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newQuery = formData.get('query') || '';
        setSearchQuery(newQuery);
        setPage(1); // Reset to first page on new search
        router.push(`/browse?query=${encodeURIComponent(newQuery)}&page=1`); // Update URL
    };

    // Handle pagination clicks
    const handlePageChange = (newPage) => {
        setPage(newPage);
        router.push(`/browse?query=${encodeURIComponent(searchQuery)}&page=${newPage}`); // Update URL
    };


    return (
        <div className="xl:max-w-7xl lg:max-w-4xl md:max-w-2xl sm:max-w-xl max-w-sm mx-auto space-y-8 mt-6 md:mt-12">

            <>

                {/* Search bar */}
                <form onSubmit={handleSearchSubmit} className="w-full flex items-center bg-[#1c1c24] rounded-lg border border-[#1C1C21] shadow-lg p-2">
                    <SearchIcon className="h-5 w-5 text-gray-400 mr-2 ml-2" />
                    <input
                        type="text"
                        name="query"
                        placeholder="Search for movies..."
                        defaultValue={initialSearchQuery} // Use initialSearchQuery
                        className="flex-grow p-2 bg-transparent text-white placeholder-gray-500 focus:outline-none"
                    />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Search</button>
                </form>

                <div className="bg-[#0E0E10] border border-[#1C1C21] p-4 rounded-xl space-y-5">
                    <h2 className="text-3xl font-bold text-white mb-4">
                        {searchQuery ? `Search Results for "${searchQuery}"` : "Trending This Week"}
                    </h2>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {isLoading ? (
                            Array.from({ length: moviesPerPage }).map((_, index) => (
                                <Movie key={index} loading={true} />
                            ))
                        ) : movies.length > 0 ? (
                            movies.map((movie) => (
                                <Movie
                                    key={movie.id}
                                    id={movie.id}
                                    title={movie.title}
                                    poster={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '/no-image-available.png'}
                                    userGroups={userGroups}
                                    onWatchlistAddSuccess={refreshData}
                                    addedMoviesTracker={addedMoviesTracker} // Pass tracker
                                    handleClientMovieAdd={handleClientMovieAdd} // Pass client add handler
                                />
                            ))
                        ) : (
                            <p className="text-gray-400 col-span-full">No movies found for your search.</p>
                        )}
                    </div>
                </div>

                {/* Pagination (basic example) */}
                <div className="flex justify-center items-center gap-4 py-4">
                    {page > 1 && (
                        <button onClick={() => handlePageChange(page - 1)} className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md">Previous</button>
                    )}
                    <span className="text-white">Page {page}</span>
                    {movies.length === moviesPerPage && (
                        <button onClick={() => handlePageChange(page + 1)} className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md">Next</button>
                    )}
                </div>
            </>
        </div>
    );
} 