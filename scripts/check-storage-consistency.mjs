import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || 'product-images';

function fail(message) {
  console.error(`[storage-consistency] FAIL: ${message}`);
  process.exitCode = 1;
}

function extractPathFromPublicUrl(url) {
  if (!url || typeof url !== 'string') return null;

  try {
    const parsedUrl = new URL(url);
    const marker = `/storage/v1/object/public/${bucketName}/`;
    const markerIndex = parsedUrl.pathname.indexOf(marker);
    return markerIndex === -1 ? null : decodeURIComponent(parsedUrl.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

async function listStoragePaths(supabase, prefix = '') {
  const { data, error } = await supabase.storage.from(bucketName).list(prefix, { limit: 1000 });

  if (error) throw error;

  const paths = [];

  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;

    if (item.id) {
      paths.push(path);
    } else {
      paths.push(...await listStoragePaths(supabase, path));
    }
  }

  return paths;
}

if (!supabaseUrl) fail('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
if (!serviceRoleKey) fail('Missing SUPABASE_SERVICE_ROLE_KEY');
if (process.exitCode) process.exit();

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: products, error: productsError } = await supabase
  .from('products')
  .select('id, name, image_url, carousel_images');

if (productsError) {
  fail(`Could not read products: ${productsError.message}`);
  process.exit();
}

let storagePaths = [];

try {
  storagePaths = await listStoragePaths(supabase);
} catch (error) {
  fail(`Could not list storage bucket ${bucketName}: ${error.message}`);
  process.exit();
}

const storagePathSet = new Set(storagePaths);
const dbPaths = new Set();
const externalUrls = [];
const brokenUrls = [];

for (const product of products ?? []) {
  const urls = [product.image_url, ...(Array.isArray(product.carousel_images) ? product.carousel_images : [])]
    .filter((url) => typeof url === 'string' && url.trim());

  for (const url of urls) {
    const path = extractPathFromPublicUrl(url);

    if (!path) {
      externalUrls.push({ productId: product.id, productName: product.name, url });
      continue;
    }

    dbPaths.add(path);

    if (!storagePathSet.has(path)) {
      brokenUrls.push({ productId: product.id, productName: product.name, url, path });
    }
  }
}

const orphanObjects = storagePaths.filter((path) => !dbPaths.has(path));
const report = {
  bucket: bucketName,
  productCount: products?.length ?? 0,
  storageObjectCount: storagePaths.length,
  referencedStorageObjectCount: dbPaths.size,
  orphanObjectCount: orphanObjects.length,
  brokenUrlCount: brokenUrls.length,
  externalUrlCount: externalUrls.length,
  orphanObjects,
  brokenUrls,
  externalUrls,
};

console.log(JSON.stringify(report, null, 2));

if (orphanObjects.length > 0 || brokenUrls.length > 0) {
  fail('STORAGE_INCONSISTENT');
}
