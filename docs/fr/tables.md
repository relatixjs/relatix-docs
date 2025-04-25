# Relatix

`relatix` est une bibliothèque Typescript conçue pour faciliter la création et la manipulation de tables relationnelles. Elle simplifie la modélisation de données complexes en offrant une syntaxe claire et intuitive pour définir des tables interconnectées et les peupler de données cohérentes grâce à un typage fort de l'état initial.

## Workflow

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

export const model = Tables()
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
```

## Méthodes de construction du modèle

### `.addTables(TablesConstructor)`

La méthode `.addTables` chaînée à Tables accepte:

- un objet constructeur de tables :

  - ses clés sont les noms des tables
  - ses valeurs des objets sérialisables dont chaque clé représente un champ, et chaque valeur décrit son type

  Les champs sont typés par inférence. Il est possible d'ajouter des annotations de type explicites pour les cas plus complexes (ex. type union).

- une fonction de `callback` dont le paramètre est un constructeur de référence, qui accepte une clé des tables précédemment définies, dont il permet de vérifier l'existence et renvoie un constructeur de tables.

#### Typers

Pour une meilleure compréhension de l'intentionalité du code, `relatix` exporte des constantes typées pour décrire les champs : les `Typers`.

Le code :

```typescript
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

#### `SelfRef`

La constante `SelfRef` exportée depuis `relatix` permet d'indiquer une référence d'un champ de la table vers une autre instance de la même table.

```typescript
import { SelfRef } from "relatix";
```

Dans `.populate` le champ `favouriteCoWorker` attendra une référence vers un autre membre de la table `People`, ou `null`.

#### `Ref(tableKey)`

`Ref` est le paramètre du `callback` de `.addTables`. Il accepte comme paramètre le nom d'une des tables déjà définies.

La valeur attendue par `Ref` est fortement typée : dans la définition de la table `Tasks` tout autre référence que Ref("People") ou Ref("Projects") sera rejetée par Typescript.

### `.populate(callback)`

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

### `.done()`

Finalise la création du modèle en renvoyant des utilitaires pratiques permettant d'interagir avec les tables créées.

Retourne notamment :

- `tables`: les tables définies
- `initIds`: mapping entre les clés de populate (état initial) et leurs ids
- `create`: contient un créateur d'entrée pour chaque table
- `select`: sélecteurs memoïsés pour les entrées
- `commit`: permet d'effectuer des opérations create-update-delete sur le modèle
- `deepSelect`: sélecteurs pour les entrées en résolvant les référeces

Chacun de ces éléments sont présentés en détails dans la partie suivante.

## Exploitation du modèle

### tables

#### Structure de données

**Entry**

Les entrées des tables sont de type `Entry` avec :

```typescript
type Entry<Data> = { id: string; label: string; d: Data };
```

**Table**

Une `Table` contient deux propriétés :

- **entities** : le dictionnaire des entrées de la table indexées par leur `id`
- **ids**: la liste des ids de la table

```typescript
type Id = string;

type Table<Data> = {
  entities: Record<Id, Entry<Data>>;
  ids: Id[];
};
```

L'objet **tables** associe à chaque clé définie dans la méthode `.addTables` une table dont la `Data` est du type de la valeur associée.

Une `Table` est générée même si elle n'est peuplée par aucune donnée à l'aide de `.populate`

**Exemple**

```typescript
import { Table, Text, Number, SelfRef } from "relatix";

const { tables } = Tables()
  .addTables({
    People: { name: Text, age: Number, favouriteCoWorker: SelfRef | null },
    Projects: { title: Text, description: Text },
  })
  .addTables((Ref) => ({
    Tasks: { title: Text, assignedTo: Ref("People"), project: Ref("Projects") },
  }))
  .populate(() => ({}))
  .done();

console.log(tables);
/*
{
  People: { entities: {}, ids: [] },
  Projects: { entities: {}, ids: []},
  Tasks: { entities: {}, ids: []}
}
*/
```

#### Mapping avec .populate

Chaque entrée d'une table définie dans populate est mappée avec le type `Entry` :

- id: identifiant unique généré aléatoirement (par défaut)
- label: associé à la clé utilisée dans populate (par défaut)
- d: valeur définie dans `populate`

**Avec l'exemple initial**:

```typescript
console.log(table);

/*
{
  People: { 
    entities: {
      randomId1: { 
        id: "randomId1", 
        label: "alice", 
        d: { name: "Alice", age: 25, favouriteCoWorker: { $table: "People", id: "randomId2" } } 
      },
      randomId2: { 
        id: "randomId2", 
        label: "bob", 
        d: { name: "Bob", age: 30, favouriteCoWorker: null }
      },
      randomId3: { 
        id: "randomId3", 
        label: "james", 
        d: { name: "James", age: 26, favouriteCoWorker: { $table: "People", id: "randomId1" } }
      }
    }, 
    ids: ["randomId1", "randomId2", "randomId3"] 
  },
  Projects: { 
    entities: {
      randomId4: {
        id: "randomId4",
        label: "proj1",
        d: { title: "Website Redesign", description: "Revamp company site" }
      }
    }, 
    ids: ["randomId4"]
  },
  Tasks: { 
    entities: {
      randomId5: {
        id: "randomId5",
        label: "task1",
        d: {
          title: "Design Homepage",
          assignedTo: { $table: "People", id: "randomId1" },
          project: { $table: "Projects", id: "randomId4"},
        },
      }
    }, 
    ids: ["randomId5"]
  }
}
 */
```

Les ids des références sont résolus pour générer les `Table`.

#### TableOptions

Il est possible de personnaliser le mapping des attributs `id` et `label` des `Entry`.

Il suffit pour cela de passer à `Tables` un objet de configuration de type :

```typescript
type TableOptions = {
  id?: (entryKeyInPopulate: string) => string;
  label?: (entryKeyInPopulate: string) => string;
};
```

Cela permet notamment de générer des entrées avec des id déterministe à des fins de débogage.

L'option par defaut (lorsqu'aucun objet de configuration n'est passé à Tables) est équivalente à :

```typescript
{
  id: () => randomIdGenerator(),
  label: (entryKeyInPopulate: string) => entryKeyInPopulate
}
```

### initIds

Mappe les clés définies dans populate avec les ids associés.

**Exemple**

```typescript
console.log(initIds);

/*
{
  People: { alice: "randomId1", bob: "randomId2", james: "randomId3" },
  Projects: { proj1: "randomId4" },
  Tasks: { task1: "randomId5"}
}
*/
```

### `create`

create expose une méthode pour chaque table définie (ex. create.People, create.Tasks, etc.). Vous utilisez ces méthodes pour créer de nouvelles entrées dans la table correspondante.

- Callback de création :

  Chaque méthode `create.<TableKey>` attend un callback qui reçoit en argument un objet contenant des constructeurs de références pour les tables du modèle. Ces constructeurs fonctionnent de manière similaire à ceux utilisés dans .populate, avec une différence essentielle :
  Ils nécessitent la spécification de l’identifiant final de l’entrée référencée.
  Cela permet de créer des références vers des entrées qui ne proviennent pas forcément de l’état initial.

- Retour du callback :

  Le callback doit renvoyer un objet dont la structure correspond exactement à celle définie lors de l’appel à .addTables pour la table concernée.

- Métadonnées optionnelles :
  En second argument, vous pouvez fournir un objet de métadonnées :

  ```typescript
  type EntryMeta = { id?: string; label?: string };
  ```

  - id : Si non spécifié, un identifiant unique est généré automatiquement.
  - label : Par défaut, il est défini comme la concaténation `${TableKey}_${id}`.
    Ces métadonnées permettent de personnaliser l’identifiant et le label de l’entrée créée.

**Exemple**

```typescript
// Utilisation de create pour ajouter une nouvelle tâche
const newTask = create.Tasks(
  // Callback de création : les constructeurs de références requièrent un identifiant final
  ({ People, Projects }) => ({
    title: "Implement Authentication",
    // On peut utiliser initIds pour référencer un id défini à l'état initial
    // Il faudra vérifier qu'il existe toujours dans la table au moment de l'ajout de newTask
    assignedTo: People(initIds.People.alice),
    // On peut également utiliser un id non défini dans l'état initial
    // Il faudra de même vérifier qu'il existe au moment de l'ajout de newTask dans le modèle
    project: Projects("someIdOfProjectsTable"),
  }),
  // Métadonnées optionnelles pour définir l'id et le label de la nouvelle tâche
  { id: "task2", label: "newTask" }
);

console.log(newTask);
/*
Affichera une nouvelle entrée de type Entry pour la table Tasks, par exemple :
{
  id: "task2",
  label: "newTask",
  d: {
    title: "Implement Authentication",
    // randomId1 est l'id de alice dans l'exemple (obtenu par initIds.People.alice)
    assignedTo: { $table: "People", id: "randomId1" },
    // randomId4 est l'id de proj1 dans l'exemple
    project: { $table: "Projects", id: "randomId4" }
  }
}

Si un second argument n'avait pas été passé à create.Tasks alors les propriétés id et label
auraient été de la forme : {id: "someRandomId", label: "Tasks_someRandomId"}

*/
```

### `select`

`select` expose pour chaque table définie un ensemble de sélecteurs, sous la forme :

```typescript
select.tableKey.selector(model: typeof tables, payload);
```

Voici la liste des sélecteurs exposés :

Avec payload:

- **byId** : la payload est l'id d'une entrée de la table. Renvoie l'entrée correspondante undefined si l’entrée n’existe pas.
- **byIdExn** : fonctionne comme byId mais lève une exception si l’entrée n’est pas trouvée.

Sans payload:

- **entities** : retourne le dictionnaire complet des entrées indexées par leur identifiant.
- **all** : fournit la liste complète des entrées de la table.
- **total** : renvoie le nombre total d’entrées dans la table.
- **ids** : renvoie la liste des identifiants de la table.

**Ces sélecteurs prennent le modèle complet en paramètre mais ne sont recalculés que lorsque la table `tableKey` est modifiée.**

**Exemples d’utilisation de select**

Supposons que le modèle est défini de la manière suivante :

```typescript
import { Tables, Ref, SelfRef, Text, Number } from "relatix";

export const model = Tables()
  .addTables({
    People: { name: Text, age: Number, favouriteCoWorker: SelfRef | null },
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
```

Avec ce modèle, nous disposons des utilitaires suivants dans select pour accéder aux données :

```typescript
const { tables, select } = model;

// 1. Récupérer une entrée de la table People par son id
const aliceEntry = select.People.byId(tables, "randomId1");
console.log("Entrée d'Alice :", aliceEntry?.d);

// 2. Utiliser byIdExn pour récupérer une tâche (lève une exception si non trouvée)
try {
  const taskEntry = select.Tasks.byIdExn(tables, "randomId5");
  console.log("Détails de la tâche :", taskEntry.d);
} catch (error) {
  console.error("Erreur, tâche non trouvée :", error);
}

// 3. Récupérer toutes les entrées de la table People
const allPeople = select.People.all(tables);
console.log(
  "Liste de toutes les personnes :",
  allPeople.map((entry) => entry.d)
);

// 4. Obtenir le nombre total d'entrées dans la table Projects
const totalProjects = select.Projects.total(tables);
console.log("Nombre de projets :", totalProjects);

// 5. Récupérer les identifiants de toutes les entrées de la table Tasks
const taskIds = select.Tasks.ids(tables);
console.log("Identifiants des tâches :", taskIds);

// 6. Accéder au dictionnaire complet des entrées pour People
const peopleEntities = select.People.entities(tables);
console.log("Dictionnaire des personnes :", peopleEntities);
```

Ces exemples illustrent comment utiliser les sélecteurs pour :

- Accéder à une entrée précise via son identifiant (byId et byIdExn).
- Récupérer l’ensemble des entrées d’une table (all et entities).
- Obtenir des informations globales sur la table comme le nombre total d’entrées (total) ou la liste des identifiants (ids).

### `commit`

`commit` expose pour chaque table définie un ensemble de modificateurs permettant d’effectuer des opérations de création, mise à jour et suppression (create-update-delete) et renvoient le modèle. Ils sont de la forme :

```typescript
commit.tableKey.method(model: typeof model, payload); // typeof model
```

Les méthodes et leurs payload respectives sont :

- **addOne**: accepte une seule entrée de la table et l'ajoute si elle n'existe pas déjà.
- **addMany**: accepte un tableau d'entrées et les ajoute si elles ne sont pas déjà présentes.
- **upsertOne**: accepte une seule entrée complète. Si une entrée portant cet identifiant existe déjà, elle effectue une mise à jour profonde en fusionnant les nouveaux champs spécifiés dans l'entité existante, les champs correspondants remplaçant les valeurs existantes. Si l'entrée n'existe pas encore, elle est ajoutée.
- **upsertMany**: accepte un tableau d'entrées complète et réalise une insertion ou mise à jour profonde
- **setOne**: accepte une seule entrée, l'ajoute ou la remplace.
- **setMany**: accepte un tableau d'entrées et les ajoute ou les remplace.
- **setAll**: accepte un tableau d'entrées et remplace toutes les entrées existantes par celles fournies.
- **updateOne**:
  accepte un objet de mise à jour contenant l'identifiant de l'entité et un objet changes avec les nouvelles valeurs des champs à mettre à jour, puis effectue une mise à jour profondes sur l'entité correspondante
- **updateMany**: accepte un tableau d'objets de mise à jour et effectue des mises à jour profondes sur toutes les entrées correspondantes.
- **removeOne**: accepte l'identifiant (id) d'une seule entrée et supprime l'entrée correspondante si elle existe.
- **removeMany**: accepte un tableau d'identifiants d'entrées et supprime chacune des entrées correspondantes si elles existent.
- **removeAll**: supprime toutes les entrées d'une table

Les objets de mise à jour sont définis par `Update` :

```typescript
type Update<T extends Entry<any>, Id extends EntityId> = {
  id: Id;
  changes: DeepPartial<T>;
};
```

**Exemples**

```typescript
// Supposons que le modèle contient déjà la table People et que l'on a extrait les utilitaires :
const { tables, initIds, commit, create } = model;

/*
  Exemple 1 : Ajouter une nouvelle entrée dans la table People avec addOne.
  La nouvelle personne 'David' est ajoutée avec une référence à 'Alice' existante.
*/
const newPerson: Entry<{
  name: string;
  age: number;
  favouriteCoWorker: typeof SelfRef | null;
}> = {
  id: "person4",
  label: "david",
  d: {
    name: "David",
    age: 28,
    // On utilise ici la référence vers 'Alice' (récupérée via initIds)
    favouriteCoWorker: { $table: "People", id: initIds.People.alice },
  },
};

const tablesAfterAdd = commit.People.addOne(tables, newPerson);

/*
  Exemple 2 : Ajouter plusieurs projets en une seule opération avec addMany.
*/
const project2: Entry<{ title: string; description: string }>[] = {
  id: "proj2",
  label: "project2",
  d: { title: "New Mobile App", description: "Develop a mobile application" },
};

// Il est bien sûr possible d'utiliser create
// un id aléatoire est ici généré car non précisé
const project3 = create.Projects(
  () => ({
    title: "API Integration",
    description: "Integrate third-party APIs",
  }),
  { label: "project3" }
);

const tablesAfterAddMany = commit.Projects.addMany(tablesAfterAdd, [
  project2,
  project3,
]);

/*
  Exemple 3 : Mettre à jour l'âge de Bob en utilisant updateOne.
  Ici, on met à jour seulement la propriété `age` dans `d` pour l'entrée correspondant à Bob.
*/
const tablesAfterUpdate = commit.People.updateOne(tablesAfterAddMany, {
  id: initIds.People.bob,
  changes: { d: { age: 31 } },
});

/*
  Exemple 4 : Mise à jour de plusieurs entrées dans People avec updateMany.
*/
const tablesAfterUpdateMany = commit.People.updateMany(tablesAfterUpdate, [
  { id: initIds.People.alice, changes: { d: { age: 26 } } },
  { id: initIds.People.james, changes: { d: { age: 27 } } },
]);

/*
  Exemple 5 : Supprimer une entrée dans la table Tasks avec removeOne.
  Ici, on supprime la tâche identifiée par initIds.Tasks.task1.
*/
const tablesAfterDelete = commit.Tasks.removeOne(
  tablesAfterUpdateMany,
  initIds.Tasks.task1
);

/*
  Exemple 6 : Supprimer plusieurs entrées en fournissant un tableau d'identifiants avec removeMany.
  (Supposons que l'on veuille supprimer plusieurs personnes)
*/
const tablesAfterRemoveMany = commit.People.removeMany(tablesAfterDelete, [
  initIds.People.alice,
  initIds.People.james,
]);

/*
  Exemple 7 : Supprimer toutes les entrées d'une table avec removeAll.
*/
const tablesAfterRemoveAll = commit.Projects.removeAll(tablesAfterRemoveMany);
```

### `deepSelect`

`deepSelect` permet de récupérer la donnée (attribut d) d'une `Entry` en résolvant de manière récursive toutes les références contenues dans ses champs. Autrement dit, au lieu d’obtenir des objets de référence de la forme `{ $table: "TableKey", id: "someId" }`, `deepSelect` remplace chaque référence par la donnée d de l’entrée correspondante, avec ses propres références résolues à leur tour.
La récursion se coupe au niveau des `SelfRef` de sorte à éviter les récursions infinies.

#### Syntaxe

De même les sélecteurs se déclinent :

- Avec payload :

  ```typescript
  deepSelect.tableKey.selector(model: typeof tables, payload, depth?: number);
  ```

  - **byId** : accepte comme payload un id et renvoie une `deepEntry` ou `undefined` si aucune entrée ne correspond à l'id.
  - **byIdExn**: fonctionne comme byId mais lève une exception si l’entrée n’est pas trouvée.

- Sans payload :

  ```typescript
  deepSelect.tableKey.selector(model: typeof tables, depth?: number);
  ```

  - **entities** : retourne le dictionnaire complet des entrées résolues indexées par leur identifiant.
  - **all** : fournit la liste complète des entrées résolues de la table.

Le paramètre optionnel `depth`, permet de limiter la profondeur de récursion, elle vaut par défaut 10.

#### DeepEntry

Le type auxiliaire `DeepEntry` est exporté par `relatix` :

```typescript
import { DeepEntry } from "relatix";
```

Il prend en paramètre le type des tables et une clé et renvoie le type correspondant, en coupant la récursion au niveau des SelfRef (remplacée par des DataRef).

**Exemples**

Les types :

```typescript
type Person = DeepEntry<typeof tables, "People">;
type Project = DeepEntry<typeof tables, "Projects">;
type Task = DeepEntry<typeof tables, "Tasks">;
```

Sont respectivement égaux à :

```typescript
type Person = {
  name: string;
  age: number;
  favouriteCoWorker: DataRef<"People", string> | null;
};

type Project = {
  title: string;
  description: string;
};

type Task = {
  title: string;
  assignedTo: {
    name: string;
    age: number;
    favouriteCoWorker: DataRef<"People", string> | null; // Recursion coupée ici
  };
  project: {
    title: string;
    description: string;
  };
};
```

#### Utilité de deepSelect

Dans certains cas, vos données peuvent représenter des structures composites où une entité se définit en partie par d’autres entités. Par exemple, une forme géométrique complexe peut être constituée d’un contour défini par une ligne, et cette ligne est elle-même définie par deux points. Avec deepSelect, vous pouvez obtenir directement l’objet final avec l’ensemble de ses composants entièrement résolus, facilitant ainsi l’analyse et la manipulation de vos données.

**Exemple : Entités géométriques composables**
Imaginons un modèle comportant trois tables :

- Points : définit un point par ses coordonnées.
- Lines : définit une ligne à partir de deux points (début et fin).
- CompositeShapes : définit une forme géométrique qui possède un nom, un contour (défini par une ligne) et, éventuellement, une référence à une autre forme (pour composer des formes complexes).

Voici un exemple de configuration utilisant ces tables :

```typescript
import { Tables, Ref, SelfRef, Text, Number } from "relatix";

export const model = Tables()
  .addTables({
    Points: { x: Number, y: Number },
    Lines: { pointA: Ref("Points"), pointB: Ref("Points") },
  })
  .addTables((Ref) => ({
    CompositeShapes: {
      name: Text,
      // La propriété 'outline' référence une ligne définissant le contour de la forme
      outline: Ref("Lines"),
      // La propriété 'subShape' permet de composer une forme à partir d'une autre (optionnelle)
      subShape: SelfRef | null,
    },
  }))
  .populate(({ Points, Lines, CompositeShapes }) => ({
    Points: {
      p1: { x: 0, y: 0 },
      p2: { x: 10, y: 0 },
      p3: { x: 10, y: 10 },
      p4: { x: 0, y: 10 },
    },
    Lines: {
      // Ligne reliant p1 à p2
      l1: { pointA: Points("p1"), pointB: Points("p2") },
      // Ligne reliant p2 à p3
      l2: { pointA: Points("p2"), pointB: Points("p3") },
      // Autres lignes pour compléter un contour (non utilisées par deepSelect dans cet exemple)
      l3: { pointA: Points("p3"), pointB: Points("p4") },
      l4: { pointA: Points("p4"), pointB: Points("p1") },
    },
    CompositeShapes: {
      // Une forme simple (un carré) utilisant la ligne l1 pour son contour
      cs1: { name: "Square", outline: Lines("l1"), subShape: null },
      // Une forme complexe qui compose le carré cs1 et utilise la ligne l2 pour son propre contour
      cs2: {
        name: "Complex Square",
        outline: Lines("l2"),
        subShape: CompositeShapes("cs1"),
      },
    },
  }))
  .done();
```

Grâce à deepSelect, il est possible de récupérer l’entrée d’une forme composite avec toutes ses références résolues. Par exemple, pour récupérer la forme cs2 (la forme complexe), on peut utiliser le sélecteur byIdExn de deepSelect :

```typescript
// Récupère l'entrée 'cs2' avec toutes ses références résolues
const deepCompositeShape = model.deepSelect.CompositeShapes.byIdExn(
  model.tables,
  model.initIds.CompositeShapes.cs2
);

console.log("Forme composite résolue :", deepCompositeShape);

/*
{
  name: "ComplexSquare",
  outline: {
    pointA: { x: 10, y: 0 },
    pointB: { x: 10, y: 10},
  },
  subShape: {
    name: "Square",
    outline: {
      pointA: { x: 0, y: 0 },
      pointB: { x: 10, y: 0 }
    },
    subShape: null
  }
}
*/
```
