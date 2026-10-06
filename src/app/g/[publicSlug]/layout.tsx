import type { Metadata } from "next";

// Private deliveries: never indexed, never cached as a shared preview.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function ClientGalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
