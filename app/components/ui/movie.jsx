import React, { useState } from "react";
import Link from "next/link";

export default function Movie({ id, title, poster, userGroups, addMovieToGroupWatchlistAction }) {
    const [selectedGroup, setSelectedGroup] = useState('');
    const [feedbackMessage, setFeedbackMessage] = useState({ type: '', message: '' });

    // Set initial selected group if userGroups are available and not already set
    React.useEffect(() => {
        if (userGroups && userGroups.length > 0 && !selectedGroup) {
            setSelectedGroup(userGroups[0].id);
        }
    }, [userGroups, selectedGroup]);

    const handleAddToGroupWatchlist = async () => {
        if (!selectedGroup) {
            setFeedbackMessage({ type: 'error', message: "Please select a group." });
            return;
        }
        setFeedbackMessage({ type: '', message: '' }); // Clear previous messages
        const result = await addMovieToGroupWatchlistAction(selectedGroup, id);
        if (result.success) {
            setFeedbackMessage({ type: 'success', message: result.message });
        } else {
            setFeedbackMessage({ type: 'error', message: result.error || result.message });
        }
    };

    return (
        <div className="bg-[#1c1c24] rounded-lg w-64 flex-none overflow-hidden">
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
                                onChange={(e) => setSelectedGroup(e.target.value)}
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
                                className="bg-blue-500 text-white px-2 py-2 rounded-md hover:bg-blue-600 transition-colors w-full"
                            >
                                Add to Group
                            </button>
                        </>
                    ) : (
                        <p className="text-xs text-gray-400">Join a group to add movies to its watchlist.</p>
                    )}
                </div>
                {feedbackMessage.message && (
                    <p className={`mt-2 text-xs ${feedbackMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                        {feedbackMessage.message}
                    </p>
                )}
            </div>
        </div>
    )
}