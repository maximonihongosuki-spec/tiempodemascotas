'use client';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function MetadataUpdater() {
  useEffect(() => {
    const updateSiteMetadata = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('business_name, logo_url, uploaded_logo_url, business_email, business_address')
          .maybeSingle();

        if (error || !data) return;

        const faviconUrl = data.uploaded_logo_url || data.logo_url;
        const businessName = data.business_name || "Tiempo de Mascotas";
        
        if (faviconUrl) {
          const favicon = document.getElementById('favicon') as HTMLLinkElement;
          if (favicon) {
            favicon.href = faviconUrl;
          }

          const ogImage = document.querySelector('meta[property="og:image"]') as HTMLMetaElement;
          if (ogImage) ogImage.content = faviconUrl;

          const twitterImage = document.querySelector('meta[name="twitter:image"]') as HTMLMetaElement;
          if (twitterImage) twitterImage.content = faviconUrl;
        }

        document.title = "Tiempo de Mascotas — Petshop y Farmacia Veterinaria";

        const ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement;
        if (ogTitle) ogTitle.content = "Tiempo de Mascotas — Petshop y Farmacia Veterinaria en Paraguay";

        // JSON-LD Structured Data Injection
        // We use window.location.origin for absolute URLs
        const origin = typeof window !== 'undefined' ? window.location.origin : '';

        // 1. Organization / Store Schema
        const organizationSchema = {
          "@context": "https://schema.org",
          "@type": "PetStore",
          "name": businessName,
          "url": origin,
          "logo": faviconUrl,
          "description": "Petshop online en Paraguay. Alimentos, medicamentos, juguetes y accesorios para mascotas. Delivery y retiro en el local.",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Asunción",
            "addressRegion": "Central",
            "addressCountry": "PY"
          },
          "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "sales",
            "email": data.business_email || ""
          }
        };

        const injectSchema = (id: string, schema: object) => {
          let el = document.getElementById(id) as HTMLScriptElement;
          if (!el) {
            el = document.createElement('script');
            el.id = id;
            el.type = 'application/ld+json';
            document.head.appendChild(el);
          }
          el.text = JSON.stringify(schema);
        };

        injectSchema('schema-org-ld', organizationSchema);
        
      } catch (error) {
        console.error('Error loading site metadata:', error);
      }
    };

    updateSiteMetadata();
  }, []);

  return null;
}