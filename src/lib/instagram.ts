import "server-only";

export type InstagramGalleryItem = {
  id: string;
  image: string;
  text: string;
  link: string;
  isVideo: boolean;
};

type InstagramMediaNode = {
  id?: string;
  shortcode?: string;
  display_url?: string;
  thumbnail_src?: string;
  accessibility_caption?: string | null;
  is_video?: boolean;
  edge_media_to_caption?: {
    edges?: Array<{
      node?: {
        text?: string;
      };
    }>;
  };
};

type InstagramProfileResponse = {
  data?: {
    user?: {
      edge_owner_to_timeline_media?: {
        edges?: Array<{
          node?: InstagramMediaNode;
        }>;
      };
    };
  };
};

const INSTAGRAM_USERNAME = "cabanasmarinas507";
const INSTAGRAM_PROFILE_URL = `https://www.instagram.com/${INSTAGRAM_USERNAME}/`;

function compactText(value: string | null | undefined, limit = 96) {
  const normalized = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "Momentos en Cabañas Marinas";
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 1).trimEnd()}…`;
}

function buildFallbackItems(): InstagramGalleryItem[] {
  return [
    {
      id: "fallback-1",
      image: "/photos/cabin-from-beach.jpg",
      text: "Vista frente al mar desde nuestras cabañas flotantes.",
      link: INSTAGRAM_PROFILE_URL,
      isVideo: false,
    },
    {
      id: "fallback-2",
      image: "/photos/cabin-from-beach-sunrise.jpg",
      text: "Amaneceres tranquilos para empezar el día frente al agua.",
      link: INSTAGRAM_PROFILE_URL,
      isVideo: false,
    },
    {
      id: "fallback-3",
      image: "/photos/Kayak-view.webp",
      text: "Experiencias acuáticas y planes para compartir en grupo.",
      link: INSTAGRAM_PROFILE_URL,
      isVideo: false,
    },
    {
      id: "fallback-4",
      image: "/photos/night-up-view.webp",
      text: "Tardes y noches con ambiente relajado junto al mar.",
      link: INSTAGRAM_PROFILE_URL,
      isVideo: false,
    },
  ];
}

function normalizeInstagramNode(node: InstagramMediaNode | undefined): InstagramGalleryItem | null {
  if (!node?.shortcode) return null;

  const captionEdge = node.edge_media_to_caption?.edges?.[0]?.node?.text ?? "";
  const text = compactText(captionEdge || node.accessibility_caption || "Post reciente de Instagram");
  const image = node.thumbnail_src || node.display_url || "";
  if (!image) return null;

  return {
    id: node.id ?? node.shortcode,
    image,
    text,
    link: `https://www.instagram.com/p/${node.shortcode}/`,
    isVideo: Boolean(node.is_video),
  };
}

export async function getInstagramGalleryItems(limit = 8): Promise<InstagramGalleryItem[]> {
  try {
    const response = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${INSTAGRAM_USERNAME}`,
      {
        headers: {
          "x-ig-app-id": "936619743392459",
          "user-agent": "Mozilla/5.0",
        },
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      throw new Error(`instagram_fetch_failed:${response.status}`);
    }

    const payload = (await response.json()) as InstagramProfileResponse;
    const edges = payload.data?.user?.edge_owner_to_timeline_media?.edges ?? [];
    const items = edges
      .map((edge) => normalizeInstagramNode(edge.node))
      .filter((item): item is InstagramGalleryItem => Boolean(item))
      .slice(0, limit);

    return items.length > 0 ? items : buildFallbackItems();
  } catch {
    return buildFallbackItems();
  }
}

export function getInstagramProfileUrl() {
  return INSTAGRAM_PROFILE_URL;
}
