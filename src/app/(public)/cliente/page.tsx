import type { Metadata } from "next";
import { GalleryAccessForm } from "@/components/site/gallery-access-form";

export const metadata: Metadata = { title: "Área do cliente", robots: { index: false } };

export default function ClientAreaPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center px-5 py-24 text-center">
      <p className="eyebrow">Área do cliente</p>
      <h1 className="mt-5 font-serif text-5xl font-normal leading-[1.05] sm:text-6xl">Sua galeria está esperando.</h1>
      <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground">
        Use o link enviado por e-mail. Sem cadastro: se a galeria tiver senha, ela será pedida na próxima tela.
      </p>
      <GalleryAccessForm />
    </main>
  );
}
