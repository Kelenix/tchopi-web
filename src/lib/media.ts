"use client";

import { browserClient } from "./supabase";

/** Photo réduite à 800 px (JPEG) avant l'envoi, comme l'app mobile : données et stockage limités. */
async function shrink(file: File, max = 800): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("image"))), "image/jpeg", 0.85),
  );
}

/** Envoie une photo d'établissement ou de produit (bucket public « media », dossier de l'établissement). */
export async function uploadEstablishmentImage(establishmentId: string, file: File, kind: "cover" | "product"): Promise<string> {
  const blob = await shrink(file);
  const path = `restaurants/${establishmentId}/${kind}-${Date.now()}.jpg`;
  const { error } = await browserClient().storage.from("media").upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  return path;
}
