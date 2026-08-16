#!/usr/bin/env node
/**
 * Script one-time: aplica Cache-Control: max-age=31536000 a TODOS los archivos
 * del bucket 'product-images' de Supabase Storage.
 *
 * Uso:
 *   1. Asegurarse de tener .env.local con SUPABASE_SERVICE_ROLE_KEY y NEXT_PUBLIC_SUPABASE_URL.
 *   2. Correr: node scripts/migrate-cache-control.mjs
 *
 * NO es un script de Vercel — corre LOCAL en la máquina de Maximo.
 *
 * Tiempo estimado: ~5-15 minutos para ~1500 archivos según conexión.
 * Egress estimado del run: ~150 MB de download + 150 MB de upload.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar .env.local desde la raíz del proyecto
config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const BUCKET = 'product-images';
const NEW_CACHE_CONTROL = '31536000'; // 1 año en segundos

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// Lista archivos recursivamente (incluye subfolders como categories/, species/, etc.)
async function listAllFiles(prefix = '') {
  const allFiles = [];
  let offset = 0;
  const LIMIT = 100;

  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: LIMIT, offset, sortBy: { column: 'name', order: 'asc' } });

    if (error) {
      console.error(`❌ Error listando ${prefix}:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;

    for (const item of data) {
      // Si es carpeta (id null), entrar recursivamente
      if (!item.id) {
        const subPath = prefix ? `${prefix}/${item.name}` : item.name;
        const subFiles = await listAllFiles(subPath);
        allFiles.push(...subFiles);
      } else {
        const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
        allFiles.push({ path: fullPath, size: item.metadata?.size || 0 });
      }
    }

    if (data.length < LIMIT) break;
    offset += LIMIT;
  }

  return allFiles;
}

async function migrateFile(filePath) {
  try {
    // Descargar
    const { data: blob, error: dlError } = await supabase.storage
      .from(BUCKET)
      .download(filePath);

    if (dlError || !blob) {
      return { ok: false, error: `download: ${dlError?.message || 'no blob'}` };
    }

    // Re-subir con cache largo
    const { error: upError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, blob, {
        cacheControl: NEW_CACHE_CONTROL,
        contentType: blob.type || 'image/webp',
        upsert: true,
      });

    if (upError) {
      return { ok: false, error: `upload: ${upError.message}` };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  console.log('🔍 Listando archivos del bucket...');
  const files = await listAllFiles();
  console.log(`📦 Encontrados ${files.length} archivos.`);
  
  if (files.length === 0) {
    console.log('Nada que migrar. Saliendo.');
    return;
  }

  const totalSizeMB = files.reduce((s, f) => s + f.size, 0) / 1024 / 1024;
  console.log(`📊 Tamaño total estimado: ${totalSizeMB.toFixed(1)} MB`);
  console.log('');
  console.log('⚠️ El script va a descargar + re-subir cada archivo. Esto consume egress.');
  console.log('   Estimado: ' + (totalSizeMB * 2).toFixed(1) + ' MB de tráfico.');
  console.log('   Tiempo estimado: ' + Math.ceil(files.length / 5) + ' segundos.');
  console.log('');
  console.log('   Iniciando en 5 segundos... (Ctrl+C para abortar)');
  await new Promise(r => setTimeout(r, 5000));

  let migrated = 0;
  let failed = 0;
  const errors = [];
  const startTime = Date.now();

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const result = await migrateFile(f.path);

    if (result.ok) {
      migrated++;
    } else {
      failed++;
      errors.push(`${f.path}: ${result.error}`);
    }

    // Progreso cada 25 archivos
    if ((i + 1) % 25 === 0 || i === files.length - 1) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const pct = (((i + 1) / files.length) * 100).toFixed(1);
      console.log(`[${pct}%] ${i + 1}/${files.length} — ok:${migrated} fail:${failed} — ${elapsed}s`);
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log(`✅ Migración completada en ${((Date.now() - startTime) / 1000).toFixed(0)}s`);
  console.log(`   Migrados:  ${migrated}`);
  console.log(`   Fallidos:  ${failed}`);
  console.log('═══════════════════════════════════════════════');

  if (errors.length > 0) {
    console.log('');
    console.log('Primeros 20 errores:');
    errors.slice(0, 20).forEach(e => console.log('  - ' + e));
  }
}

main().catch(err => {
  console.error('💥 Fatal:', err);
  process.exit(1);
});

// INSTRUCCIONES PARA MAXIMO PARA EJECUTAR EL SCRIPT:
// 1. Asegurarse de tener .env.local con las siguientes claves:
//    NEXT_PUBLIC_SUPABASE_URL=https://acvsdhysykaybcoctdhc.supabase.co
//    SUPABASE_SERVICE_ROLE_KEY=eyJh... (la service role key de tu proyecto, NO la anon)
// 2. Ejecutar el comando en la terminal:
//    node scripts/migrate-cache-control.mjs
//    o usar el script alias de npm:
//    npm run migrate:cache
// 3. El script imprimirá progreso cada 25 archivos. Al terminar, listará estadísticas de éxito y error.
// 4. Verificá en el panel de red de tu navegador (DevTools -> Network) que las imágenes nuevas tengan la cabecera "cache-control: max-age=31536000".
