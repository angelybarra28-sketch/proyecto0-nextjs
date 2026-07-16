-- Fix products that imported the Fravega logo as their product image
-- The old HTML scraper grabbed og:image = https://www.fravega.com/static/logo-fravega@3x.png
-- Now we use the GraphQL API which returns real product images.

UPDATE products
SET
  image_url = NULL,
  carousel_images = '[]'::jsonb,
  updated_at = now()
WHERE
  image_url LIKE '%fravega.com/static/logo-fravega%'
  OR image_url LIKE '%fravega.com/static/iso_fvg%';
