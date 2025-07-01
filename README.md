# 🎬 OurMovieList 

### Collaborative Movie Discovery & Watchlists

Welcome to **OurMovieList**, a dynamic and interactive web application designed to enhance how friends and groups discover, manage, and share their favorite movies. This platform offers a seamless experience for tracking trending films, creating and managing private groups, and building shared watchlists, fostering a collaborative movie-watching journey.

---

### ✨ Key Features

*   **🎬 Trending Movies Display**: Browse a curated list of trending movies fetched from the TMDB API, presented in an appealing, responsive grid.
*   **👥 Group Management**: Create and manage private groups, inviting friends to join for shared movie lists.
*   **🤝 Group Watchlists**: Collaborate with group members to build and track shared movie watchlists. Movies can be easily added to a group's watchlist directly from the trending section.
*   **🔐 Robust Authentication**: Secure user authentication powered by **Supabase**, ensuring private data and group access are protected.
*   **🚀 Next.js Server Actions**: Leverages the power of Next.js Server Actions for secure and efficient server-side data mutations and API calls, optimizing performance and reducing client-side logic.
*   **🔗 Seamless Navigation**: Intuitive user interface for effortless navigation between trending movies, group lists, and individual group pages.

---

### 💻 Technologies Used

*   **Next.js**
*   **Prisma ORM**
*   **PostgreSQL**
*   **Supabase**
*   **Tailwind CSS**
*   **The Movie Database (TMDB) API**

---

### 🌐 Database Schema 

### 1. `User`

Represents a user in the system.

-   **`id`**: Unique identifier for the user (UUID).
-   **`email`**: User's email address (unique).
-   **`displayName`**: Optional display name for the user.
-   **`groupsCreated`**: A list of `Group`s that this user has created (one-to-many relationship with `Group`).
-   **`groupMembers`**: A list of `GroupMember` entries, indicating which groups the user belongs to (one-to-many relationship with `GroupMember`).
-   **`watchlistItems`**: A list of `GroupWatchlist` items that this user has added to various group watchlists (one-to-many relationship with `GroupWatchlist`).

### 2. `Group`

Represents a group created by a user.

-   **`id`**: Unique identifier for the group (UUID).
-   **`name`**: The name of the group.
-   **`createdBy`**: The `User` who created this group (many-to-one relationship with `User`).
-   **`createdById`**: The ID of the user who created the group.
-   **`members`**: A list of `GroupMember` entries, indicating who belongs to this group (one-to-many relationship with `GroupMember`).
-   **`watchlistItems`**: A list of `GroupWatchlist` items associated with this group (one-to-many relationship with `GroupWatchlist`).
-   **`createdAt`**: Timestamp when the group was created.

### 3. `GroupMember`

Represents a many-to-many relationship between `User` and `Group`, indicating a user's membership in a specific group.

-   **`id`**: Unique identifier for the group membership entry (UUID).
-   **`group`**: The `Group` that the user is a member of (many-to-one relationship with `Group`).
-   **`groupId`**: The ID of the group.
-   **`user`**: The `User` who is a member of the group (many-to-one relationship with `User`).
-   **`userId`**: The ID of the user.
-   **`hasAcceptedInvite`**: A boolean indicating whether the user has accepted the group invitation.
-   **`joinedAt`**: Timestamp when the user joined the group (or accepted the invite).

### 4. `GroupWatchlist`

Represents a movie added to a group's shared watchlist.

-   **`id`**: Unique identifier for the watchlist item (UUID).
-   **`group`**: The `Group` to which this watchlist item belongs (many-to-one relationship with `Group`).
-   **`groupId`**: The ID of the group.
-   **`addedBy`**: The `User` who added this movie to the watchlist (many-to-one relationship with `User`).
-   **`addedById`**: The ID of the user who added the movie.
-   **`movieId`**: The ID of the movie (e.g., TMDB ID).
-   **`watched`**: A boolean indicating whether the movie has been watched by the group.
-   **`addedAt`**: Timestamp when the movie was added to the watchlist.

### Relationships Summary

-   **User to Group (Creator)**: One user can create many groups. (`User.groupsCreated` -> `Group.createdBy`)
-   **User to Group (Member)**: One user can be a member of many groups, and one group can have many members. This is managed by the `GroupMember` join table. (`User.groupMembers` <-> `GroupMember` <-> `Group.members`)
-   **Group to GroupWatchlist**: One group can have many movies on its watchlist. (`Group.watchlistItems` -> `GroupWatchlist.group`)
-   **User to GroupWatchlist (Added By)**: One user can add many movies to various group watchlists. (`User.watchlistItems` -> `GroupWatchlist.addedBy`)

---
