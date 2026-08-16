import { supabase } from './supabase';

export async function uploadImageToStorage(
  input: File | Blob,
  folder: string
): Promise<string> {
  const contentType = (input as File).type || 'application/octet-stream';
  const res = await fetch('/api/convert-to-webp', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: input,
  });
  if (!res.ok) throw new Error(`Error al optimizar imagen: ${res.status}`);
  const webpBlob = await res.blob();
  if (!webpBlob.type.startsWith('image/')) {
    throw new Error('El servicio de optimización devolvió contenido inválido');
  }

  const filename = `${folder}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from('product-images')
    .upload(filename, webpBlob, { contentType: 'image/webp', upsert: false });
  if (error) throw new Error(`Error subiendo a Storage: ${error.message}`);

  const { data } = supabase.storage.from('product-images').getPublicUrl(filename);
  return data.publicUrl;
}

export function assertNoBase64(payload: Record<string, any>): void {
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'string' && value.startsWith('data:')) {
      throw new Error(`Campo "${key}" contiene base64. Usá uploadImageToStorage() antes de guardar.`);
    }
  }
}
