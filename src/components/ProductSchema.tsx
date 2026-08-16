import React from 'react';

type Product = {
  name: string;
  public_name?: string | null;
  price: number;
  special_price?: number | null;
  stock: number;
  category_brand?: string | null;
  product_code?: string | null;
  url_slug: string;
  uploaded_image_url?: string | null;
  image_url?: string | null;
  description?: string | null;
  description_ai_enhanced?: string | null;
  category_general?: string[] | null;
  updated_at?: string | null;
  review_count?: number | null;
  avg_rating?: number | null;
};

type Review = {
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

export function ProductSchema({ 
  product, 
  reviews, 
  schemaDescriptionOverride 
}: { 
  product: Product; 
  reviews?: Review[]; 
  schemaDescriptionOverride?: string | null; 
}) {
  const displayName = product.public_name || toTitleCase(product.name);
  const price = product.special_price && product.special_price > 0 ? product.special_price : product.price;
  const image = product.uploaded_image_url || product.image_url;
  const description = schemaDescriptionOverride 
    || product.description_ai_enhanced 
    || product.description 
    || `${displayName} disponible en Tiempo de Mascotas, petshop y veterinaria en Asunción, Paraguay. Envíos a todo el país.`;
  const priceValidUntil = new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0];
  const url = `https://tiempodemascotas.com.py/${product.url_slug}`;

  // No emitir merchant fields si no hay imagen válida
  const hasValidImage = 
    !!image && 
    (image.startsWith('https://') || image.startsWith('http://')) &&
    !image.includes('placeholder') &&
    !image.includes('no-image');

  const jsonLd: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": displayName,
    "description": description,
    "url": url,
    ...(hasValidImage && { "image": image }),
    ...(product.category_brand && product.category_brand !== 'Otros' && {
      "brand": { "@type": "Brand", "name": product.category_brand }
    }),
    ...(product.product_code && { "sku": product.product_code, "mpn": product.product_code, "gtin13": product.product_code }),
    ...(product.review_count && product.review_count > 0 && product.avg_rating && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": Number(product.avg_rating).toFixed(1),
        "reviewCount": product.review_count,
        "bestRating": 5,
        "worstRating": 1
      }
    }),
    ...(reviews && reviews.length > 0 && {
      "review": reviews.map(r => ({
        "@type": "Review",
        "author": { "@type": "Person", "name": r.author_name },
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": r.rating,
          "bestRating": 5,
          "worstRating": 1
        },
        "reviewBody": r.comment,
        "datePublished": r.created_at ? r.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
      }))
    })
  };

  if (hasValidImage) {
    jsonLd.offers = {
      "@type": "Offer",
      "url": url,
      "priceCurrency": "PYG",
      "price": price,
      "priceValidFrom": product.updated_at
        ? new Date(product.updated_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      "priceValidUntil": priceValidUntil,
      "availability": product.stock > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      "itemCondition": "https://schema.org/NewCondition",
      "seller": { "@type": "Organization", "name": "Tiempo de Mascotas" },
      "shippingDetails": {
        "@type": "OfferShippingDetails",
        "shippingRate": {
          "@type": "MonetaryAmount",
          "value": "0",
          "currency": "PYG"
        },
        "shippingDestination": {
          "@type": "DefinedRegion",
          "addressCountry": "PY"
        },
        "deliveryTime": {
          "@type": "ShippingDeliveryTime",
          "handlingTime": { "@type": "QuantitativeValue", "minValue": 0, "maxValue": 1, "unitCode": "DAY" },
          "transitTime": { "@type": "QuantitativeValue", "minValue": 1, "maxValue": 3, "unitCode": "DAY" }
        }
      },
      "hasMerchantReturnPolicy": {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": "PY",
        "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
        "merchantReturnDays": 7,
        "returnMethod": "https://schema.org/ReturnByMail",
        "returnFees": "https://schema.org/FreeReturn"
      }
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
