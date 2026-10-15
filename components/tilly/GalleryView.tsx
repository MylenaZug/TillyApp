"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Images, Trash2, X } from "lucide-react";
import { compressImage, deletePhoto, listPhotos, uploadPhoto, type PhotoMeta } from "@/lib/photos/client";
import { PrimaryButton, TextArea } from "./ui";

function fmtPhotoDate(ms: number) {
  return new Date(ms).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function GalleryView() {
  const [photos, setPhotos] = useState<PhotoMeta[] | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<{ blob: Blob; previewUrl: string } | null>(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [openPhoto, setOpenPhoto] = useState<PhotoMeta | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      const list = await listPhotos();
      setPhotos(list);
      setError("");
    } catch {
      setError("Fotos konnten nicht geladen werden - bist du online?");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleFileSelected(file: File) {
    const blob = await compressImage(file).catch(() => file);
    setPending({ blob, previewUrl: URL.createObjectURL(blob) });
  }

  function cancelUpload() {
    if (pending) URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
    setNote("");
  }

  async function confirmUpload() {
    if (!pending) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      await uploadPhoto(pending.blob, note, setUploadProgress);
      URL.revokeObjectURL(pending.previewUrl);
      setPending(null);
      setNote("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function handleDelete(id: string) {
    setOpenPhoto(null);
    setPhotos((cur) => cur?.filter((p) => p.id !== id) ?? cur);
    try {
      await deletePhoto(id);
    } catch {
      setError("Löschen fehlgeschlagen.");
      await refresh();
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="font-semibold text-ink">Galerie</div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white"
        >
          <ImagePlus size={14} /> Foto hinzufügen
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleFileSelected(file);
          }}
        />
      </div>

      {error && <div className="mb-3 rounded-xl bg-rust-soft px-3 py-2 text-xs text-rust">{error}</div>}

      {photos === null ? (
        <div className="py-10 text-center text-sm text-ink-soft">Lädt…</div>
      ) : photos.length === 0 ? (
        <div className="py-10 text-center text-sm text-ink-soft">
          <Images size={28} className="mx-auto mb-2 opacity-50" />
          Noch keine Fotos – leg das erste an.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((p) => (
            <button key={p.id} onClick={() => setOpenPhoto(p)} className="aspect-square overflow-hidden rounded-lg bg-hairline">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photos/${p.id}`} alt={p.note || ""} className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {pending && (
        <div className="absolute inset-0 z-20 flex items-end bg-ink/30" onClick={cancelUpload}>
          <div className="mx-auto w-full max-w-[430px] rounded-t-3xl bg-card p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div className="font-semibold text-ink">Foto hochladen</div>
              <button onClick={cancelUpload}>
                <X size={20} className="text-ink-soft" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pending.previewUrl} alt="" className="mb-3 max-h-64 w-full rounded-xl bg-bg object-contain" />
            <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notiz (optional)…" rows={2} />
            <div className="mt-3">
              <PrimaryButton onClick={() => void confirmUpload()} disabled={uploading}>
                {uploading ? `Lädt hoch… ${uploadProgress}%` : "Hochladen"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {openPhoto && (
        <div className="absolute inset-0 z-20 flex flex-col bg-ink/95" onClick={() => setOpenPhoto(null)}>
          <div className="flex items-center justify-between p-4">
            <span className="text-xs text-white/70">{fmtPhotoDate(openPhoto.createdAt)}</span>
            <button onClick={() => setOpenPhoto(null)}>
              <X size={22} className="text-white" />
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/photos/${openPhoto.id}`}
            alt={openPhoto.note || ""}
            className="flex-1 object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="space-y-2 p-4" onClick={(e) => e.stopPropagation()}>
            {openPhoto.note && <p className="text-sm text-white">{openPhoto.note}</p>}
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/70">{openPhoto.uploadedBy}</span>
              <button onClick={() => void handleDelete(openPhoto.id)} className="flex items-center gap-1.5 text-xs text-rust">
                <Trash2 size={13} /> Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
