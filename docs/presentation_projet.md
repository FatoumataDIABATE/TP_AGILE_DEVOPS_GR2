# Gestion Events

## Description courte
Gestion Events est une application web de gestion d’événements développée avec React, Vite, Node.js, Express et SQLite. Elle permet de consulter des événements, de s’y inscrire et, côté administrateur, de gérer le catalogue d’événements ainsi que les inscriptions.

## Problème résolu
Le projet répond au besoin de centraliser la gestion d’événements dans une seule application simple à utiliser. Il évite les échanges manuels dispersés et permet de suivre les événements, les inscriptions et les actions administratives depuis une interface unique.

## Utilisateurs cibles
- Les visiteurs qui souhaitent consulter les événements disponibles et s’y inscrire.
- Les organisateurs ou administrateurs qui veulent créer, modifier, supprimer des événements et voir les inscrits.
- L’équipe projet qui a besoin d’un outil clair pour tester et faire évoluer la solution.

## Fonctionnalités principales envisagées
- Affichage de la liste des événements à venir.
- Recherche et filtrage des événements.
- Inscription d’un visiteur à un événement.
- Espace administrateur avec authentification.
- Création, modification et suppression d’événements.
- Consultation de la liste des inscrits par événement.
- Suivi du nombre d’inscriptions pour chaque événement.

## Stack technique choisie
- Frontend: React, TypeScript, Vite.
- Backend: Node.js, Express.
- Base de données: SQLite.
- Conteneurisation: Docker et Docker Compose.
- Organisation du travail: GitHub Projects en mode Kanban.

## Contraintes identifiées
- Garder une interface simple et compréhensible pour un usage rapide.
- Assurer la cohérence entre le frontend et le backend.
- Gérer les accès administrateur de manière sécurisée.
- Maintenir une base de données légère et facile à lancer en local.
- Faire fonctionner le projet aussi bien en local qu’avec Docker.

## Risques techniques
- Désynchronisation possible entre les données affichées et l’état réel de la base.
- Problèmes d’authentification ou de session côté administrateur.
- Bugs d’intégration entre l’API et l’interface utilisateur.
- Difficultés de déploiement ou de démarrage des services Docker.
- Régressions lors des modifications des formulaires, des filtres ou des routes API.
