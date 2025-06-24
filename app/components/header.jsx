"use client"

import { Menu, User, X, LogOut, Bell, Check, XCircle } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabaseClient"
import { useRouter } from "next/navigation"
import { acceptGroupInvite, declineGroupInvite } from "@/lib/actions"

export default function Header({ currentUser, pendingInvitations: initialPendingInvitations }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [user, setUser] = useState(currentUser)
    const [showNotifications, setShowNotifications] = useState(false)
    const [pendingInvitations, setPendingInvitations] = useState(initialPendingInvitations)
    const router = useRouter()

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

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen)
    }

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false)
    }

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut()
        if (!error) {
            router.push('/')
        }
        closeMobileMenu()
    }

    const toggleNotifications = () => {
        setShowNotifications(!showNotifications)
    }

    const handleAcceptInvite = async (groupMemberId) => {
        const result = await acceptGroupInvite(groupMemberId)
        if (result.success) {
            setPendingInvitations(prev => prev.filter(invite => invite.id !== groupMemberId))
            router.refresh();
        } else {
            alert(`Failed to accept invite: ${result.error}`);
        }
    }

    const handleDeclineInvite = async (groupMemberId) => {
        const result = await declineGroupInvite(groupMemberId)
        if (result.success) {
            setPendingInvitations(prev => prev.filter(invite => invite.id !== groupMemberId))
            router.refresh();
        } else {
            alert(`Failed to decline invite: ${result.error}`);
        }
    }

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-gray-950 backdrop-blur supports-[backdrop-filter]:bg-gray-950/95">
                <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                    {/* Logo/Title */}
                    <Link href="/" className="flex items-center space-x-2">
                        <span className="text-xl font-bold text-white hover:text-gray-300 transition-colors">OurMovieList</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-8">
                        <Link href="/browse" className="text-gray-300 hover:text-white transition-colors font-medium">
                            Browse
                        </Link>
                        <Link href="/groups" className="text-gray-300 hover:text-white transition-colors font-medium">
                            Groups
                        </Link>
                    </nav>

                    {/* Desktop Auth & Notifications Section */}
                    <div className="hidden md:flex items-center space-x-4">
                        {user ? (
                            <>
                                {/* Notifications Icon */}
                                {pendingInvitations && pendingInvitations.length > 0 && (
                                    <div className="relative">
                                        <button onClick={toggleNotifications} className="relative p-2 rounded-full hover:bg-gray-800 transition-colors">
                                            <Bell className="h-6 w-6 text-gray-300" />
                                            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                                                {pendingInvitations.length}
                                            </span>
                                        </button>

                                        {/* Notifications Dropdown */}
                                        {showNotifications && (
                                            <div className="absolute right-0 mt-2 w-72 bg-gray-800 rounded-md shadow-lg py-1 z-50">
                                                <div className="px-4 py-2 text-sm text-gray-400 border-b border-gray-700">Group Invitations</div>
                                                {pendingInvitations.map(invite => (
                                                    <div key={invite.id} className="p-3 border-b border-gray-700 last:border-b-0">
                                                        <p className="text-sm text-white">You've been invited to <span className="font-semibold">{invite.group?.name}</span> by {invite.group?.createdBy?.displayName || invite.group?.createdBy?.email || 'Unknown'}.</p>
                                                        <div className="flex justify-end space-x-2 mt-2">
                                                            <button
                                                                onClick={() => handleAcceptInvite(invite.id)}
                                                                className="px-3 py-1 text-xs text-green-300 bg-green-700 rounded-md hover:bg-green-600 transition-colors flex items-center"
                                                            >
                                                                <Check className="h-3 w-3 mr-1" /> Accept
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeclineInvite(invite.id)}
                                                                className="px-3 py-1 text-xs text-red-300 bg-red-700 rounded-md hover:bg-red-600 transition-colors flex items-center"
                                                            >
                                                                <XCircle className="h-3 w-3 mr-1" /> Decline
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* User Profile/Logout */}

                                <span className="text-gray-300 text-sm font-medium">
                                    {user.user_metadata?.displayName || user.email}
                                </span>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Logout
                                </button>
                            </>
                        ) : (
                            <Link href="/auth" className="flex items-center px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors">
                                <User className="h-4 w-4 mr-2" />
                                Login
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden flex items-center px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                        onClick={toggleMobileMenu}
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle menu</span>
                    </button>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={closeMobileMenu} />

                    {/* Mobile Menu Panel */}
                    <div className="fixed right-0 top-0 h-full w-[300px] bg-gray-950 border-l border-gray-800 shadow-xl">
                        {/* Close Button */}
                        <div className="flex justify-end p-4">
                            <button
                                className="flex items-center px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                                onClick={closeMobileMenu}
                            >
                                <X className="h-5 w-5" />
                                <span className="sr-only">Close menu</span>
                            </button>
                        </div>

                        {/* Mobile Menu Items */}
                        <div className="flex flex-col space-y-6 px-6">
                            <Link
                                href="/browse"
                                className="text-gray-300 hover:text-white transition-colors font-medium text-lg"
                                onClick={closeMobileMenu}
                            >
                                Browse
                            </Link>
                            <Link
                                href="/groups"
                                className="text-gray-300 hover:text-white transition-colors font-medium text-lg"
                                onClick={closeMobileMenu}
                            >
                                Groups
                            </Link>
                            {/* Mobile Notifications - TODO: Implement similar to desktop */}
                            {pendingInvitations && pendingInvitations.length > 0 && user && (
                                <div className="pt-4 border-t border-gray-800">
                                    <button
                                        onClick={toggleNotifications}
                                        className="w-full flex items-center justify-start px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors relative"
                                    >
                                        <Bell className="h-4 w-4 mr-2" />
                                        Invitations
                                        <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                                            {pendingInvitations.length}
                                        </span>
                                    </button>
                                    {showNotifications && (
                                        <div className="mt-2 bg-gray-800 rounded-md shadow-lg py-1 z-50">
                                            {pendingInvitations.map(invite => (
                                                <div key={invite.id} className="p-3 border-b border-gray-700 last:border-b-0">
                                                    <p className="text-sm text-white">Invited to <span className="font-semibold">{invite.group?.name}</span> by {invite.group?.createdBy?.displayName || invite.group?.createdBy?.email || 'Unknown'}.</p>
                                                    <div className="flex justify-end space-x-2 mt-2">
                                                        <button
                                                            onClick={() => handleAcceptInvite(invite.id)}
                                                            className="px-3 py-1 text-xs text-green-300 bg-green-700 rounded-md hover:bg-green-600 transition-colors flex items-center"
                                                        >
                                                            <Check className="h-3 w-3 mr-1" /> Accept
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeclineInvite(invite.id)}
                                                            className="px-3 py-1 text-xs text-red-300 bg-red-700 rounded-md hover:bg-red-600 transition-colors flex items-center"
                                                        >
                                                            <XCircle className="h-3 w-3 mr-1" /> Decline
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="pt-4 border-t border-gray-800">
                                {user ? (
                                    <div className="flex flex-col space-y-4">

                                        <span className="text-gray-300 text-lg font-medium">
                                            {user.user_metadata?.displayName || user.email}
                                        </span>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center justify-start px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                                        >
                                            <LogOut className="h-4 w-4 mr-2" />
                                            Logout
                                        </button>
                                    </div>
                                ) : (
                                    <Link
                                        href="/auth"
                                        className="w-full flex items-center justify-start px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                                        onClick={closeMobileMenu}
                                    >
                                        <User className="h-4 w-4 mr-2" />
                                        Login
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
