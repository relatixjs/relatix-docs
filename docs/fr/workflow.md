# Workflow

Le _workflow_ de `relatix` reproduit le cheminement d’un schéma relationnel — de la définition des tables jusqu’à leur exploitation. Vous commencez par poser la structure (tables et références), puis vous l’enrichissez de données cohérentes, et enfin vous récupérez des utilitaires typés pour lire ou modifier ces données. Chaque étape est chaînée à la précédente, ce qui rend la progression linéaire et facile à suivre.

1. Définition initiale des tables : Utilisez la fonction `Tables` avec un objet de configuration optionnel pour générer le constructeur de tables.
2. Ajout de tables : Chainez le constructeur avec la méthode .addTables pour créer un ensemble initial de tables
3. Ajout de tables supplémentaires : La méthode .addTables peut être chaînée autant de fois que nécessaire pour inclure des tables contenant des références vers les tables définies lors de ses appels précédents.
4. Population des données : Ajoutez des entrées aux tables avec la méthode .populate.
5. Finalisation : Appelez .done() pour obtenir un ensemble d'utilitaires permettant d'interagir avec le modèle.

```javascript
import { Tables } from "relatix";

export const model = Tables(
  // Paramétrisation de Tables
)
.addTables({
  // Ajout de tables indépendantes (références internes possibles)
})
.addTables((Ref) =>{
  // Ajout de tables en référençant les tables existantes
})
.populate(({ Table1, Table2, ... }) => ({
  // Remplissage des tables avec des données concrètes
}))
.done();
```

**Exemple** :

```typescript
import { Tables, SelfRef, Text, Number } from "relatix";

const model = Tables()
  .addTables({
    People: {
      name: Text,
      age: Number,
      favouriteCoWorker: SelfRef as typeof SelfRef | null,
    },
    Projects: { title: Text, description: Text },
  })
  .addTables((Ref) => ({
    Tasks: { title: Text, assignedTo: Ref("People"), project: Ref("Projects") },
  }))
  .populate(({ People, Projects }) => ({
    People: {
      alice: { name: "Alice", age: 25, favouriteCoWorker: People("bob") },
      bob: { name: "Bob", age: 30, favouriteCoWorker: null },
      james: { name: "James", age: 26, favouriteCoWorker: People("alice") },
    },
    Projects: {
      proj1: { title: "Website Redesign", description: "Revamp company site" },
    },
    Tasks: {
      task1: {
        title: "Design Homepage",
        assignedTo: People("alice"),
        project: Projects("proj1"),
      },
    },
  }))
  .done();

export { tables, initIds, create, select, commit, deepSelect } = model;
```

Les utilitaires produits sont :

- `tables`: les tables définies
- `initIds`: mapping entre les clés de populate (état initial) et leurs ids
- `create`: contient un créateur d'entrée pour chaque table
- `select`: sélecteurs memoïsés pour les entrées
- `commit`: permet d'effectuer des opérations create-update-delete sur le modèle
- `deepSelect`: sélecteurs pour les entrées en résolvant les référeces

Chacun de ces éléments sont présentés en détails dans les parties suivantes.
