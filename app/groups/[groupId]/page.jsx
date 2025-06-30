import prisma from "@/lib/prisma";
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import AddMemberForm from './AddMemberForm';
import { handleLeaveGroupAction, handleDeleteGroupAction, markMovieAsWatched, removeMovieFromWatchlist } from "@/lib/actions";
import { revalidatePath } from 'next/cache';
import { ArrowDownRight, ArrowDownRightFromSquare, Clock, Plus, Trash, Users } from "lucide-react";
import WatchListMovie from "@/app/components/ui/watchlistmovie";

export default async function GroupPage(props) {
    const params = await props.params;
    const groupId = params.groupId;

    // Get the cookieStore once at the top level of the Server Component
    const cookieStore = await cookies();

    // Create server-side Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                async getAll() {
                    return await cookieStore.getAll();
                },
                async setAll(cookiesToSet) {
                    for (const { name, value, options } of cookiesToSet) {
                        await cookieStore.set(name, value, options);
                    }
                },
            },
        }
    );

    // Check user authentication using getUser() for security
    const { data: { user: currentUser }, error: sessionError } = await supabase.auth.getUser();

    if (sessionError) {
        console.error("Error fetching user:", sessionError);
        redirect("/auth");
    }

    if (!currentUser) {
        redirect("/auth"); // Redirect to login if not authenticated
    }

    // Check if user is a member of this group and has accepted the invite
    const groupMembership = await prisma.groupMember.findFirst({
        where: {
            groupId: groupId,
            userId: currentUser.id,
        },
    });

    if (!groupMembership) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold mb-4 text-red-600">Access Denied</h2>
                    <p className="text-gray-700">You are not a member of this group or do not have permission to view it.</p>
                    <p className="mt-4 text-gray-600">Please contact the group owner for an invite.</p>
                    <a href="/" className="mt-6 inline-block bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors">Go to Home</a>
                </div>
            </div>
        );
    }

    if (!groupMembership.hasAcceptedInvite) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold mb-4 text-red-600">Access Denied</h2>
                    <p className="text-gray-700">You need to accept the invite to this group to view its contents.</p>
                    <p className="mt-4 text-gray-600">Please check your notifications for pending invitations.</p>
                    <a href="/" className="mt-6 inline-block bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors">Go to Home</a>
                </div>
            </div>
        );
    }

    // Fetch group details if authorized
    const group = await prisma.group.findUnique({
        where: {
            id: groupId,
        },
        include: {
            createdBy: { select: { id: true, email: true, displayName: true } },
            members: { include: { user: { select: { email: true, displayName: true } } } },
            watchlistItems: true, // You might want to include more details here later
        },
    });

    if (!group) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold mb-4 text-red-600">Group Not Found</h2>
                    <p className="text-gray-700">The group you are looking for does not exist.</p>
                    <a href="/" className="mt-6 inline-block bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors">Go to Home</a>
                </div>
            </div>
        );
    }

    // Determine if the current user is the group creator
    const isGroupCreator = group.createdById === currentUser.id;

    // Filter watchlist items into watched and unwatched
    const unwatchedItems = group.watchlistItems.filter(item => !item.watched);
    const watchedItems = group.watchlistItems.filter(item => item.watched);

    return (

        <div className="max-w-7xl mx-auto space-y-8 my-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{group.name}</h1>
                    <p className="text-gray-400">Your group's movie collection and watchlist</p>
                </div>
                <AddMemberForm
                    groupId={groupId}
                    groupCreatorId={group.createdById}
                    currentUserId={currentUser.id}
                />
            </div>
            <div className="bg-[#0E0E10] border border-[#1C1C21] p-4 rounded-xl space-y-5">
                <h2 className="flex items-center gap-2 text-white text-2xl font-semibold">
                    <Users className="w-5 h-5" /> Group Members
                </h2>

                <div className="grid grid-cols-5 gap-2">
                    {group.members.map(member => (
                        <div key={member.id} className="text-white bg-[#1C1C21] rounded-lg text-center p-4">
                            {member.user?.displayName || member.user?.email || 'Unknown User'}

                            {!member.hasAcceptedInvite && (
                                <span className="text-gray-500">(Pending)</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            {/* Watch List (Unwatched) */}
            {unwatchedItems.length > 0 && (
                <div className="bg-[#0E0E10] border border-[#1C1C21] p-4 rounded-xl space-y-5">
                    <h2 className="flex items-center gap-2 text-white text-2xl font-semibold">
                        <Plus className="w-5 h-5" /> Watch List ({unwatchedItems.length})
                    </h2>

                    <div className="grid grid-cols-5 gap-4">
                        {unwatchedItems
                            .map(item => (
                                <WatchListMovie
                                    id={item.movieId}
                                    key={item.id}
                                    watchlistItemId={item.id}
                                    groupId={groupId}
                                    markMovieAsWatched={markMovieAsWatched}
                                    removeMovieFromWatchlist={removeMovieFromWatchlist}
                                    isWatched={item.watched}
                                />
                            ))}
                    </div>
                </div>
            )}

            {/* Watch List (Watched) */}
            {watchedItems.length > 0 && (
                <div className="bg-[#0E0E10] border border-[#1C1C21] p-4 rounded-xl space-y-5">
                    <h2 className="flex items-center gap-2 text-white text-2xl font-semibold">
                        <Clock className="w-5 h-5" /> Recently Watched ({watchedItems.length})
                    </h2>

                    <div className="grid grid-cols-5 gap-4">
                        {watchedItems
                            .slice().reverse()
                            .map(item => (
                                <WatchListMovie
                                    id={item.movieId}
                                    key={item.id}
                                    watchlistItemId={item.id}
                                    groupId={groupId}
                                    markMovieAsWatched={markMovieAsWatched}
                                    removeMovieFromWatchlist={removeMovieFromWatchlist}
                                    isWatched={item.watched}
                                />
                            ))}
                    </div>
                </div>
            )}

            <div className="mt-6 flex space-x-4">
                {!isGroupCreator && (
                    <form action={handleLeaveGroupAction.bind(null, groupId)}>
                        <button type="submit" className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition-colors">
                            Leave Group
                        </button>
                    </form>
                )}
                {isGroupCreator && (
                    <form action={handleDeleteGroupAction.bind(null, groupId)}>
                        <button type="submit" className="bg-red-700 text-white py-2 px-4 rounded hover:bg-red-800 transition-colors">
                            Delete Group
                        </button>
                    </form>
                )}
            </div>


        </div>
    );
} 