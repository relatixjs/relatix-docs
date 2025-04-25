# Présentation de relatix

**`relatix` facilite la création et la manipulation de données relationnelles en TypeScript**.

Créez, reliez et interrogez vos tables en toute simplicité, sans sacrifier la sécurité de typage. Sa syntaxe claire et intuitive permet de définir des tables interconnectées et de les peupler de données cohérentes grâce à un typage fort de l'état initial.

## Pourquoi choisir relatix ?

✅ **Modélisation déclarative**

- Définissez vos tables et leurs relations en quelques lignes grâce aux Typers (Text, Number, SelfRef, Ref).
- Les références sont validées à la compilation

✅ **Typage fort et automatique**

- Les schémas de tables, les refs, les sélecteurs et les commits sont tous générés par inférence.
- Zéro any caché : vos IDE et votre CI détectent les incohérences avant même l’exécution.

✅ **Chaînage fluide du workflow**

- Construisez vos tables pas à pas : .addTables() accepte des refs vers les tables déjà définies.
- .populate() injecte facilement des données cohérentes et vérifiées.

✅ **Utilitaires « batteries incluses »**

- select, deepSelect, create, commit… tout est prêt pour lire, muter ou naviguer dans vos données.
- Personnalisez la génération des id et label avec TableOptions pour un débogage plus lisible.

✅ **Performances et maintenabilité**

- Sélecteurs mémoïsés : recalcul unique quand la table cible change.
