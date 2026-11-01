# Project rules
- Compute seller dashboard statistics in a pure browser-safe helper, keeping currencies separate and using order statuses, so financial totals can be tested without UI or network dependencies.
- The shops parent route renders Outlet for shop-detail URLs and the directory only at /shops, so direct links display the dedicated storefront.
- The admin parent renders Outlet on detail URLs and executes all hooks before access-state returns, so management links and changing sessions remain reliable.
- Share all boutique links through ShopShareButton using the public site origin, with native sharing and an accessible copy/WhatsApp fallback.
- Keep seller product filtering and currency-aware sorting in a pure helper; persistent featured flags order public catalogs, and only admins may feature shops.