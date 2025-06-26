import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

export default function Movie({ id, title, poster, userGroups, addMovieToGroupWatchlistAction, loading: movieLoading }) {
    const [selectedGroup, setSelectedGroup] = useState('');
    const [isAdded, setIsAdded] = useState(false);

    // Set initial selected group and check if movie is already added
    useEffect(() => {
        if (userGroups && userGroups.length > 0) {
            // If no group is selected, default to the first one
            const initialGroup = selectedGroup ? userGroups.find(g => g.id === selectedGroup) : userGroups[0];
            if (initialGroup) {
                setSelectedGroup(initialGroup.id);
                const movieAlreadyInWatchlist = initialGroup.watchlistItems.some(item => item.movieId === String(id));
                setIsAdded(movieAlreadyInWatchlist);
            }
        }
    }, [userGroups, selectedGroup, id]);

    const handleAddToGroupWatchlist = async () => {
        if (!selectedGroup) {
            // This case should ideally not happen if initialGroup selection works, but as a fallback
            return;
        }
        setIsAdded(false); // Reset to allow adding again if user changes group
        const result = await addMovieToGroupWatchlistAction(selectedGroup, id);
        if (result.success) {
            setIsAdded(true);
        } else {
            // Optionally, handle error state or revert button text if not successful
            console.error("Failed to add movie to watchlist:", result.error || result.message);
        }
    };

    const handleGroupChange = (e) => {
        const newSelectedGroupId = e.target.value;
        setSelectedGroup(newSelectedGroupId);
        // Check if the movie is already in the newly selected group
        const selectedGroupData = userGroups.find(g => g.id === newSelectedGroupId);
        if (selectedGroupData) {
            const movieAlreadyInWatchlist = selectedGroupData.watchlistItems.some(item => item.movieId === String(id));
            setIsAdded(movieAlreadyInWatchlist);
        } else {
            setIsAdded(false);
        }
    };

    if (movieLoading) {
        return (
            <div className="bg-gray-800 rounded-lg w-full pb-[150%] relative overflow-hidden animate-pulse">
                {/* Simplified skeleton for the image */}
                <div className="absolute inset-0 bg-gray-700"></div>
            </div>
        );
    }

    return (
        <div className="bg-[#1c1c24] rounded-lg w-full flex-none overflow-hidden">
            <Link href={`/movie/${id}`}>
                <img
                    alt={title}
                    className="object-cover rounded-t-lg w-full"
                    src={poster}
                />
            </Link>
            <div className="p-2 text-sm">
                <div className="flex flex-col space-y-2">
                    {userGroups.length > 0 ? (
                        <>
                            <select
                                value={selectedGroup}
                                onChange={handleGroupChange}
                                className="p-2 border border-gray-300 rounded-md bg-white text-gray-900 w-full"
                            >
                                {userGroups.map((group) => (
                                    <option key={group.id} value={group.id}>
                                        {group.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={handleAddToGroupWatchlist}
                                disabled={isAdded}
                                className={`px-2 py-2 rounded-md transition-colors w-full flex items-center justify-center gap-1 ${isAdded ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                            >
                                {isAdded ? (
                                    <><Check className="w-4 h-4" /> Added to group</>
                                ) : (
                                    'Add to Group'
                                )}
                            </button>
                        </>
                    ) : (
                        <p className="text-xs text-gray-400">Join a group to add movies to its watchlist.</p>
                    )}
                </div>
            </div>
        </div>
    );
}