import { fetchUserGroupsAction } from "@/lib/actions";
import BrowseContent from "./BrowseContent"; // Import the new client component

export default async function Browse(props) {
    const resolvedSearchParams = await Promise.resolve(props.searchParams);
    const searchQuery = resolvedSearchParams.query || '';
    const moviesPerPage = 20; // Number of movies to fetch per page
    const page = parseInt(resolvedSearchParams.page) || 1;

    let movies = [];
    let userGroups = [];
    let error = null;

    try {
        // Fetch initial user groups on the server
        const userGroupsResult = await fetchUserGroupsAction();
        if (userGroupsResult.success) {
            userGroups = userGroupsResult.groups;
        } else {
            console.log("Error fetching user groups in Browse page:", userGroupsResult.error);
            error = new Error(userGroupsResult.error);
        }

        // Dynamically construct the base URL for server-side fetches
        const protocol = process.env.NODE_ENV === 'production' ? 'https://' : 'http://';
        const host = process.env.NEXT_PUBLIC_VERCEL_URL || 'localhost:3000';

        let apiUrl = '';
        if (searchQuery) {
            apiUrl = `/api/search-movies?query=${encodeURIComponent(searchQuery)}&page=${page}`;
        } else {
            apiUrl = `/api/trending?page=${page}`;
        }

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        movies = data.results;
    } catch (err) {
        error = err;
        console.log("Error fetching movies in Browse page:", err);
    }

    return (
        <BrowseContent
            initialSearchQuery={searchQuery}
            initialMovies={movies}
            initialPage={page}
            initialUserGroups={userGroups}
            moviesPerPage={moviesPerPage}
            initialError={error ? error.message : null} // Pass initial error message
        />
    );
}