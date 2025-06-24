"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { createUserProfileAfterSignup } from "../../lib/actions"; // Import the new server action

// Remove PrismaClient import and instantiation from this client component
// import { PrismaClient } from "../generated/prisma"; 
// const prisma = new PrismaClient();

export default function AuthPage() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const router = useRouter();

    // Redirect if already logged in
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                router.push("/");
            }
        };
        checkSession();
    }, [router]);

    const handleAuth = async (event) => {
        event.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            let { data, error } = isSignUp
                ? await supabase.auth.signUp({ email, password, options: { data: { displayName } } })
                : await supabase.auth.signInWithPassword({ email, password });

            if (error) throw error;

            // If signing up, create a corresponding user profile in the Prisma database via server action
            if (isSignUp && data.user) {
                const profileResult = await createUserProfileAfterSignup(
                    data.user.id,
                    data.user.email,
                    data.user.user_metadata?.displayName || null
                );

                if (!profileResult.success) {
                    throw new Error(profileResult.error || "Failed to create user profile.");
                }
            }

            setMessage(
                isSignUp
                    ? "Sign-up successful! Please check your email to confirm your account."
                    : "Sign-in successful!"
            );
            // You might want to redirect the user after successful sign-in
            if (!isSignUp) {
                router.push("/"); // Redirect to home page on sign-in
            }
        } catch (error) {
            setMessage(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-center">
                    {isSignUp ? "Sign Up" : "Sign In"}
                </h2>
                <form onSubmit={handleAuth}>
                    {isSignUp ? (
                        <div className="mb-4">
                            <label htmlFor="displayName" className="block text-gray-700 text-sm font-bold mb-2">
                                Display Name
                            </label>
                            <input
                                type="text"
                                id="displayName"
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                placeholder="Your Name"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                required
                            />
                        </div>
                    ) : null}
                    <div className="mb-4">
                        <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            placeholder="Your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="mb-6">
                        <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                            placeholder="Your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                            disabled={loading}
                        >
                            {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
                        </button>
                    </div>
                </form>
                {message && (
                    <p className="mt-4 text-center text-sm">
                        {message}
                    </p>
                )}
                <p className="mt-4 text-center text-gray-600 text-sm">
                    {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-blue-500 hover:text-blue-800 font-bold"
                    >
                        {isSignUp ? "Sign In" : "Sign Up"}
                    </button>
                </p>
            </div>
        </div>
    );
} 