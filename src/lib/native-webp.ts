// ════════════════════════════════════════════════════════════════
// Optimización WebP vía Cloudinary (replica exactamente el workflow n8n)
// Workflow n8n: Webhook → POST a /image/upload (preset unsigned) →
//               replace /upload/ por /upload/f_webp,q_82/ → descargar binario
// ════════════════════════════════════════════════════════════════

export type WebpInput =
  | { kind: 'file'; buffer: Buffer; filename?: string; contentType?: string }
  | { kind: 'url'; url: string };

export type WebpStage = {
  stage: string;
  status: 'ok' | 'error';
  detail: string;
  duration_ms: number;
  size_bytes?: number;
  data?: any;
};

export type WebpResult = {
  ok: boolean;
  buffer?: Buffer;
  stages: WebpStage[];
  error?: string;
  input_size_bytes?: number;
  output_size_bytes?: number;
};

const CLOUDINARY_CLOUD_NAME = 'draxdgeec';
const CLOUDINARY_UPLOAD_PRESET = 'gnbxephy';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

export async function nativeConvertToWebp(
  input: WebpInput,
  options?: { width?: number; height?: number }
): Promise<WebpResult> {
  const stages: WebpStage[] = [];
  let inputBuffer: Buffer;
  let inputContentType = 'application/octet-stream';
  let inputFilename = 'image';

  // ─── STAGE 1: obtener buffer de entrada ───
  let t0 = Date.now();
  try {
    if (input.kind === 'file') {
      inputBuffer = input.buffer;
      inputContentType = input.contentType || 'application/octet-stream';
      inputFilename = input.filename || 'image';
      stages.push({
        stage: 'Recepción de archivo',
        status: 'ok',
        detail: `Buffer: ${inputBuffer.length} bytes | Tipo: ${inputContentType} | Nombre: ${inputFilename}`,
        duration_ms: Date.now() - t0,
        size_bytes: inputBuffer.length,
      });
    } else {
      const res = await fetch(input.url);
      if (!res.ok) throw new Error(`HTTP ${res.status} al descargar URL fuente`);
      const arrayBuffer = await res.arrayBuffer();
      inputBuffer = Buffer.from(arrayBuffer);
      inputContentType = res.headers.get('content-type') || 'application/octet-stream';
      inputFilename = input.url.split('/').pop()?.split('?')[0] || 'image';
      stages.push({
        stage: 'Descarga de URL fuente',
        status: 'ok',
        detail: `Descargado | ${inputBuffer.length} bytes | ${inputContentType}`,
        duration_ms: Date.now() - t0,
        size_bytes: inputBuffer.length,
        data: { url: input.url },
      });
    }
  } catch (err: any) {
    stages.push({ stage: 'Obtener entrada', status: 'error', detail: err.message, duration_ms: Date.now() - t0 });
    return { ok: false, stages, error: err.message };
  }

  const inputSizeBytes = inputBuffer.length;

  // ─── STAGE 2: subir a Cloudinary (replica nodo "HTTP Request" de n8n) ───
  t0 = Date.now();
  let cloudinarySecureUrl: string;
  let cloudinaryMeta: any;
  try {
    const formData = new FormData();
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    const blob = new Blob([inputBuffer as any], { type: inputContentType });
    formData.append('file', blob, inputFilename);

    const uploadRes = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    const uploadText = await uploadRes.text();
    if (!uploadRes.ok) {
      throw new Error(`Cloudinary upload HTTP ${uploadRes.status}: ${uploadText.slice(0, 400)}`);
    }

    try {
      cloudinaryMeta = JSON.parse(uploadText);
    } catch {
      throw new Error(`Respuesta de Cloudinary no es JSON válido: ${uploadText.slice(0, 300)}`);
    }

    if (!cloudinaryMeta.secure_url) {
      throw new Error(`Cloudinary no devolvió secure_url. Respuesta: ${JSON.stringify(cloudinaryMeta).slice(0, 400)}`);
    }

    cloudinarySecureUrl = cloudinaryMeta.secure_url;
    stages.push({
      stage: 'Subida a Cloudinary (preset gnbxephy)',
      status: 'ok',
      detail: `secure_url obtenida | public_id: ${cloudinaryMeta.public_id} | formato origen: ${cloudinaryMeta.format} | dimensiones: ${cloudinaryMeta.width}×${cloudinaryMeta.height}px`,
      duration_ms: Date.now() - t0,
      data: {
        secure_url: cloudinarySecureUrl,
        public_id: cloudinaryMeta.public_id,
        format: cloudinaryMeta.format,
        width: cloudinaryMeta.width,
        height: cloudinaryMeta.height,
      },
    });
  } catch (err: any) {
    stages.push({ stage: 'Subida a Cloudinary', status: 'error', detail: err.message, duration_ms: Date.now() - t0 });
    return { ok: false, stages, error: err.message, input_size_bytes: inputSizeBytes };
  }

  // ─── STAGE 3: descargar versión transformada (replica nodo "Download WebP" de n8n) ───
  t0 = Date.now();
  const transform = (options?.width && options?.height)
    ? `c_fill,w_${options.width},h_${options.height},f_webp,q_82`
    : 'f_webp,q_82';
  const webpUrl = cloudinarySecureUrl.replace('/upload/', `/upload/${transform}/`);
  let webpBuffer: Buffer;
  try {
    const webpRes = await fetch(webpUrl);
    if (!webpRes.ok) {
      throw new Error(`Descarga WebP HTTP ${webpRes.status} desde ${webpUrl}`);
    }
    const webpArrayBuffer = await webpRes.arrayBuffer();
    webpBuffer = Buffer.from(webpArrayBuffer);
    const reduction = inputSizeBytes > 0
      ? (((inputSizeBytes - webpBuffer.length) / inputSizeBytes) * 100).toFixed(1)
      : '0.0';
    stages.push({
      stage: 'Descarga WebP transformado (f_webp, q=82)',
      status: 'ok',
      detail: `${inputSizeBytes} → ${webpBuffer.length} bytes (reducción ${reduction}%)`,
      duration_ms: Date.now() - t0,
      size_bytes: webpBuffer.length,
      data: { webpUrl },
    });
  } catch (err: any) {
    stages.push({ stage: 'Descarga WebP transformado', status: 'error', detail: err.message, duration_ms: Date.now() - t0 });
    return { ok: false, stages, error: err.message, input_size_bytes: inputSizeBytes };
  }

  return {
    ok: true,
    buffer: webpBuffer,
    stages,
    input_size_bytes: inputSizeBytes,
    output_size_bytes: webpBuffer.length,
  };
}

export async function applyBrandSealOverlay(
  imageFile: File | Blob,
  brandSealCloudinaryId: string,
  position: 'south_east' | 'south_west' | 'north_east' | 'north_west' = 'south_east'
): Promise<Blob> {
  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const uploadRes = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });
  const uploadData = await uploadRes.json();
  if (uploadData.error) throw new Error(uploadData.error.message);

  const basePublicId = uploadData.public_id;
  const sealIdEncoded = brandSealCloudinaryId.replace(/\//g, ':');
  const transformedUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/l_${sealIdEncoded},g_${position},x_15,y_15,w_0.18,fl_relative,o_85/${basePublicId}`;

  const finalRes = await fetch(transformedUrl);
  if (!finalRes.ok) throw new Error('Error al aplicar el sello de marca');
  return await finalRes.blob();
}

