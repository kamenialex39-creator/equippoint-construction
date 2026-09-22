# EquipPoint Construction — v4

Standalone e-commerce foundation.

New in v4:
- Expanded catalog data in catalog.json
- 30 catalog products across major categories
- Search and category filtering
- Product quick-view
- Cart persistence
- Quote/enquiry flow
- No Zairo Digital branding or credit

Catalog prices are demo/reference values and should be verified against the final supplier catalog before launch.


## v5 — Product pages
- Dedicated `product.html?id=PRODUCT_ID` pages
- Product descriptions, specifications, availability and quantity controls
- Add-to-cart from product pages using the existing localStorage cart
- Related product recommendations
- WhatsApp enquiry link
- Mobile-responsive product detail layout
- No third-party agency branding or credit included

## Product image system
Each catalog item now has an `image.src` path under `assets/products/`.
The included SVGs are temporary structured placeholders so the layout works immediately.
Replace each corresponding SVG with a real product photo, or update `image.src` in `catalog.json` to a `.jpg`, `.png`, or `.webp` file.
Recommended product-photo format: landscape 4:3 or 3:2, clean background, minimum 1200px wide.
