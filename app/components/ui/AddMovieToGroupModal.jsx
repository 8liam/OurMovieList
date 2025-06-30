"use client"

import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

export default function AddMovieToGroupModal({
    isOpen,
    onClose,
    movie,
    userGroups,
    addMovieToGroupWatchlistAction,
    onAddSuccess,
    addedMoviesTracker,
    handleClientMovieAdd,
}) {

    const currentAddedMoviesTracker = addedMoviesTracker instanceof Map ? addedMoviesTracker : new Map();

    const [selectedGroupIds, setSelectedGroupIds] = useState(() => {
        const initialSelected = {};
        if (userGroups && movie) {
            userGroups.forEach(group => {
                const isMovieInGroup = group.watchlistItems.some(item => item.movieId === String(movie.id)) ||
                    currentAddedMoviesTracker.get(String(movie.id))?.has(group.id);
                if (isMovieInGroup) {
                    initialSelected[group.id] = true;
                }
            });
        }
        return initialSelected;
    });

    const [confirmationMessage, setConfirmationMessage] = useState(null);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        const initialSelected = {};
        if (userGroups && movie) {
            userGroups.forEach(group => {
                const isMovieInGroup = group.watchlistItems.some(item => item.movieId === String(movie.id)) ||
                    currentAddedMoviesTracker.get(String(movie.id))?.has(group.id);
                if (isMovieInGroup) {
                    initialSelected[group.id] = true;
                }
            });
        }
        setSelectedGroupIds(initialSelected);
        setConfirmationMessage(null);
        setIsAdding(false);
    }, [isOpen, movie, userGroups, addedMoviesTracker]);

    const handleCheckboxChange = (groupId) => {
        setSelectedGroupIds((prev) => ({
            ...prev,
            [groupId]: !prev[groupId],
        }));
        setConfirmationMessage(null);
    };

    const handleAddToGroups = async () => {
        setIsAdding(true);
        setConfirmationMessage(null);
        let successfulAdds = 0;

        const groupsToProcess = userGroups.filter(group => selectedGroupIds[group.id]);

        const groupsToAdd = groupsToProcess.filter(group =>
            !currentAddedMoviesTracker.get(String(movie.id))?.has(group.id)
        );

        if (groupsToAdd.length === 0) {
            setConfirmationMessage("No new groups selected or movie already in all selected groups.");
            setIsAdding(false);
            return;
        }

        for (const group of groupsToAdd) {
            const result = await addMovieToGroupWatchlistAction(group.id, movie.id);
            if (result.success) {
                successfulAdds++;
                console.log("AddMovieToGroupModal: Calling handleClientMovieAdd with:", String(movie.id), group.id); // DEBUG LOG
                if (handleClientMovieAdd) { // Defensive check
                    handleClientMovieAdd(String(movie.id), group.id);
                } else {
                    console.error("AddMovieToGroupModal: handleClientMovieAdd is undefined when trying to call it."); // DEBUG ERROR
                }
                setSelectedGroupIds(prev => ({ ...prev, [group.id]: true }));
            } else {
                console.error(`Failed to add movie to group ${group.name}:`, result.error || result.message);
                setConfirmationMessage(`Failed to add to ${group.name}`);
            }
        }

        setIsAdding(false);

        if (successfulAdds > 0) {
            setConfirmationMessage(`Added to ${successfulAdds} group${successfulAdds > 1 ? 's' : ''}`);
            if (onAddSuccess) {
                onAddSuccess();
            }
        } else if (!confirmationMessage) {
            setConfirmationMessage("Failed to add to any selected groups.");
        }

        setTimeout(() => setConfirmationMessage(null), 3000);
    };

    if (!isOpen) return null;

    const hasGroupsToActuallyAdd = userGroups.some(group =>
        selectedGroupIds[group.id] && !(currentAddedMoviesTracker.get(String(movie.id))?.has(group.id))
    );

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-[#1c1c24] rounded-lg shadow-xl max-w-md w-full p-6 relative border border-[#1C1C21]">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
                    aria-label="Close modal"
                >
                    <X className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold text-white mb-4">Add &quot;{movie.title}&quot; to Groups</h2>

                {userGroups.length === 0 ? (
                    <p className="text-gray-400 mb-4">You need to join or create a group first.</p>
                ) : (
                    <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
                        {userGroups.map((group) => (
                            <label key={group.id} className="flex items-center text-white cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!!selectedGroupIds[group.id]}
                                    onChange={() => handleCheckboxChange(group.id)}
                                    className="form-checkbox h-5 w-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 mr-3"
                                />
                                <span>{group.name}</span>
                            </label>
                        ))}
                    </div>
                )}

                <button
                    onClick={handleAddToGroups}
                    disabled={isAdding || !hasGroupsToActuallyAdd}
                    className={`w-full font-bold py-3 px-4 rounded-md transition-colors ${confirmationMessage && confirmationMessage.startsWith("Added") ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'} ${isAdding || !hasGroupsToActuallyAdd ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isAdding ? (
                        "Adding..."
                    ) : confirmationMessage ? (
                        <span className="flex items-center justify-center gap-2">
                            {confirmationMessage.startsWith("Added") && <Check className="w-5 h-5" />}
                            {confirmationMessage}
                        </span>
                    ) : (
                        "Add to Selected Groups"
                    )}
                </button>
            </div>
        </div>
    );
} 