# Free SEO for LAXCommute

The homepage includes a descriptive title, description, canonical URL, social sharing metadata, WebSite/WebApplication structured data, and a visible employee shuttle boarding guide in the initial HTML. The guide stays visible after React loads. `public/robots.txt` points to `public/sitemap.xml`. The sitemap lists only the canonical homepage; the QR poster path `/employee-shuttles` serves the same app and declares the homepage as its canonical URL.

## After deploying

1. Confirm the homepage returns HTTP 200 and is publicly reachable. SEO cannot work while a site returns 404 or requires sign-in. Check `/robots.txt` and `/sitemap.xml` too.
2. Open [Google Search Console](https://search.google.com/search-console/) with your Google account. It is free.
3. Add a **URL-prefix** property: `https://employeeshuttlelax.com/`. Alternatively, verify a Domain property using your domain’s DNS settings.
4. Choose **HTML tag** verification. Copy only its `content` value into the Cloudflare build variable `VITE_GOOGLE_SITE_VERIFICATION`, then rebuild/deploy. Keep the token in later builds so verification stays valid. No token is included until one is supplied.
5. Click Verify in Search Console. Submit `sitemap.xml` under Sitemaps.
6. Inspect the homepage URL, run Test live URL, and choose Request indexing. Submission and structured data do not guarantee indexing, rankings, or rich results.
7. Review Performance over time for employee shuttle search queries, impressions, and clicks. Improve the content using actual rider questions.

## Search terms and useful links

Focus on LAX employee shuttle tracker, LAX employee shuttle tracking, LAX South Lot shuttle, LAX East Lot shuttle and LAX West Lot shuttle. Broad LAX shuttle queries also include hotel, FlyAway and passenger transport intent.

Share the tool with employees where posting is permitted and ask relevant airport employee resources to link to it when useful. Keep boarding information accurate and current. Do not buy links, add fake reviews, or repeat keyword lists.

The canonical, sharing, structured-data, robots and sitemap URLs use https://employeeshuttlelax.com. If you change the domain, update all of them together. Keep a permanent redirect from the old domain when possible.

## References

- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Verify site ownership](https://support.google.com/webmasters/answer/9008080)

No paid advertising or SEO subscription is required. Nobody can guarantee first place in search results.
