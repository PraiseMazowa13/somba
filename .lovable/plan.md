## Zandu Marketplace — Plan du MVP

Marketplace multi-vendeurs où chaque vendeur crée sa boutique et vend toutes catégories de produits (vêtements, chaussures, accessoires, etc.), et où les acheteurs commandent en toute sécurité. Style « Pro & confiance » (navy + blanc + accents bleu).

### Activation de Lovable Cloud
Backend nécessaire (auth, base de données, stockage images) → j'active Lovable Cloud en premier.

### Rôles
- **Acheteur** (par défaut à l'inscription)
- **Vendeur** (devient vendeur en créant sa boutique)
- **Admin** (gère les catégories, modère)

Les rôles sont stockés dans une table `user_roles` séparée (sécurité — pas dans `profiles`).

### Pages / Routes
- `/` — Accueil : hero, catégories, produits vedettes, boutiques mises en avant
- `/categories/$slug` — Liste des produits par catégorie
- `/search` — Recherche avec filtres (catégorie, prix, boutique)
- `/products/$id` — Fiche produit + bouton « Ajouter au panier »
- `/shops` — Annuaire des boutiques
- `/shops/$slug` — Page boutique publique
- `/cart` — Panier (multi-vendeurs, sous-totaux par boutique)
- `/checkout` — Adresse de livraison + récap (paiement à brancher après)
- `/login` + `/signup` + `/reset-password`
- `/account` — Profil + mes commandes
- `/seller/onboarding` — Devenir vendeur (créer sa boutique)
- `/seller/dashboard` — Tableau de bord vendeur
- `/seller/products` — Ses produits (CRUD)
- `/seller/orders` — Commandes reçues
- `/admin` — Gestion catégories + modération boutiques/produits

### Schéma base de données
- `profiles` (id, full_name, avatar_url, phone)
- `user_roles` (user_id, role: 'buyer'|'seller'|'admin')
- `categories` (id, name, slug, parent_id, image_url) — créées par l'admin
- `shops` (id, owner_id, name, slug, description, logo_url, banner_url, status: pending|approved|suspended)
- `products` (id, shop_id, category_id, title, description, price, stock, images[], status)
- `carts` + `cart_items`
- `orders` + `order_items` (avec shop_id sur chaque item pour split multi-vendeurs)
- `addresses`

RLS sur toutes les tables, fonction `has_role()` security definer.

### Sécurité acheteur
- Auth email/mot de passe + Google
- Validation stricte des entrées (Zod) côté client ET serveur (server functions)
- RLS : un acheteur voit seulement ses commandes ; un vendeur voit seulement les commandes de sa boutique
- Stockage images produits via Lovable Cloud Storage avec policies
- Pas de paiement réel dans ce MVP — checkout enregistre la commande en statut « en attente de paiement » ; on branchera Stripe/Paddle ensuite

### Design
- Palette : navy `#0f1b3d`, bleu `#3b6fa0`, gris clair `#f5f7fa`, blanc `#e8edf3`
- Typo pro et lisible
- Composants soignés, cartes produits nettes, badges de confiance

### Hors scope V1 (à brancher après)
- Paiement réel (Stripe/Paddle)
- Avis/notes, messagerie acheteur↔vendeur, expédition/tracking, retraits vendeurs

Je construis dans cet ordre : Cloud + schéma → auth → catalogue public → espace vendeur → panier/checkout → admin.