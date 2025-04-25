# Méthodes de construction du modèle

## `.addTables(TablesConstructor)`

La méthode `.addTables` chaînée à Tables accepte:

- un objet constructeur de tables :

  - ses clés sont les noms des tables
  - ses valeurs des objets sérialisables dont chaque clé représente un champ, et chaque valeur décrit son type

  Les champs sont typés par inférence. Il est possible d'ajouter des annotations de type explicites pour les cas plus complexes (ex. type union).

- une fonction de `callback` dont le paramètre est un constructeur de référence, qui accepte une clé des tables précédemment définies, dont il permet de vérifier l'existence et renvoie un constructeur de tables.

### Typers

Pour une meilleure compréhension de l'intentionalité du code, `relatix` exporte des constantes typées pour décrire les champs : les `Typers`.

Le code :

```typescript
import { Text, Number, SelfRef } from "relatix";

const model = Tables().addTables({
  People: {
    name: Text,
    age: Number,
    favouriteCoWorker: SelfRef as typeof SelfRef | null,
  },
  Projects: { title: Text, description: Text },
});
```

est exactement équivalent à :

```typescript
import { SelfRef } from "relatix";

// typage par inférence grâce à des sample values
// ces valeurs servent uniquement à des fins de typage et ne sont pas réutilisées
const model = Tables().addTables({
  People: { name: "John", age: 20, favouriteCoWorker: SelfRef | null },
  Projects: { title: "Some project", description: "Project description" },
});
```

Dans les deux cas, les membres de `People` et `Projects` sont typés comme :

```typescript
type People = {
  name: string;
  age: number;
  favouriteCoWorker: typeof SelfRef | null;
};

type Project = {
  title: string;
  description: string;
};
```

La première version est cependant plus claire : elle évite de potentielles confusions sur le rôle des sample values.

Les `Typers` sont des constantes exportées par `tables` et leurs valeurs sont :

- Text: ""
- Number: 1.0

Pour une meilleure lisibilité et pour éviter toute ambiguïté, préférez toujours les Typers (Text, Number) aux valeurs d’exemple pour décrire le modèle de vos tables.

### `SelfRef`

La constante `SelfRef` exportée depuis `relatix` permet d'indiquer une référence d'un champ de la table vers une autre instance de la même table.

```typescript
import { SelfRef } from "relatix";
```

Dans `.populate` le champ `favouriteCoWorker` attendra une référence vers un autre membre de la table `People`, ou `null`.

### `Ref(tableKey)`

`Ref` est le paramètre du `callback` de `.addTables`. Il accepte comme paramètre le nom d'une des tables déjà définies.

La valeur attendue par `Ref` est fortement typée : dans la définition de la table `Tasks` tout autre référence que Ref("People") ou Ref("Projects") sera rejetée par Typescript.

## `.populate(callback)`

Peuple les tables avec des données spécifiques en utilisant des références à partir d'une fonction callback.

Cette fonction reçoit en argument un objet contenant des constructeurs de références vers les tables précédemment définies.

Les valeurs des références sont également fortement typées :

```typescript
Tasks: {
  task1: {
    title: "Design Homepage",
    assignedTo: People("charlie"), // ❌ Erreur : "charlie" n'existe pas dans People
    project: Projects("proj1")
  },
},
```

Toute tentative d’ajouter une valeur non conforme entraîne une erreur Typescript avant même l’exécution du code.

## `.done()`

Finalise la création du modèle en renvoyant des utilitaires pratiques permettant d'interagir avec les tables créées.

Retourne notamment :

- `tables`: les tables définies
- `initIds`: mapping entre les clés de populate (état initial) et leurs ids
- `create`: contient un créateur d'entrée pour chaque table
- `select`: sélecteurs memoïsés pour les entrées
- `commit`: permet d'effectuer des opérations create-update-delete sur le modèle
- `deepSelect`: sélecteurs pour les entrées en résolvant les référeces

Chacun de ces éléments sont présentés en détails dans la partie suivante.
