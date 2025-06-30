"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchUserGroupsAction } from "@/lib/actions"; // Import the server action
import { supabase } from "../../lib/supabaseClient"
import { Plus } from "lucide-react";


export default function Groups({ currentUser }) {
    const [userGroups, setUserGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(currentUser)


    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setUser(session?.user || null)
            }
        )

        return () => {
            subscription.unsubscribe()
        }
    }, [])

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
            <section id="create-groups" className="xl:max-w-7xl lg:max-w-4xl md:max-w-2xl sm:max-w-xl max-w-sm mx-auto space-y-8 mt-6 md:mt-12">
                <div className="bg-[#0E0E10] border border-[#1C1C21] p-4 rounded-xl space-y-5">
                    {/* Skeleton for "Your Groups" title */}
                    <div className="h-9 w-64 mb-6 bg-[#1c1c24] animate-pulse rounded"></div>

                    <div className="gap-2 grid grid-cols-3">
                        {/* Single skeleton item */}
                        <div className="bg-[#1c1c24] p-4 rounded-md shadow-sm animate-pulse transition-colors h-16">

                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (!user) {
        return (
            <section id="create-groups" className="xl:max-w-7xl lg:max-w-4xl md:max-w-2xl sm:max-w-xl max-w-sm mx-auto space-y-8 mt-6 md:mt-12">
                <div className="bg-[#0E0E10] border border-[#1C1C21] p-4 rounded-xl space-y-5">
                    <h1 className="text-3xl font-bold mb-6 ">Sign Up to Join Groups</h1>
                    <div className="gap-2 grid grid-cols-3">
                        <Link href={`/auth`} className="bg-[#1c1c24] p-4 rounded-md shadow-sm  transition-colors">
                            <h2 className="text-xl font-semibold mb-1 flex gap-2 items-center"><Plus />Sign Up</h2>
                        </Link>
                    </div>
                </div>
            </section>
        )
    }

    if (user) {
        return (
            <section id="groups" className="xl:max-w-7xl lg:max-w-4xl md:max-w-2xl sm:max-w-xl max-w-sm mx-auto space-y-8 mt-6 md:mt-12">
                <div className="bg-[#0E0E10] border border-[#1C1C21] p-4 rounded-xl space-y-5">
                    <h1 className="text-3xl font-bold mb-6 ">Your Groups</h1>
                    {userGroups.length > 0 ? (
                        <div className="gap-2 grid grid-cols-3">
                            {userGroups.map((group) => (
                                <Link href={`/groups/${group.id}`} key={group.id} className="bg-[#1c1c24] p-4 rounded-md shadow-sm  transition-colors">

                                    <h2 className="text-xl font-semibold mb-1">{group.name}</h2>
                                </Link>
                            ))}
                            <Link href={`/groups/create`} className="bg-[#1c1c24] p-4 rounded-md shadow-sm  transition-colors">
                                <h2 className="text-xl font-semibold mb-1 flex gap-2 items-center"><Plus /> Create Group</h2>
                            </Link>
                        </div>
                    ) : (
                        <>

                            <div className="gap-2 grid grid-cols-3">
                                <Link href={`/groups/create`} className="bg-[#1c1c24] p-4 rounded-md shadow-sm  transition-colors">
                                    <h2 className="text-xl font-semibold mb-1 flex gap-2 items-center"><Plus /> Create Group</h2>
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </section>
        );
    }
}