import { PrismaClient } from "../../generated/prisma";
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import AddMemberForm from './AddMemberForm';
import { handleLeaveGroupAction, handleDeleteGroupAction } from "@/lib/actions";
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export default async function GroupPage({ params }) {
    const groupId = params.groupId;

    // Get the cookieStore once at the top level of the Server Component
    const cookieStore = cookies();

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

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
                <h1 className="text-3xl font-bold mb-4 text-gray-900">{group.name}</h1>
                <p className="text-gray-600 mb-2">
                    Created by: {group.createdBy?.displayName || group.createdBy?.email || 'Unknown'} on {new Date(group.createdAt).toLocaleDateString()}
                </p>

                <div className="mt-6">
                    <h2 className="text-xl font-semibold mb-3">Group Members:</h2>
                    <ul className="list-disc list-inside space-y-1">
                        {group.members.map(member => (
                            <li key={member.id} className="text-gray-700">
                                {member.user?.displayName || member.user?.email || 'Unknown User'}
                                {!member.hasAcceptedInvite && (
                                    <span className="text-gray-500">(Pending)</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>

                <AddMemberForm
                    groupId={groupId}
                    groupCreatorId={group.createdById}
                    currentUserId={currentUser.id}
                />

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

                <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-3">Watchlist:</h2>
                    {group.watchlistItems.length > 0 ? (
                        <ul className="space-y-3">
                            {group.watchlistItems.map(item => (
                                <li key={item.id} className="bg-gray-50 p-3 rounded-md shadow-sm flex justify-between items-center">
                                    <span className="font-medium">Movie ID: {item.movieId}</span>
                                    <span className={`text-sm ${item.watched ? 'text-green-600' : 'text-red-600'}`}>
                                        {item.watched ? 'Watched' : 'Unwatched'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-600">No items in the watchlist yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
} 