import React from 'react';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function OrgLocalBusinessSchema() {
  const supabase = getSupabase();
  
  const [settingsResult, locationsResult] = await Promise.all([
    supabase.from('site_settings').select('*').maybeSingle(),
    supabase.from('locations').select('*').order('created_at', { ascending: true })
  ]);
  
  const settings = settingsResult?.data || {};
  const locations = locationsResult?.data || [];
  
  const logo = settings.uploaded_logo_url || settings.logo_url || 'https://tiempodemascotas.com.py/site-assets/6989ecdb-aadc-437e-8f9b-2ba92a539edb.webp';
  const businessName = settings.business_name || 'Tiempo de Mascotas';
  const phone = settings.whatsapp_number || '+595991525700';
  const email = settings.business_email || 'contacto@tiempodemascotas.com.py';
  
  // Use first location or a default
  const mainLoc = locations[0] || {};
  const address = mainLoc.address || settings.business_address || 'Asunción, Paraguay';
  
  const facebookUrl = settings.facebook_url || 'https://www.facebook.com/tiempodemascotas';
  const instagramUrl = settings.instagram_url || 'https://www.instagram.com/tiempodemascotas';
  const sameAs = [];
  if (facebookUrl) sameAs.push(facebookUrl);
  if (instagramUrl) sameAs.push(instagramUrl);
  if (settings.tiktok_url) sameAs.push(settings.tiktok_url);
  if (settings.x_url) sameAs.push(settings.x_url);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://tiempodemascotas.com.py/#organization",
        "name": businessName,
        "url": "https://tiempodemascotas.com.py/",
        "logo": {
          "@type": "ImageObject",
          "url": logo,
          "width": 512,
          "height": 512
        },
        "sameAs": sameAs
      },
      {
        "@type": ["Store", "PetStore", "LocalBusiness"],
        "@id": "https://tiempodemascotas.com.py/#localbusiness",
        "name": businessName,
        "priceRange": "$$",
        "url": "https://tiempodemascotas.com.py/",
        "image": logo,
        "telephone": phone,
        "email": email || undefined,
        "address": {
          "@type": "PostalAddress",
          "streetAddress": address,
          "addressLocality": "Asunción",
          "addressRegion": "Central",
          "postalCode": "1209",
          "addressCountry": "PY"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": -25.313805677542774,
          "longitude": -57.62559728878209
        },
        "openingHoursSpecification": [
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
            "opens": "08:00",
            "closes": "20:00"
          }
        ],
        "areaServed": [
          { "@type": "City", "name": "Asunción" },
          { "@type": "AdministrativeArea", "name": "Gran Asunción" }
        ]
      },
      {
        "@type": "WebSite",
        "@id": "https://tiempodemascotas.com.py/#website",
        "url": "https://tiempodemascotas.com.py/",
        "name": businessName,
        "publisher": { "@id": "https://tiempodemascotas.com.py/#organization" },
        "inLanguage": "es-PY",
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://tiempodemascotas.com.py/productos?search={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        }
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
