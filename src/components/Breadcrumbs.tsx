import React from 'react';

type Crumb = { name: string; url?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((c, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": c.name,
      ...(c.url && { "item": c.url })
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Migas de pan" className="flex items-center gap-2 text-gray-400 text-xs md:text-sm mb-3 font-display flex-wrap">
        {items.map((c, i) => (
          <span key={i} className="flex items-center gap-2">
            {c.url ? (
              <a href={c.url} className="hover:text-[#1A8A00] transition-colors">{c.name}</a>
            ) : (
              <span className="text-[#1E1B4B]">{c.name}</span>
            )}
            {i < items.length - 1 && <span>/</span>}
          </span>
        ))}
      </nav>
    </>
  );
}
