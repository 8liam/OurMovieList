"use server";

import { PrismaClient } from "../app/generated/prisma";
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const prisma = new PrismaClient();

export async function createGroupAction(groupName) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('Server Action: Supabase URL:', supabaseUrl ? 'Loaded' : 'NOT LOADED');
    console.log('Server Action: Supabase Anon Key:', supabaseAnonKey ? 'Loaded' : 'NOT LOADED');

    // Create the server-side Supabase client using createServerClient
    const supabaseServer = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get: (name) => cookies().get(name)?.value,
                set: (name, value, options) => cookies().set(name, value, options),
                remove: (name, options) => cookies().set(name, '', options),
            },
        }
    );

    console.log('Server Action: All cookies:', cookies().getAll()); // Crucial debug log

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
    const prisma = new PrismaClient(); // Re-instantiate Prisma for this action
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
    const prisma = new PrismaClient();

    const supabaseServer = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get(name) { return cookies().get(name)?.value },
                set(name, value, options) { cookies().set(name, value, options) },
                remove(name, options) { cookies().set(name, '', options) },
                getAll() { return cookies().getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookies().set(name, value, options);
                    });
                },
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
    const prisma = new PrismaClient();

    const supabaseServer = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get(name) { return cookies().get(name)?.value },
                set(name, value, options) { cookies().set(name, value, options) },
                remove(name, options) { cookies().set(name, '', options) },
                getAll() { return cookies().getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookies().set(name, value, options);
                    });
                },
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
    const prisma = new PrismaClient();

    const supabaseServer = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get(name) { return cookies().get(name)?.value },
                set(name, value, options) { cookies().set(name, value, options) },
                remove(name, options) { cookies().set(name, '', options) },
                getAll() { return cookies().getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookies().set(name, value, options);
                    });
                },
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
    const prisma = new PrismaClient();

    const supabaseServer = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get(name) { return cookies().get(name)?.value },
                set(name, value, options) { cookies().set(name, value, options) },
                remove(name, options) { cookies().set(name, '', options) },
                getAll() { return cookies().getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookies().set(name, value, options);
                    });
                },
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
    const prisma = new PrismaClient();

    const supabaseServer = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get(name) { return cookies().get(name)?.value },
                set(name, value, options) { cookies().set(name, value, options) },
                remove(name, options) { cookies().set(name, '', options) },
                getAll() { return cookies().getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookies().set(name, value, options);
                    });
                },
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
    const prisma = new PrismaClient();

    const supabaseServer = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get(name) { return cookies().get(name)?.value },
                set(name, value, options) { cookies().set(name, value, options) },
                remove(name, options) { cookies().set(name, '', options) },
                getAll() { return cookies().getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookies().set(name, value, options);
                    });
                },
            },
        }
    );

    try {
        const { data: { user: currentUser }, error: sessionError } = await supabaseServer.auth.getUser();

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
                group: true, // Include group details
            },
        });

        // Map to return only the group objects
        return { success: true, groups: userGroups.map(gm => gm.group) };
    } catch (error) {
        console.error("Error fetching user groups:", error);
        return { success: false, error: error.message || "Failed to fetch user groups." };
    }
}

export async function addMovieToGroupWatchlistAction(groupId, movieId) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const prisma = new PrismaClient();

    const supabaseServer = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get(name) { return cookies().get(name)?.value },
                set(name, value, options) { cookies().set(name, value, options) },
                remove(name, options) { cookies().set(name, '', options) },
                getAll() { return cookies().getAll() },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookies().set(name, value, options);
                    });
                },
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
                hasAcceptedInvite: true,
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
                movieId: movieIdString, // Use the string version of movieId
                addedById: currentUser.id,
            },
        });

        return { success: true, message: "Movie added to group watchlist successfully!" };
    } catch (error) {
        console.error("Error adding movie to group watchlist:", error);
        return { success: false, error: error.message || "Failed to add movie to group watchlist." };
    }
} 