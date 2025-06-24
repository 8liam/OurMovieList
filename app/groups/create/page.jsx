"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { createGroupAction } from "../../../lib/actions"; // Import the server action

export default function CreateGroupPage() {
    const [groupName, setGroupName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null)
    const [successMessage, setSuccessMessage] = useState(null);
    const router = useRouter();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setUser(session?.user || null)
            }
        )

        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user || null)
        })

        // Check if user is logged in
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            console.log("Client-side session in CreateGroupPage:", session);
            if (!session) {
                router.push("/auth"); // Redirect to login if not authenticated
            }
        };
        checkUser();

        return () => {
            subscription.unsubscribe()
        }
    }, [router]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const result = await createGroupAction(groupName);

            if (result.success) {
                setSuccessMessage(`Group "${result.group.name}" created successfully!`);
                setGroupName(""); // Clear form
                router.push(`/groups/${result.group.id}`); // Redirect to the new group's page or a groups list
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            console.error("Error creating group:", err);
            setError(err.message || "Failed to create group.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-center">Create New Group</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="groupName" className="block text-gray-700 text-sm font-bold mb-2">
                            Group Name
                        </label>
                        <input
                            type="text"
                            id="groupName"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            placeholder="Enter group name"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                            disabled={loading}
                        >
                            {loading ? "Creating..." : "Create Group"}
                        </button>
                    </div>
                </form>

                {successMessage && (
                    <p className="mt-4 text-center text-green-600 text-sm">{successMessage}</p>
                )}
                {error && (
                    <p className="mt-4 text-center text-red-600 text-sm">{error}</p>
                )}
            </div>
        </div>
    );
} 