import React, { useEffect } from 'react';
import { DEFAULT_SEO_CONFIG, ROUTE_SEO_PRESETS, SEOMetadata } from './seo-config';

function setMetaTag(selector: string, attribute: 'name' | 'property', attrValue: string, content: string) {
  if (typeof document === 'undefined') return;
  let element = document.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setCanonicalLink(href: string) {
  if (typeof document === 'undefined') return;
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

/**
 * Hook centralizado para atualização de títulos e tags Open Graph
 */
export function useSEO(metadata?: Partial<SEOMetadata>, pathname?: string) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const routePreset = pathname ? ROUTE_SEO_PRESETS[pathname] : undefined;
    const title = metadata?.title || routePreset?.title || DEFAULT_SEO_CONFIG.title;
    const description = metadata?.description || routePreset?.description || DEFAULT_SEO_CONFIG.description;
    const ogImage = metadata?.ogImage || DEFAULT_SEO_CONFIG.ogImage;
    const ogType = metadata?.ogType || DEFAULT_SEO_CONFIG.ogType;
    const ogSiteName = metadata?.ogSiteName || DEFAULT_SEO_CONFIG.ogSiteName;
    const locale = metadata?.locale || DEFAULT_SEO_CONFIG.locale;
    const twitterCard = metadata?.twitterCard || DEFAULT_SEO_CONFIG.twitterCard;
    const canonicalUrl = metadata?.canonicalUrl || (pathname ? `https://www.defesai.shop${pathname === '/' ? '' : pathname}` : DEFAULT_SEO_CONFIG.canonicalUrl);
    const noIndex = metadata?.noIndex ?? routePreset?.noIndex ?? DEFAULT_SEO_CONFIG.noIndex;

    // Document title
    document.title = title;

    // Standard description & robots
    setMetaTag('meta[name="description"]', 'name', 'description', description);
    setMetaTag('meta[name="robots"]', 'name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');
    setCanonicalLink(canonicalUrl);

    // Open Graph / Facebook / WhatsApp
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', title);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', ogImage);
    setMetaTag('meta[property="og:image:secure_url"]', 'property', 'og:image:secure_url', ogImage);
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', ogType);
    setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', ogSiteName);
    setMetaTag('meta[property="og:locale"]', 'property', 'og:locale', locale);

    // Twitter Card
    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', twitterCard);
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', ogImage);
  }, [metadata, pathname]);
}

/**
 * Componente declarativo de SEO
 */
export const SEO: React.FC<SEOMetadata & { pathname?: string }> = ({ pathname, ...metaProps }) => {
  useSEO(metaProps, pathname);
  return null;
};
