"use client"
import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Check, Trash } from "lucide-react";

export default function WatchListMovie({
    id,
    watchlistItemId,
    groupId,
    markMovieAsWatched,
    removeMovieFromWatchlist,
    isWatched,
}) {
    const [movie, setMovie] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isMarkingWatched, startMarkTransition] = useTransition();
    const [isRemoving, startRemoveTransition] = useTransition();

    useEffect(() => {
        const fetchMovieDetails = async () => {
            try {
                const response = await fetch(`/api/movie/${id}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setMovie(data);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchMovieDetails();
        }
    }, [id]);

    const handleMarkWatched = async () => {
        startMarkTransition(async () => {
            const result = await markMovieAsWatched(watchlistItemId, groupId);
            if (!result.success) {
                console.error("Failed to mark as watched:", result.error);
                // Optionally, display a user-facing error message
            }
        });
    };

    const handleRemove = async () => {
        startRemoveTransition(async () => {
            const result = await removeMovieFromWatchlist(watchlistItemId, groupId);
            if (!result.success) {
                console.error("Failed to remove from watchlist:", result.error);
                // Optionally, display a user-facing error message
            }
        });
    };

    if (loading) {
        return (
            <div className="bg-gray-800 rounded-lg w-full pb-[150%] relative overflow-hidden animate-pulse">
                {/* Simplified skeleton to just mimic the image */}
                <div className="absolute inset-0 bg-gray-700"></div>
            </div>
        );
    }

    if (error) {
        return <div className="text-red-500">Error: {error.message}</div>;
    }

    if (!movie) {
        return <div className="text-gray-400">Movie not found.</div>;
    }

    return (
        <div className="bg-[#1c1c24] rounded-lg w-full pb-[150%] relative group">
            <Link href={`/movie/${id}`} className="absolute inset-0">
                <img
                    alt={movie.title || 'Movie Poster'}
                    className="object-cover rounded-t-lg w-full h-full"
                    src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '/no-image-available.png'}
                />
            </Link>

            {/* Overlay container for icons. Icons are always visible on mobile/tablet. On desktop, they are hidden until card hover. */}
            <div className="absolute inset-0 flex items-end p-2">

                {/* Check icon (bottom left) - only shown if movie is not watched */}
                {!isWatched && (
                    <div className="absolute bottom-2 left-2">
                        <button
                            onClick={handleMarkWatched}
                            disabled={isMarkingWatched || isRemoving}
                            className="bg-green-950/90 border border-green-600/50 hover:bg-green-700 text-white p-2 rounded-md shadow-lg duration-300 group/icon relative lg:opacity-0 group-hover:opacity-100"
                            aria-label="Mark as watched"
                        >
                            <Check className="w-5 h-5" />
                            {/* Tooltip for Check icon - hidden by default, visible on its parent button hover for large screens */}
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 lg:group-hover/icon:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
                                Watched
                            </span>
                        </button>
                    </div>
                )}

                {/* Bin icon (bottom right) */}
                <div className="absolute bottom-2 right-2">
                    <button
                        onClick={handleRemove}
                        disabled={isMarkingWatched || isRemoving} // Disable during any action
                        className="bg-red-950/90 border border-red-600/50 hover:bg-red-700  text-white p-2 rounded-md shadow-lg duration-300 group/icon relative lg:opacity-0 group-hover:opacity-100"
                        aria-label="Remove from watchlist"
                    >
                        <Trash className="w-5 h-5" />
                        {/* Tooltip for Bin icon - hidden by default, visible on its parent button hover for large screens */}
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 lg:group-hover/icon:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
                            Remove
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}