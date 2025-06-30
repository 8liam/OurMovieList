"use server";

import prisma from "./prisma";
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createGroupAction(groupName) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('Server Action: Supabase URL:', supabaseUrl ? 'Loaded' : 'NOT LOADED');
    console.log('Server Action: Supabase Anon Key:', supabaseAnonKey ? 'Loaded' : 'NOT LOADED');

    // Get the cookieStore once at the top level
    const cookieStore = cookies();

    // Create the server-side Supabase client using createServerClient
    const supabaseServer = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get: (name) => cookieStore.get(name)?.value,
                set: (name, value, options) => cookieStore.set(name, value, options),
                remove: (name, options) => cookieStore.set(name, '', options),
                getAll: () => cookieStore.getAll(),
            },
        }
    );

    try {
        const { data: { session }, error: sessionError } = await supabaseServer.auth.getSession();

        console.log('Server Action: Supabase Session:', session); // Debug log: Server-side session object

        if (sessionError) {
            console.error("Server Action: Error getting session:", sessionError);
            throw new Error("Failed to retrieve user session.");
        }

        const user = session?.user;

        if (!user) {
            console.log("Server Action: No user session found.");
            throw new Error("User not authenticated.");
        }

        console.log("Server Action: Authenticated user ID:", user.id);

        // Create the group and the creator's GroupMember entry in a transaction
        const newGroup = await prisma.$transaction(async (tx) => {
            const group = await tx.group.create({
                data: {
                    name: groupName,
                    createdById: user.id,
                },
            });

            await tx.groupMember.create({
                data: {
                    groupId: group.id,
                    userId: user.id,
                    hasAcceptedInvite: true, // Creator automatically accepts
                },
            });

            return group;
        });

        return { success: true, group: newGroup };
    } catch (error) {
        console.error("Server Action: Error creating group:", error);
        return { success: false, error: error.message || "Failed to create group." };
    }
}

export async function createUserProfileAfterSignup(userId, email, displayName) {
    try {
        await prisma.user.create({
            data: {
                id: userId,
                email: email,
                displayName: displayName || null,
            },
        });
        return { success: true };
    } catch (error) {
        console.error("Error creating user profile in server action:", error);
        return { success: false, error: error.message || "Failed to create user profile." };
    }
}

export async function inviteGroupMember(groupId, invitedUserEmail) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Get the cookieStore once at the top level
    const cookieStore = cookies();

    const supabaseServer = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get: (name) => cookieStore.get(name)?.value,
                set: (name, value, options) => cookieStore.set(name, value, options),
                remove: (name, options) => cookieStore.set(name, '', options),
                getAll: () => cookieStore.getAll(),
            },
        }
    );

    try {
        const { data: { user: currentUser }, error: sessionError } = await supabaseServer.auth.getUser();

        if (sessionError || !currentUser) {
            throw new Error("User not authenticated to invite members.");
        }

        // Verify current user is the group creator
        const group = await prisma.group.findUnique({
            where: { id: groupId },
            select: { createdById: true },
        });

        if (!group || group.createdById !== currentUser.id) {
            throw new Error("Only the group creator can invite members.");
        }

        // Find the invited user in our Prisma User table
        const invitedUser = await prisma.user.findUnique({
            where: { email: invitedUserEmail },
        });

        if (!invitedUser) {
            throw new Error("Invited user not found. Please ensure they have signed up.");
        }

        // Check if user is already a member of this group
        const existingMember = await prisma.groupMember.findFirst({
            where: {
                groupId: groupId,
                userId: invitedUser.id,
            },
        });

        if (existingMember) {
            throw new Error("User is already a member of this group.");
        }

        // Create new GroupMember with hasAcceptedInvite: false
        await prisma.groupMember.create({
            data: {
                groupId: groupId,
                userId: invitedUser.id,
                hasAcceptedInvite: false,
            },
        });

        return { success: true, message: `Invitation sent to ${invitedUserEmail}.` };
    } catch (error) {
        console.error("Error inviting group member:", error);
        return { success: false, error: error.message || "Failed to invite member." };
    }
}

export async function acceptGroupInvite(groupMemberId) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Get the cookieStore once at the top level
    const cookieStore = cookies();

    const supabaseServer = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get: (name) => cookieStore.get(name)?.value,
                set: (name, value, options) => cookieStore.set(name, value, options),
                remove: (name, options) => cookieStore.set(name, '', options),
                getAll: () => cookieStore.getAll(),
            },
        }
    );

    try {
        const { data: { user: currentUser }, error: sessionError } = await supabaseServer.auth.getUser();

        if (sessionError || !currentUser) {
            throw new Error("User not authenticated to accept invite.");
        }

        const groupMember = await prisma.groupMember.findUnique({
            where: { id: groupMemberId },
            select: { userId: true, hasAcceptedInvite: true },
        });

        if (!groupMember || groupMember.userId !== currentUser.id) {
            throw new Error("Invitation not found or you are not authorized to accept it.");
        }

        if (groupMember.hasAcceptedInvite) {
            return { success: true, message: "Invitation already accepted." };
        }

        await prisma.groupMember.update({
            where: { id: groupMemberId },
            data: { hasAcceptedInvite: true },
        });

        return { success: true, message: "Invitation accepted successfully!" };
    } catch (error) {
        console.error("Error accepting group invite:", error);
        return { success: false, error: error.message || "Failed to accept invite." };
    }
}

export async function declineGroupInvite(groupMemberId) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Get the cookieStore once at the top level
    const cookieStore = cookies();

    const supabaseServer = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get: (name) => cookieStore.get(name)?.value,
                set: (name, value, options) => cookieStore.set(name, value, options),
                remove: (name, options) => cookieStore.set(name, '', options),
                getAll: () => cookieStore.getAll(),
            },
        }
    );

    try {
        const { data: { user: currentUser }, error: sessionError } = await supabaseServer.auth.getUser();

        if (sessionError || !currentUser) {
            throw new Error("User not authenticated to decline invite.");
        }

        const groupMember = await prisma.groupMember.findUnique({
            where: { id: groupMemberId },
            select: { userId: true },
        });

        if (!groupMember || groupMember.userId !== currentUser.id) {
            throw new Error("Invitation not found or you are not authorized to decline it.");
        }

        await prisma.groupMember.delete({
            where: { id: groupMemberId },
        });

        return { success: true, message: "Invitation declined successfully." };
    } catch (error) {
        console.error("Error declining group invite:", error);
        return { success: false, error: error.message || "Failed to decline invite." };
    }
}

export async function leaveGroupAction(groupId) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Get the cookieStore once at the top level
    const cookieStore = cookies();

    const supabaseServer = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get: (name) => cookieStore.get(name)?.value,
                set: (name, value, options) => cookieStore.set(name, value, options),
                remove: (name, options) => cookieStore.set(name, '', options),
                getAll: () => cookieStore.getAll(),
            },
        }
    );

    try {
        const { data: { user: currentUser }, error: sessionError } = await supabaseServer.auth.getUser();

        if (sessionError || !currentUser) {
            throw new Error("User not authenticated to leave group.");
        }

        // Find the group and check if the current user is a member
        const group = await prisma.group.findUnique({
            where: { id: groupId },
            select: { createdById: true }, // Need to know who created it
        });

        if (!group) {
            throw new Error("Group not found.");
        }

        if (group.createdById === currentUser.id) {
            throw new Error("Group creators cannot leave their own group. Please delete the group instead.");
        }

        // Find and delete the GroupMember entry for the current user
        const deletedMember = await prisma.groupMember.deleteMany({
            where: {
                groupId: groupId,
                userId: currentUser.id,
            },
        });

        if (deletedMember.count === 0) {
            throw new Error("You are not a member of this group or have already left.");
        }

        return { success: true, message: "Successfully left the group." };
    } catch (error) {
        console.error("Error leaving group:", error);
        return { success: false, error: error.message || "Failed to leave group." };
    }
}

export async function deleteGroupAction(groupId) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Get the cookieStore once at the top level
    const cookieStore = cookies();

    const supabaseServer = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get: (name) => cookieStore.get(name)?.value,
                set: (name, value, options) => cookieStore.set(name, value, options),
                remove: (name, options) => cookieStore.set(name, '', options),
                getAll: () => cookieStore.getAll(),
            },
        }
    );

    try {
        const { data: { user: currentUser }, error: sessionError } = await supabaseServer.auth.getUser();

        if (sessionError || !currentUser) {
            throw new Error("User not authenticated to delete group.");
        }

        const groupToDelete = await prisma.group.findUnique({
            where: { id: groupId },
            select: { createdById: true },
        });

        if (!groupToDelete || groupToDelete.createdById !== currentUser.id) {
            throw new Error("Group not found or you are not authorized to delete it.");
        }

        await prisma.$transaction(async (tx) => {
            // Delete all watchlist items associated with the group
            await tx.groupWatchlist.deleteMany({
                where: { groupId: groupId },
            });

            // Delete all group members associated with the group
            await tx.groupMember.deleteMany({
                where: { groupId: groupId },
            });

            // Finally, delete the group itself
            await tx.group.delete({
                where: { id: groupId },
            });
        });

        return { success: true, message: "Group deleted successfully." };
    } catch (error) {
        console.error("Error deleting group:", error);
        return { success: false, error: error.message || "Failed to delete group." };
    }
}

export async function handleLeaveGroupAction(groupId) {
    const result = await leaveGroupAction(groupId);
    if (result.success) {
        console.log(result.message);
        revalidatePath('/');
        redirect('/');
    } else {
        console.error("Failed to leave group:", result.error);
        // Optionally, show an error message to the user
    }
}

export async function handleDeleteGroupAction(groupId) {
    const result = await deleteGroupAction(groupId);
    if (result.success) {
        console.log(result.message);
        revalidatePath('/');
        redirect('/');
    } else {
        console.error("Failed to delete group:", result.error);
        // Optionally, show an error message to the user
    }
}

export async function fetchUserGroupsAction() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Get the cookieStore once at the top level
    const cookieStore = cookies();

    const supabaseServer = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get: (name) => cookieStore.get(name)?.value,
                set: (name, value, options) => cookieStore.set(name, value, options),
                remove: (name, options) => cookieStore.set(name, '', options),
                getAll: () => cookieStore.getAll(),
            },
        }
    );

    try {
        const { data: { user: currentUser }, error: sessionError } = await supabaseServer.auth.getUser();

        console.log('fetchUserGroupsAction: Supabase Session Error:', sessionError); // Debug log
        console.log('fetchUserGroupsAction: Current User:', currentUser); // Debug log

        if (sessionError || !currentUser) {
            throw new Error("User not authenticated to fetch groups.");
        }

        // Corrected query to fetch groups where the user is a member and has accepted the invite
        const userGroups = await prisma.groupMember.findMany({
            where: {
                userId: currentUser.id,
                hasAcceptedInvite: true,
            },
            include: {
                group: {
                    include: {
                        watchlistItems: true, // Include watchlist items
                    },
                },
            },
        });

        // Map to return only the group objects
        return { success: true, groups: userGroups.map(gm => gm.group) };
    } catch (error) {
        console.log("Error fetching user groups:", error);
        return { success: false, error: error.message || "Failed to fetch user groups." };
    }
}

export async function addMovieToGroupWatchlistAction(groupId, movieId) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Get the cookieStore once at the top level
    const cookieStore = cookies();

    const supabaseServer = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get: (name) => cookieStore.get(name)?.value,
                set: (name, value, options) => cookieStore.set(name, value, options),
                remove: (name, options) => cookieStore.set(name, '', options),
                getAll: () => cookieStore.getAll(),
            },
        }
    );

    try {
        const { data: { user: currentUser }, error: sessionError } = await supabaseServer.auth.getUser();

        if (sessionError || !currentUser) {
            throw new Error("User not authenticated to add movie to group watchlist.");
        }

        // Verify user is a member of the group and has accepted the invite
        const groupMember = await prisma.groupMember.findFirst({
            where: {
                groupId: groupId,
                userId: currentUser.id,
            },
        });

        if (!groupMember) {
            throw new Error("You are not a member of this group or have not accepted the invite.");
        }

        // Convert movieId to string before using in Prisma query
        const movieIdString = String(movieId);

        // Check if movie already exists in the group's watchlist
        const existingWatchlistItem = await prisma.groupWatchlist.findFirst({
            where: {
                groupId: groupId,
                movieId: movieIdString, // Use the string version of movieId
            },
        });

        if (existingWatchlistItem) {
            return { success: false, message: "Movie is already in this group's watchlist." };
        }

        await prisma.groupWatchlist.create({
            data: {
                groupId: groupId,
                movieId: movieIdString,
                addedById: currentUser.id,
            },
        });

        revalidatePath(`/groups/${groupId}`); // Revalidate the group page
        return { success: true };
    } catch (error) {
        console.error("Error adding movie to group watchlist:", error);
        return { success: false, error: error.message || "Failed to add movie to group watchlist." };
    }
}

export async function markMovieAsWatched(watchlistItemId, groupId) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Get the cookieStore once at the top level
    const cookieStore = cookies();

    const supabaseServer = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get: (name) => cookieStore.get(name)?.value,
                set: (name, value, options) => cookieStore.set(name, value, options),
                remove: (name, options) => cookieStore.set(name, '', options),
                getAll: () => cookieStore.getAll(),
            },
        }
    );

    try {
        const { data: { user: currentUser }, error: sessionError } = await supabaseServer.auth.getUser();

        if (sessionError || !currentUser) {
            throw new Error("User not authenticated to mark movie as watched.");
        }

        const watchlistItem = await prisma.groupWatchlist.findUnique({
            where: { id: watchlistItemId },
            select: { addedById: true, groupId: true },
        });

        if (!watchlistItem || watchlistItem.groupId !== groupId) {
            throw new Error("Watchlist item not found or does not belong to this group.");
        }

        // Optionally, check if the current user is a member of the group before allowing them to mark as watched
        const isGroupMember = await prisma.groupMember.findFirst({
            where: {
                groupId: groupId,
                userId: currentUser.id,
                hasAcceptedInvite: true,
            },
        });

        if (!isGroupMember) {
            throw new Error("You are not authorized to mark movies as watched in this group.");
        }

        await prisma.groupWatchlist.update({
            where: { id: watchlistItemId },
            data: { watched: true },
        });

        revalidatePath(`/groups/${groupId}`); // Revalidate the group page
        return { success: true, message: "Movie marked as watched!" };
    } catch (error) {
        console.error("Error marking movie as watched:", error);
        return { success: false, error: error.message || "Failed to mark movie as watched." };
    }
}

export async function removeMovieFromWatchlist(watchlistItemId, groupId) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Get the cookieStore once at the top level
    const cookieStore = cookies();

    const supabaseServer = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get: (name) => cookieStore.get(name)?.value,
                set: (name, value, options) => cookieStore.set(name, value, options),
                remove: (name, options) => cookieStore.set(name, '', options),
                getAll: () => cookieStore.getAll(),
            },
        }
    );

    try {
        const { data: { user: currentUser }, error: sessionError } = await supabaseServer.auth.getUser();

        if (sessionError || !currentUser) {
            throw new Error("User not authenticated to remove movie from watchlist.");
        }

        const watchlistItem = await prisma.groupWatchlist.findUnique({
            where: { id: watchlistItemId },
            select: { addedById: true, groupId: true },
        });

        if (!watchlistItem || watchlistItem.groupId !== groupId) {
            throw new Error("Watchlist item not found or does not belong to this group.");
        }

        // Optionally, check if the current user is the one who added it, or a group admin
        // For now, allowing any group member to remove to simplify
        const isGroupMember = await prisma.groupMember.findFirst({
            where: {
                groupId: groupId,
                userId: currentUser.id,
                hasAcceptedInvite: true,
            },
        });

        if (!isGroupMember) {
            throw new Error("You are not authorized to remove movies from this group's watchlist.");
        }

        await prisma.groupWatchlist.delete({
            where: { id: watchlistItemId },
        });

        revalidatePath(`/groups/${groupId}`); // Revalidate the group page
        return { success: true, message: "Movie removed from watchlist." };
    } catch (error) {
        console.error("Error removing movie from watchlist:", error);
        return { success: false, error: error.message || "Failed to remove movie from watchlist." };
    }
} 