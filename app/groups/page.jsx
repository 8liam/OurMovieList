"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchUserGroupsAction } from "@/lib/actions"; // Import the server action

export default function Groups() {
    const [userGroups, setUserGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function getGroups() {
            setLoading(true);
            setError(null);
            try {
                const result = await fetchUserGroupsAction();
                if (result.success) {
                    // The server action already filters for accepted groups, so no further filtering needed here.
                    setUserGroups(result.groups);
                } else {
                    setError(result.error || "Failed to fetch groups.");
                }
            } catch (err) {
                setError(err.message || "An unexpected error occurred.");
            } finally {
                setLoading(false);
            }
        }

        getGroups();
    }, []);

    if (loading) {
        return (
            <section id="groups" className="p-8">
                <p>Loading groups...</p>
            </section>
        );
    }

    if (error) {
        return (
            <section id="groups" className="p-8">
                <p className="text-red-600">Error: {error}</p>
            </section>
        );
    }

    return (
        <section id="groups" className="min-h-screen">
            <div className="text-white py-8 xl:px-24 px-4 mx-auto p-6 rounded-lg shadow-md">
                <h1 className="text-3xl font-bold mb-6 ">Your Groups</h1>
                {userGroups.length > 0 ? (
                    <ul className="space-y-4 grid grid-cols-3">
                        {userGroups.map((group) => (
                            <li key={group.id} className="bg-[#1c1c24] p-4 rounded-md shadow-sm  transition-colors">
                                <Link href={`/groups/${group.id}`} className="block hover:underline">
                                    <h2 className="text-xl font-semibold mb-1">{group.name}</h2>
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-700">You are not a member of any groups yet. Create or join a group to see it here!</p>
                )}
            </div>
        </section>
    );
}