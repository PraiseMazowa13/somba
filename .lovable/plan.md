
# MVP Marketplace RDC — Plan d'exécution

Objectif : livrer une version minimale mais complète couvrant acheteur, vendeur et admin. Mobile Money reporté — checkout = WhatsApp uniquement en v1.

## 1. Acheteur — Panier & Navigation

- **`ProductCard`** : ajouter bouton "Ajouter au panier" toujours visible (en plus du CTA hover "Voir le produit"). Clic → ajoute à `cart_items`, toast "Ajouté au panier". Si non connecté → redirige `/login`.
- **Page boutique** (`/shops/$slug` existe déjà) : vérifier qu'elle affiche bannière + logo + description + grille produits. Ajouter "Ajouter au panier" sur chaque carte.
- **Galerie multi-images produit** : la table `products` a déjà un champ image. Ajouter une colonne `images text[]` (migration) pour stocker plusieurs URLs. La page produit affiche la galerie (déjà en place).

## 2. Espace Vendeur

- **`/seller/settings`** (nouvelle route) : formulaire pour modifier nom, description, logo, bannière, adresse, **numéro WhatsApp** (champ profil `phone` réutilisé pour WhatsApp — le numéro vendeur sert au checkout).
  - Migration : ajouter `whatsapp_number text` à `shops` (plus propre que de réutiliser profile.phone, car la boutique peut avoir un numéro dédié).
- **`/seller/products`** : remplacer la liste simple par une grille avec image, nom, prix, badge stock (En stock / Rupture), boutons : Modifier, Dupliquer, Masquer/Afficher (toggle `is_active`).
  - Migration : ajouter `is_active boolean default true` à `products`.
- Édition produit : dialog/page de modification (formulaire pré-rempli).

## 3. Checkout WhatsApp

- **`/cart`** : remplacer "Commander" par deux boutons :
  - "Commander via WhatsApp" → groupe les items par boutique, ouvre `wa.me/<numero>?text=<récap commande>` (un onglet par boutique).
  - Le récap inclut : nom produit, qté, prix unitaire, total, infos client (nom + ville saisis dans un mini-form).
- Crée une commande en statut `pending_whatsapp` côté DB pour le suivi vendeur, puis vide le panier.

## 4. Espace Admin

- **`/admin`** (existe) : ajouter onglet "Boutiques" avec :
  - Barre de recherche (nom, ville).
  - Filtres : statut (active/pending/suspended), catégorie.
  - Tableau résultats → clic → **`/admin/shops/$id`** : fiche détail (infos, nombre produits, nombre commandes, CA total, boutons Activer/Suspendre).

## 5. Migrations DB

```sql
ALTER TABLE shops ADD COLUMN whatsapp_number text;
ALTER TABLE products ADD COLUMN is_active boolean NOT NULL DEFAULT true;
ALTER TABLE products ADD COLUMN images text[] NOT NULL DEFAULT '{}';
ALTER TABLE orders ADD COLUMN channel text NOT NULL DEFAULT 'standard'; -- 'whatsapp' | 'standard'
```

## Hors-scope v1 (itérations suivantes)

- Mobile Money intégré (M-Pesa/Orange/Airtel)
- Avis & évaluations
- Messagerie acheteur ↔ vendeur
- Promotions / codes promo
- Dashboard analytique vendeur
- Notifications SMS / temps réel
- Intégration livraison (Congo Express)

## Ordre d'implémentation

1. Migrations DB (whatsapp_number, is_active, images, channel)
2. `ProductCard` + bouton "Ajouter au panier" universel
3. Vérification / amélioration page boutique
4. Checkout WhatsApp dans `/cart`
5. `/seller/settings` + grille produits améliorée + édition
6. Admin : recherche boutiques + page détail

Chaque étape est testée avant de passer à la suivante.
