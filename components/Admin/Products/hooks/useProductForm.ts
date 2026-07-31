'use client';

import { useState } from 'react';
import type { AdminCatalogProduct } from '@/lib/adapters/catalogAdapter';
import type { AdminCatalogCategory, AdminProductPayload } from '@/lib/services/adminCatalogService';
import { deleteAdminProductImage, uploadAdminProductImage } from '@/lib/services/admin/client';
import type { ImportedProductData } from '@/components/Admin/Products/ProductUrlImporter';
import { useProductPricing, CUOTA_OPTIONS } from './useProductPricing';
import { useCategoryCascade } from './useCategoryCascade';

function toImagesText(images: string[]): string {
  return images.join('\n');
}

function fromImagesText(value: string): string[] {
  return value
    .split('\n')
    .map((image) => image.trim())
    .filter(Boolean);
}

function slugifyName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 100);
}

type UseProductFormInput = {
  mode: 'create' | 'edit';
  product?: AdminCatalogProduct;
  categories: AdminCatalogCategory[];
  isSaving: boolean;
  onSubmit: (productId: string | null, payload: AdminProductPayload) => Promise<void>;
  onCancel: () => void;
};

export function useProductForm({ mode, product, categories, isSaving, onSubmit }: UseProductFormInput) {
  const isCreate = mode === 'create';

  const pricing = useProductPricing({ mode, product });

  const initialCategoryIds = isCreate ? undefined : product!.categoryIds;
  const cascade = useCategoryCascade({ categories, initialCategoryIds });

  const [name, setName] = useState(isCreate ? '' : product!.name);
  const [slug, setSlug] = useState(isCreate ? '' : product!.slug);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [featured, setFeatured] = useState(isCreate ? false : product!.featured);
  const [tendencias, setTendencias] = useState(isCreate ? false : product!.tendencias);
  const [status, setStatus] = useState<AdminProductPayload['status']>(isCreate ? 'ACTIVE' : product!.status);
  const [description, setDescription] = useState(isCreate ? '' : product!.description);
  const [imageUrl, setImageUrl] = useState(isCreate ? '' : product!.imageUrl);
  const [carouselImages, setCarouselImages] = useState(isCreate ? '' : toImagesText(product!.carouselImages));
  const [isUploading, setIsUploading] = useState(false);
  const [stock, setStock] = useState(isCreate ? '0' : product!.stock.toString());
  const [imageError, setImageError] = useState('');
  const [priceChangeReason, setPriceChangeReason] = useState('');

  const controlsDisabled = isSaving || isUploading;

  const currentCarouselImages = fromImagesText(carouselImages);

  const handleNameChange = (value: string) => {
    setName(value);
    if (isCreate && !slugManuallyEdited) {
      setSlug(slugifyName(value));
    }
  };

  const handleImport = (data: ImportedProductData) => {
    setName(data.name);
    setSlug(slugifyName(data.name));
    setSlugManuallyEdited(false);
    setDescription(data.description);
    setImageUrl(data.images[0] || '');
    setCarouselImages(data.images.join('\n'));
    if (data.referencePrice) {
      pricing.setReferencePrice(data.referencePrice.toString());
      if (data.source === 'enova') {
        const precioDirecto = data.referencePrice.toString();
        pricing.setPrice(precioDirecto);
        pricing.handlePriceChange(precioDirecto);
      } else {
        const nuevoPrecio = (data.referencePrice * 3).toString();
        pricing.setPrice(nuevoPrecio);
        pricing.handlePriceChange(nuevoPrecio);
      }
    }
    if (data.categoryName) {
      const match = cascade.findCategoryByName(data.categoryName, categories);
      if (match) {
        if (!match.parentId) {
          cascade.setCascadeMadre(match.id);
        } else {
          const parent = categories.find(c => c.id === match.parentId);
          if (parent && !parent.parentId) {
            cascade.setCascadeMadre(parent.id);
            cascade.setCascadeChild(match.id);
          } else if (parent) {
            const grandparent = categories.find(c => c.id === parent.parentId);
            if (grandparent && !grandparent.parentId) {
              cascade.setCascadeMadre(grandparent.id);
              cascade.setCascadeChild(parent.id);
              cascade.setCascadeGrandchild(match.id);
            }
          }
        }
      }
    }
  };

  const handleUploadMainImage = async (file: File | undefined) => {
    if (!file || isCreate) return;

    setIsUploading(true);
    setImageError('');

    try {
      const image = await uploadAdminProductImage(product!.id, file);
      setImageUrl(image.url);
    } catch (uploadError) {
      console.error('Error uploading main product image:', uploadError);
      setImageError(uploadError instanceof Error ? uploadError.message : 'No se pudo subir la imagen principal');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadCarouselImages = async (files: FileList | null) => {
    if (!files?.length || isCreate) return;

    setIsUploading(true);
    setImageError('');
    const uploadedImages: Array<{ url: string }> = [];

    try {
      for (const file of Array.from(files)) {
        uploadedImages.push(await uploadAdminProductImage(product!.id, file));
      }

      setCarouselImages(toImagesText([...currentCarouselImages, ...uploadedImages.map((image) => image.url)]));
    } catch (uploadError) {
      if (uploadedImages.length > 0) {
        setCarouselImages(toImagesText([...currentCarouselImages, ...uploadedImages.map((image) => image.url)]));
      }
      console.error('Error uploading carousel product images:', uploadError);
      setImageError(uploadError instanceof Error ? uploadError.message : 'No se pudieron subir las imágenes');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async (url: string, onRemove: () => void) => {
    if (isCreate) return;

    setIsUploading(true);
    setImageError('');

    try {
      await deleteAdminProductImage(url, product!.id);
      onRemove();
    } catch (deleteError) {
      console.error('Error deleting product image:', deleteError);
      setImageError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar la imagen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void onSubmit(isCreate ? null : product!.id, {
      categoryId: cascade.resolvedCategoryIds[0] ?? null,
      categoryIds: cascade.resolvedCategoryIds,
      name,
      slug,
      description,
      price: Number(pricing.price),
      compareAtPrice: isCreate ? null : product!.compareAtPrice,
      discountLabel: isCreate ? '' : product!.discountLabel,
      referencePrice: pricing.referencePrice ? Number(pricing.referencePrice) : null,
      installmentCount: pricing.installmentCount ? parseInt(pricing.installmentCount, 10) : null,
      installmentAmount: pricing.installmentAmount ? parseFloat(pricing.installmentAmount) : null,
      stock: Number(stock), 
      status,
      featured,
      tendencias,
      imageUrl,
      carouselImages: currentCarouselImages,
      priceChangeReason: isCreate ? undefined : priceChangeReason.trim() || null,
    });
  };

  const title = isCreate ? 'Crear Producto Nuevo' : 'Editar Producto';
  const submitLabel = isCreate ? 'Crear producto' : 'Guardar cambios';

  return {
    mode,
    isCreate,
    product,
    categories,

    name, setName,
    slug, setSlug,
    slugManuallyEdited, setSlugManuallyEdited,
    featured, setFeatured,
    tendencias, setTendencias,
    status, setStatus,
    description, setDescription,
    imageUrl, setImageUrl,
    carouselImages, setCarouselImages,
    stock, setStock,
    isUploading,
    imageError,
    controlsDisabled,
    currentCarouselImages,
    priceChangeReason, setPriceChangeReason,

    pricing,
    cascade,

    title,
    submitLabel,
    handleNameChange,
    handleImport,
    handleUploadMainImage,
    handleUploadCarouselImages,
    handleRemoveImage,
    handleSubmit,
  };
}
