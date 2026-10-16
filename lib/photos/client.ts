export type PhotoMeta = { id: string; filename: string; note: string | null; uploadedBy: string; createdAt: number; deleted: number };

export async function listPhotos(): Promise<PhotoMeta[]> {
  const res = await fetch("/api/photos");
  if (!res.ok) throw new Error("Fotos konnten nicht geladen werden");
  const data = await res.json();
  return data.photos as PhotoMeta[];
}

// XHR statt fetch, damit echter Upload-Fortschritt angezeigt werden kann (fetch hat dafuer
// keine Events) - auf langsamen Mobilfunkverbindungen sieht ein Upload sonst nach
// "haengt fest" aus, auch wenn er nur lange dauert. Zusaetzlich ein Timeout, damit bei
// einer wirklich haengenden Verbindung irgendwann ein Fehler statt endloser Stille kommt.
export function uploadPhoto(file: Blob, note: string, onProgress?: (pct: number) => void): Promise<PhotoMeta> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("photo", file, "photo.jpg");
    if (note.trim()) form.append("note", note.trim());

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/photos");
    xhr.timeout = 60000;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve((JSON.parse(xhr.responseText) as { photo: PhotoMeta }).photo);
        } catch {
          reject(new Error("Antwort konnte nicht gelesen werden"));
        }
      } else {
        reject(new Error(`Upload fehlgeschlagen (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload fehlgeschlagen - bist du online?"));
    xhr.ontimeout = () => reject(new Error("Upload hat zu lange gedauert - bitte erneut versuchen"));

    xhr.send(form);
  });
}

export async function deletePhoto(id: string): Promise<void> {
  const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Löschen fehlgeschlagen");
}

// Verkleinert/komprimiert im Browser vor dem Upload (Handyfotos sind oft mehrere MB) -
// spart Datenvolumen und Speicherplatz auf dem Server. Schlaegt die Komprimierung fehl
// (z.B. ungewoehnliches Format), wird die Originaldatei unveraendert hochgeladen.
export async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  let width = bitmap.width;
  let height = bitmap.height;
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas nicht verfügbar");
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    // Manche mobilen Browser rufen den toBlob-Callback bei sehr grossen Bildern nie auf,
    // statt einen Fehler zu werfen - ohne Timeout wuerde das Formular dann unbemerkt haengen.
    const timer = setTimeout(() => reject(new Error("Komprimierung hat zu lange gedauert")), 15000);
    canvas.toBlob(
      (blob) => {
        clearTimeout(timer);
        if (blob) resolve(blob);
        else reject(new Error("Komprimierung fehlgeschlagen"));
      },
      "image/jpeg",
      quality,
    );
  });
}
