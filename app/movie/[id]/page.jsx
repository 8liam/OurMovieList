"use client"

import React, { useEffect, useState } from "react";
import { fetchUserGroupsAction, addMovieToGroupWatchlistAction } from "@/lib/actions"; // Import ONLY group-related actions


export default function MoviePage({ params }) {

    const [movie, setMovie] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userGroups, setUserGroups] = useState([]); // State to store user's groups
    const [selectedGroup, setSelectedGroup] = useState(''); // State for selected group in dropdown
    const [feedbackMessage, setFeedbackMessage] = useState({ type: '', message: '' }); // State for feedback messages

    const { id: movieId } = React.use(params);

    useEffect(() => {
        async function fetchMovieDetails() {
            setLoading(true);
            try {
                const res = await fetch(`/api/movie?id=${movieId}`);
                const data = await res.json();

                if (res.ok) {
                    setMovie(data); // Set the full movie data
                    console.log("Movie Details:", data);
                } else {
                    setMovie(null); // Set to null on error
                    console.error("Error fetching movie details:", data.error);
                }
            } catch (error) {
                setMovie(null); // Set to null on network/parsing error
                console.error("Network or parsing error:", error);
            }
            setLoading(false); // Ensure loading is set to false after fetch completes or fails
        }

        async function getGroups() {
            const result = await fetchUserGroupsAction();
            if (result.success) {
                setUserGroups(result.groups);
                if (result.groups.length > 0) {
                    setSelectedGroup(result.groups[0].id); // Select the first group by default
                }
            } else {
                console.error("Error fetching user groups:", result.error);
                setFeedbackMessage({ type: 'error', message: result.error });
            }
        }

        if (movieId) { // Only fetch if movieId is available
            fetchMovieDetails();
            getGroups(); // Fetch groups when movie details are being fetched
        }
    }, [movieId]); // Depend on movieId to re-fetch when it changes

    const handleAddToGroupWatchlist = async () => {
        if (!selectedGroup) {
            setFeedbackMessage({ type: 'error', message: "Please select a group." });
            return;
        }
        setFeedbackMessage({ type: '', message: '' }); // Clear previous messages
        const result = await addMovieToGroupWatchlistAction(selectedGroup, movieId);
        if (result.success) {
            setFeedbackMessage({ type: 'success', message: result.message });
        } else {
            setFeedbackMessage({ type: 'error', message: result.error || result.message });
        }
    };

    return (
        <div>
            {loading ? (
                <p>Loading...</p>
            ) : movie ? (
                <div className="p-4">
                    <h1 className="text-2xl font-bold mb-4">{movie.title}</h1>
                    <img
                        src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                        alt={movie.title}
                        className="rounded-lg mb-4"
                    />
                    <p className="text-gray-700 mb-4">{movie.overview}</p>
                    <p>Release Date: {movie.release_date}</p>
                    <p>Vote Average: {movie.vote_average}</p>

                    <div className="mt-6">
                        <h2 className="text-xl font-semibold mb-3">Add to Group Watchlist:</h2>
                        <div className="flex flex-col space-y-4">
                            {userGroups.length > 0 ? (
                                <div className="flex flex-col">
                                    <label htmlFor="group-select" className="mb-2 text-gray-700">Select Group:</label>
                                    <select
                                        id="group-select"
                                        value={selectedGroup}
                                        onChange={(e) => setSelectedGroup(e.target.value)}
                                        className="p-2 border border-gray-300 rounded-md bg-white text-gray-900"
                                    >
                                        {userGroups.map((group) => (
                                            <option key={group.id} value={group.id}>
                                                {group.name}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleAddToGroupWatchlist}
                                        className="mt-2 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
                                    >
                                        Add to Group Watchlist
                                    </button>
                                </div>
                            ) : (
                                <p className="text-gray-600">You are not part of any groups yet. Create or join a group to add movies to its watchlist.</p>
                            )}
                        </div>
                        {feedbackMessage.message && (
                            <p className={`mt-4 ${feedbackMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                {feedbackMessage.message}
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <p>Movie not found or an error occurred.</p>
            )}
        </div>
    );
}
