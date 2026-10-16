"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Images, Pencil, Trash2, X } from "lucide-react";
import { MAX_UPLOAD_BYTES, compressImage, deletePhoto, listPhotos, photoUrl, thumbUrl, updatePhotoNote, uploadPhoto, type PhotoMeta } from "@/lib/photos/client";
import { PrimaryButton, TextArea } from "./ui";

function fmtPhotoDate(ms: number) {
  return new Date(ms).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function GalleryView() {
  const [photos, setPhotos] = useState<PhotoMeta[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<{ blob: Blob; previewUrl: string } | null>(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [openPhoto, setOpenPhoto] = useState<PhotoMeta | null>(null);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      const page = await listPhotos();
      setPhotos(page.photos);
      setHasMore(page.hasMore);
      setError("");
    } catch {
      setError("Fotos konnten nicht geladen werden - bist du online?");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function loadMore() {
    if (loadingMore || !hasMore || !photos?.length) return;
    setLoadingMore(true);
    try {
      const page = await listPhotos(photos[photos.length - 1].createdAt);
      setPhotos((cur) => [...(cur ?? []), ...page.photos.filter((p) => !cur?.some((c) => c.id === p.id))]);
      setHasMore(page.hasMore);
    } catch {
      setError("Weitere Fotos konnten nicht geladen werden.");
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }

  // Laedt die naechste Seite, sobald der Marker am Listenende in den Sichtbereich kommt.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) void loadMore();
    }, { rootMargin: "300px" });
    observer.observe(el);
    return () => observer.disconnect();
  });

  const groups: { label: string; items: PhotoMeta[] }[] = [];
  for (const p of photos ?? []) {
    const label = new Date(p.createdAt).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(p);
    else groups.push({ label, items: [p] });
  }

  async function handleFileSelected(file: File) {
    const blob = await compressImage(file).catch(() => file);
    if (blob.size > MAX_UPLOAD_BYTES) {
      setError("Das Foto ist größer als 5 MB.");
      return;
    }
    setError("");
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

  async function saveNote() {
    if (!openPhoto) return;
    try {
      const saved = await updatePhotoNote(openPhoto.id, noteDraft);
      const updated = { ...openPhoto, note: saved };
      setOpenPhoto(updated);
      setPhotos((cur) => cur?.map((p) => (p.id === updated.id ? updated : p)) ?? cur);
      setEditingNote(false);
    } catch {
      setError("Notiz konnte nicht gespeichert werden.");
    }
  }

  function closePhoto() {
    setOpenPhoto(null);
    setEditingNote(false);
  }

  async function handleDelete(id: string) {
    closePhoto();
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
          accept="image/jpeg,image/png,image/webp,image/gif"
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
        <div>
          {groups.map((g) => (
            <section key={g.label} className="mb-4">
              <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-soft">{g.label}</div>
              <div className="grid grid-cols-3 gap-1.5">
                {g.items.map((p) => (
                  <button key={p.id} onClick={() => setOpenPhoto(p)} className="aspect-square overflow-hidden rounded-lg bg-hairline">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbUrl(p.id)} alt={p.note || ""} className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            </section>
          ))}
          <div ref={sentinelRef} className="py-3 text-center text-xs text-ink-soft">
            {loadingMore ? "Lädt…" : ""}
          </div>
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
        <div className="absolute inset-0 z-20 flex flex-col bg-ink/95" onClick={closePhoto}>
          <div className="flex items-center justify-between p-4">
            <span className="text-xs text-white/70">{openPhoto.uploadedBy} · {fmtPhotoDate(openPhoto.createdAt)}</span>
            <button onClick={closePhoto}>
              <X size={22} className="text-white" />
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl(openPhoto.id)}
            alt={openPhoto.note || ""}
            className="flex-1 object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="space-y-2 p-4" onClick={(e) => e.stopPropagation()}>
            {editingNote ? (
              <div className="space-y-2">
                <TextArea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Notiz…" rows={2} />
                <div className="flex justify-end gap-3 text-xs">
                  <button onClick={() => setEditingNote(false)} className="text-white/70">
                    Abbrechen
                  </button>
                  <button onClick={() => void saveNote()} className="font-medium text-white">
                    Speichern
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-white">{openPhoto.note || (openPhoto.mine ? <span className="text-white/50">Keine Notiz</span> : null)}</p>
                {openPhoto.mine && (
                  <button
                    onClick={() => {
                      setNoteDraft(openPhoto.note || "");
                      setEditingNote(true);
                    }}
                    aria-label="Notiz bearbeiten"
                    className="shrink-0 text-white/70"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/70">Hochgeladen von {openPhoto.uploadedBy}</span>
              {openPhoto.mine && (
                <button onClick={() => void handleDelete(openPhoto.id)} className="flex items-center gap-1.5 text-xs text-rust">
                  <Trash2 size={13} /> Löschen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
