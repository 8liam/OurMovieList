"use client";

import { useState, useTransition } from "react";
import { inviteGroupMember } from "@/lib/actions"; // Adjust path as needed

export default function AddMemberForm({ groupId, groupCreatorId, currentUserId }) {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState(null);
    const [isPending, startTransition] = useTransition();

    const handleInvite = async (event) => {
        event.preventDefault();
        setMessage(null);
        startTransition(async () => {
            const result = await inviteGroupMember(groupId, email);
            if (result.success) {
                setMessage({ type: "success", text: result.message });
                setEmail(""); // Clear form
            } else {
                setMessage({ type: "error", text: result.error });
            }
        });
    };

    if (currentUserId !== groupCreatorId) {
        return null; // Only show form to group creator
    }

    return (
        <div className="mt-8 p-6 bg-blue-50 rounded-lg shadow-inner">
            <h2 className="text-xl font-semibold mb-4 text-blue-800">Add New Member</h2>
            <form onSubmit={handleInvite} className="flex space-x-3">
                <input
                    type="email"
                    placeholder="Enter member's email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-grow px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    type="submit"
                    disabled={isPending}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isPending ? "Inviting..." : "Invite Member"}
                </button>
            </form>
            {message && (
                <p className={`mt-3 text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
                    {message.text}
                </p>
            )}
        </div>
    );
} 