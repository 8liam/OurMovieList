"use client";

import { useState, useTransition } from "react";
import { inviteGroupMember } from "@/lib/actions"; // Adjust path as needed
import { Mail } from "lucide-react"
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
        <div className="bg-[#0E0E10] border border-[#1C1C21] rounded-xl w-full md:w-auto">
            <div className="p-4">
                <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-3 gap-2">

                    <input
                        type="email"
                        placeholder="Enter email to invite"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-[#1C1C21] border-[#0E0E10] border text-white placeholder-gray-400 px-2 text-left rounded-lg h-10 col-span-2 py-2 text-base"
                    />
                    <button
                        type="submit"
                        disabled={isPending}
                        className="bg-blue-950 rounded-lg h-10 px-4 flex items-center justify-center gap-1 flex-shrink-0 text-base"
                    >
                        {isPending ? "Inviting..." : "Invite"}
                    </button>

                </form>
            </div>
            {message && (
                <p className={`mt-3 text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
                    {message.text}
                </p>
            )}
        </div>
    );
} 