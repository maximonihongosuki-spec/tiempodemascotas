import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/owner/',
          '/admin/',
          '/miembros/',
          '/*?*add-to-cart=',
          '/*?*checkout=',
          '/carrito',
          '/checkout',
        ],
      },
    ],
    sitemap: 'https://tiempodemascotas.com.py/sitemap.xml',
    host: 'https://tiempodemascotas.com.py',
  };
}
