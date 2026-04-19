# Spec — Bugfixes & UX — 2026-04-19

## Scope

8 corrections indépendantes sur le frontend et les données de démo.

---

## 1. Seed données de démo
**Problème :** La page Leads et Automatisation sont vides — le script `seed_demo` existe mais n'a pas été exécuté.  
**Fix :** Exécuter `python -m backend.seed_demo` côté serveur au démarrage si aucun lead n'existe. Ou documenter la commande.  
**Scope :** backend/init_db.py ou commande manuelle.

---

## 2. Bouton "Appeler" dans Le Flux
**Problème :** `Immobilier.jsx:201` — `<button>` sans handler, les deals n'ont pas de champ `phone`.  
**Fix :** Transformer en `<a href="tel:...">` si `op.phone` existe, sinon griser avec tooltip "Numéro non disponible".  
**Fichier :** `src/pages/Immobilier.jsx`

---

## 3. Bouton "Détail" URL invalide
**Problème :** `href={op.url}` — certains deals ont `url` null ou pointent vers la racine du site.  
**Fix :** Désactiver le bouton si `!op.url` (style grisé, cursor-not-allowed). Les URLs valides s'ouvrent normalement.  
**Fichier :** `src/pages/Immobilier.jsx`

---

## 4. "Voir clients matchés" — modal vide
**Problème :** Le modal s'ouvre mais affiche rien ou reste en loading. Cause probable : `data` est null (erreur API silencieuse) ou `data.matches` est vide sans message affiché clairement.  
**Fix :** Ajouter gestion d'erreur explicite dans MatchingModal + afficher message clair "Aucun client matché" si `matches` est vide. Vérifier que le backend `/api/matching/deals/:id/leads` retourne bien `{matches: [...]}`.  
**Fichier :** `src/components/MatchingModal.jsx`

---

## 5. Paramètres — toggles notifications bloqués
**Problème :** `Settings.jsx:12` — `useState(userSettings.notifications)` crash si `notifications` est `undefined`.  
**Fix :** Fallback `useState(userSettings?.notifications ?? { newProperties: true, zoneReports: true, securityAlerts: true })`.  
**Fichier :** `src/pages/Settings.jsx`

---

## 6. Admin — section clés API manquante
**Problème :** La section "Configuration des services" (clés API Twilio, SMTP) a été supprimée de `AdminPanel.jsx`.  
**Fix :** Réajouter une section dans AdminPanel avec champs pour clés API (affichage masqué, bouton sauvegarder). Ces clés sont sauvegardées en base via un endpoint `/admin/config`.  
**Fichiers :** `src/components/AdminPanel.jsx`, `backend/api/admin.py`

---

## 7. Campagnes — message non développable
**Problème :** `CampaignCard` tronque le message à 2 lignes (`line-clamp-2`) sans moyen de voir la totalité.  
**Fix :** Ajouter state `expanded` local dans `CampaignCard`. Clic sur le message toggle entre `line-clamp-2` et affichage complet. Ajouter un lien "Voir plus / Voir moins".  
**Fichier :** `src/pages/Campaigns.jsx`

---

## 8. Reporting — vérification avec données
**Problème :** Page vide sans données. Après le seed, vérifier que les graphes s'affichent correctement.  
**Fix :** Pas de code — juste vérifier après seed. Si bug constaté, corriger séparément.

---

## Architecture

Toutes les corrections sont indépendantes. Aucune migration DB requise sauf pour le endpoint `/admin/config` (item 6) qui nécessite soit une table `AgencyConfig` soit de stocker en mémoire/fichier.

**Décision pour item 6 :** Stocker les clés API dans la table `Agency` existante (champs `sms_api_key`, `email_api_key` à ajouter) via une migration Alembic simple.

---

## Ordre d'exécution recommandé

1. Seed données (débloque Leads, Automation, Reporting, Matching)
2. Fixes frontend simples (Appeler, Détail, Notifications settings, Campagnes message)
3. MatchingModal (dépend des données seedées)
4. Admin clés API (nécessite migration)
