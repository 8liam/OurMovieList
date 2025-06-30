"use client"
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { addMovieToGroupWatchlistAction } from "@/lib/actions";
import AddMovieToGroupModal from "./AddMovieToGroupModal";

export default function Movie({ id, title, poster, userGroups, loading: movieLoading, onWatchlistAddSuccess, addedMoviesTracker, handleClientMovieAdd }) {
    const [showModal, setShowModal] = useState(false);

    const handleOpenModal = () => {
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
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
        <div className="bg-[#1c1c24] rounded-lg w-full pb-[150%] relative group">
            <Link href={`/movie/${id}`} className="absolute inset-0">
                <img
                    alt={title || 'Movie Poster'}
                    className="object-cover rounded-lg w-full h-full"
                    src={poster ? `https://image.tmdb.org/t/p/w500${poster}` : '/no-image-available.png'}
                />
            </Link>
            {userGroups.length <= 0 ? (
                null
            ) : (
                <>
                    <div className="absolute bottom-2 left-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleOpenModal(); }}
                            className="bg-green-950/90 border border-green-600/50 hover:bg-green-700 text-white p-2 rounded-md shadow-lg duration-300 group/icon relative lg:opacity-0 group-hover:opacity-100"
                            aria-label="Add to Watchlist"
                        >
                            <Plus className="w-5 h-5" />
                            {/* Tooltip for Plus icon */}
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 lg:group-hover/icon:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
                                Add to Watchlist
                            </span>
                        </button>
                    </div>

                    <AddMovieToGroupModal
                        isOpen={showModal}
                        onClose={handleCloseModal}
                        movie={{ id, title, poster }}
                        userGroups={userGroups}
                        addMovieToGroupWatchlistAction={addMovieToGroupWatchlistAction}
                        onAddSuccess={onWatchlistAddSuccess}
                        addedMoviesTracker={addedMoviesTracker}
                        handleClientMovieAdd={handleClientMovieAdd}
                    />
                </>
            )}
        </div>
    );
}