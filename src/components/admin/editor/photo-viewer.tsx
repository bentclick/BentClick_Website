"use client";

import { useState } from "react";
import { Lightbox } from "@/components/gallery/lightbox";
import type { PublicPhoto } from "@/types/public-gallery";

type Props = { photos: PublicPhoto[]; startId: string; onClose: () => void };

/** The client gallery's full-screen viewer, for the photographer's own grid. */
export function PhotoViewer({ photos, startId, onClose }: Props) {
  const [index, setIndex] = useState(() => Math.max(0, photos.findIndex((p) => p.id === startId)));
  const [playing, setPlaying] = useState(false);
  if (photos.length === 0) return null;
  return (
    <Lightbox
      photos={photos}
      index={Math.min(index, photos.length - 1)}
      total={photos.length}
      playing={playing}
      onIndex={setIndex}
      onClose={onClose}
      onTogglePlay={() => setPlaying((p) => !p)}
      onNeedMore={() => {}}
    />
  );
}
