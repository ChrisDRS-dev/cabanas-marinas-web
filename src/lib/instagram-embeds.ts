export type InstagramEmbedPost = {
  id: string;
  permalink: string;
  title: string;
  coverImage: string;
};

export const INSTAGRAM_PROFILE_URL = "https://www.instagram.com/cabanasmarinas507/";

// Agrega nuevos posts duplicando este formato.
// Solo necesitamos el permalink canónico del post.
export const instagramEmbedPosts: InstagramEmbedPost[] = [
  {
    id: "DRyBpaVkaAA",
    permalink: "https://www.instagram.com/p/DRyBpaVkaAA/",
    title: "Post destacado 0",
    coverImage: "/photos/cabin-from-beach-sunrise.jpg",
  },
  {
    id: "DRMmoU9EbXB",
    permalink: "https://www.instagram.com/p/DRMmoU9EbXB/",
    title: "Post destacado 0.1",
    coverImage: "/photos/Kayak-view.webp",
  },
  {
    id: "DRKvqqHgay7",
    permalink: "https://www.instagram.com/p/DRKvqqHgay7/",
    title: "Post destacado 0.2",
    coverImage: "/photos/cabin-interior1.webp",
  },
  {
    id: "DRC7L6MERZ9",
    permalink: "https://www.instagram.com/p/DRC7L6MERZ9/",
    title: "Post destacado 0.3",
    coverImage: "/photos/night-up-view.webp",
  },
  {
    id: "DVH0lirET0j",
    permalink: "https://www.instagram.com/p/DVH0lirET0j/",
    title: "Post destacado 1",
    coverImage: "/photos/cabin-from-beach.jpg",
  },
  {
    id: "DUzkLw6F4_9",
    permalink: "https://www.instagram.com/p/DUzkLw6F4_9/",
    title: "Post destacado 2",
    coverImage: "/photos/cabin-from-beach-sunrise.jpg",
  },
  {
    id: "DTEg271kSnM",
    permalink: "https://www.instagram.com/p/DTEg271kSnM/",
    title: "Post destacado 3",
    coverImage: "/photos/Kayak-view.webp",
  },
];
