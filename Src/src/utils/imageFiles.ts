// Helpers for reading local files into base64 data the backend can use.

export const ACCEPTED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp'
];

export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

export interface LoadedImage {
  id: string;
  name: string;
  dataUrl: string;
}

export function isAcceptedFile(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export interface LoadFilesResult {
  images: LoadedImage[];
  errors: string[];
}

export async function loadImageFiles(files: File[]): Promise<LoadFilesResult> {
  const images: LoadedImage[] = [];
  const errors: string[] = [];

  for (const file of files) {
    if (!isAcceptedFile(file)) {
      errors.push(`${file.name}: unsupported file type.`);
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      errors.push(`${file.name}: file is larger than 20 MB.`);
      continue;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      images.push({
        id: `${file.name}-${crypto.randomUUID()}`,
        name: file.name,
        dataUrl
      });
    } catch {
      errors.push(`${file.name}: failed to read.`);
    }
  }

  return { images, errors };
}
