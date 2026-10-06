import { GalleryNotice } from "@/components/gallery/gallery-notice";

export default function GalleryNotFound() {
  return (
    <GalleryNotice
      title="Galeria não encontrada."
      message="Confira se o link está completo. Se a galeria ainda não foi liberada, aguarde o aviso do fotógrafo."
    />
  );
}
