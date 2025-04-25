# Model Usage

## tables

### Data structure

**Entry**

Table entries are of type `Entry`:

```typescript
type Entry<Data> = { id: string; label: string; d: Data };
```

**Table**

A `Table` has two properties:

- **entities**: the dictionary of table entries indexed by their `id`
- **ids**: the list of ids in the table

```typescript
type Id = string;

type Table<Data> = {
  entities: Record<Id, Entry<Data>>;
  ids: Id[];
};
```

The **tables** object maps each key defined in `.addTables` to a table whose `Data` type is the value associated with that key.

A `Table` is generated even when it is empty thanks to `.populate`.

**Example**

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

### Mapping with .populate

Each entry of a table defined in `populate` is mapped with the type `Entry`:

- **id**: a unique identifier generated randomly (by default)
- **label**: set to the key used in `populate` (by default)
- **d**: the value defined in `populate`

**With the initial example:**

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

Reference ids are resolved to build the `Table`s.

### TableOptions

The mapping of `Entry` attributes `id` and `label` can be customized.

Simply pass a configuration object of the following type to `Tables`:

```typescript
type TableOptions = {
  id?: (entryKeyInPopulate: string) => string;
  label?: (entryKeyInPopulate: string) => string;
};
```

This is especially useful for generating deterministic ids for debugging.

The default option (when no configuration object is provided) is equivalent to:

```typescript
{
  id: () => randomIdGenerator(),
  label: (entryKeyInPopulate: string) => entryKeyInPopulate
}
```

## `initIds`

Maps the keys defined in `populate` to their associated ids.

**Example**

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

## `create`

`create` exposes a method for each defined table (e.g. `create.People`, `create.Tasks`, etc.). You use these methods to create new entries in the corresponding table.

- **Creation callback**:

  Each `create.<TableKey>` method expects a callback that receives an object containing reference constructors for the model tables. These constructors work similarly to those used in `.populate`, with one essential difference:
  They require the final identifier of the referenced entry.
  This makes it possible to create references to entries that may not originate from the initial state.

- **Callback return value**:

  The callback must return an object whose structure exactly matches that defined in `.addTables` for the table in question.

- **Optional metadata**:
  As a second argument, you can provide a metadata object:

  ```typescript
  type EntryMeta = { id?: string; label?: string };
  ```

  - **id**: If not specified, a unique identifier is generated automatically.
  - **label**: By default, it is set to the concatenation `${TableKey}_${id}`.
    These metadata allow you to customize the identifier and label of the newly created entry.

**Example**

```typescript
// Using create to add a new task
const newTask = create.Tasks(
  // Creation callback: reference constructors require the final identifier
  ({ People, Projects }) => ({
    title: "Implement Authentication",
    // You can use initIds to reference an id defined in the initial state
    // You must check that it still exists in the table when adding newTask
    assignedTo: People(initIds.People.alice),
    // You can also use an id not defined in the initial state
    // Likewise, you must ensure it exists when newTask is added to the model
    project: Projects("someIdOfProjectsTable"),
  }),
  // Optional metadata to set the id and label of the new task
  { id: "task2", label: "newTask" }
);

console.log(newTask);
/*
Will output a new Entry for the Tasks table, for example:
{
  id: "task2",
  label: "newTask",
  d: {
    title: "Implement Authentication",
    // randomId1 is Alice's id in the example (obtained via initIds.People.alice)
    assignedTo: { $table: "People", id: "randomId1" },
    // randomId4 is proj1's id in the example
    project: { $table: "Projects", id: "randomId4" }
  }
}

If no second argument had been passed to create.Tasks, then the id and label
would have been of the form: { id: "someRandomId", label: "Tasks_someRandomId" }
*/
```

## `select`

`select` exposes, for each defined table, a set of selectors in the form:

```typescript
select.tableKey.selector(model: typeof tables, payload);
```

Here is the list of available selectors:

With payload:

- **byId**: the payload is the id of a table entry. Returns the corresponding entry or `undefined` if the entry does not exist.
- **byIdExn**: works like `byId` but throws an exception if the entry is not found.

Without payload:

- **entities**: returns the complete dictionary of entries indexed by their identifier.
- **all**: returns the full list of table entries.
- **total**: returns the total number of entries in the table.
- **ids**: returns the list of identifiers in the table.

**These selectors take the full model as a parameter but are only recalculated when the `tableKey` table is modified.**

**Usage examples of select**

Assume the model is defined as follows:

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

With this model, we can use the following utilities in `select` to access the data:

```typescript
const { tables, select } = model;

// 1. Retrieve an entry from the People table by its id
const aliceEntry = select.People.byId(tables, "randomId1");
console.log("Alice's entry:", aliceEntry?.d);

// 2. Use byIdExn to retrieve a task (throws an exception if not found)
try {
  const taskEntry = select.Tasks.byIdExn(tables, "randomId5");
  console.log("Task details:", taskEntry.d);
} catch (error) {
  console.error("Error, task not found:", error);
}

// 3. Retrieve all entries from the People table
const allPeople = select.People.all(tables);
console.log(
  "List of all people:",
  allPeople.map((entry) => entry.d)
);

// 4. Get the total number of entries in the Projects table
const totalProjects = select.Projects.total(tables);
console.log("Number of projects:", totalProjects);

// 5. Retrieve the identifiers of all entries in the Tasks table
const taskIds = select.Tasks.ids(tables);
console.log("Task identifiers:", taskIds);

// 6. Access the complete dictionary of entries for People
const peopleEntities = select.People.entities(tables);
console.log("People dictionary:", peopleEntities);
```

These examples illustrate how to use the selectors to:

- Access a specific entry by its identifier (`byId` and `byIdExn`).
- Retrieve all entries of a table (`all` and `entities`).
- Obtain global information about the table such as the total number of entries (`total`) or the list of identifiers (`ids`).

## `commit`

`commit` exposes, for each defined table, a set of mutators that perform create‑update‑delete operations and return the model. They have the following form:

```typescript
commit.tableKey.method(model: typeof model, payload); // typeof model
```

The methods and their respective payloads are:

- **addOne**: accepts a single table entry and adds it if it does not already exist.
- **addMany**: accepts an array of entries and adds them if they are not already present.
- **upsertOne**: accepts a single complete entry. If an entry with this identifier already exists, it performs a deep merge, with the specified fields replacing existing values. If the entry does not exist yet, it is added.
- **upsertMany**: accepts an array of complete entries and performs insertion or deep update.
- **setOne**: accepts a single entry, adding or replacing it.
- **setMany**: accepts an array of entries, adding or replacing them.
- **setAll**: accepts an array of entries and replaces all existing entries with the provided ones.
- **updateOne**:
  accepts an update object containing the entity identifier and a `changes` object with the new field values; then performs a deep update on the corresponding entity.
- **updateMany**: accepts an array of update objects and performs deep updates on all corresponding entries.
- **removeOne**: accepts the identifier (`id`) of a single entry and removes it if it exists.
- **removeMany**: accepts an array of entry identifiers and removes each corresponding entry if it exists.
- **removeAll**: removes all entries from a table.

Update objects are defined by `Update`:

```typescript
type Update<T extends Entry<any>, Id extends EntityId> = {
  id: Id;
  changes: DeepPartial<T>;
};
```

**Examples**

```typescript
// Assume the model already contains the People table and we have extracted the utilities:
const { tables, initIds, commit, create } = model;

/*
  Example 1: Add a new entry to the People table with addOne.
  The new person 'David' is added with a reference to the existing 'Alice'.
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
    // Here we use the reference to 'Alice' (retrieved via initIds)
    favouriteCoWorker: { $table: "People", id: initIds.People.alice },
  },
};

const tablesAfterAdd = commit.People.addOne(tables, newPerson);

/*
  Example 2: Add several projects at once with addMany.
*/
const project2: Entry<{ title: string; description: string }>[] = {
  id: "proj2",
  label: "project2",
  d: { title: "New Mobile App", description: "Develop a mobile application" },
};

// Of course, you can use create
// A random id is generated here because none is specified
const project3 = create.Projects(
  () => ({
    title: "API Integration",
    description: "Integrate third‑party APIs",
  }),
  { label: "project3" }
);

const tablesAfterAddMany = commit.Projects.addMany(tablesAfterAdd, [
  project2,
  project3,
]);

/*
  Example 3: Update Bob's age using updateOne.
  Only the `age` property inside `d` is updated for Bob's entry.
*/
const tablesAfterUpdate = commit.People.updateOne(tablesAfterAddMany, {
  id: initIds.People.bob,
  changes: { d: { age: 31 } },
});

/*
  Example 4: Update multiple entries in People with updateMany.
*/
const tablesAfterUpdateMany = commit.People.updateMany(tablesAfterUpdate, [
  { id: initIds.People.alice, changes: { d: { age: 26 } } },
  { id: initIds.People.james, changes: { d: { age: 27 } } },
]);

/*
  Example 5: Remove an entry in the Tasks table with removeOne.
  Here, we remove the task identified by initIds.Tasks.task1.
*/
const tablesAfterDelete = commit.Tasks.removeOne(
  tablesAfterUpdateMany,
  initIds.Tasks.task1
);

/*
  Example 6: Remove several entries by providing an array of identifiers with removeMany.
  (Suppose we want to delete several people.)
*/
const tablesAfterRemoveMany = commit.People.removeMany(tablesAfterDelete, [
  initIds.People.alice,
  initIds.People.james,
]);

/*
  Example 7: Remove all entries from a table with removeAll.
*/
const tablesAfterRemoveAll = commit.Projects.removeAll(tablesAfterRemoveMany);
```

## `deepSelect`

`deepSelect` retrieves the data (the `d` attribute) of an `Entry` by recursively resolving all references contained in its fields. In other words, instead of obtaining reference objects of the form `{ $table: "TableKey", id: "someId" }`, `deepSelect` replaces each reference with the `d` data of the corresponding entry, with its own references resolved in turn.
Recursion stops at `SelfRef`s to avoid infinite loops.

### Syntax

Selectors are available in the same way:

- With payload:

  ```typescript
  deepSelect.tableKey.selector(model: typeof tables, payload, depth?: number);
  ```

  - **byId**: accepts an id as payload and returns a `deepEntry` or `undefined` if no entry matches the id.
  - **byIdExn**: works like `byId` but throws an exception if the entry is not found.

- Without payload:

  ```typescript
  deepSelect.tableKey.selector(model: typeof tables, depth?: number);
  ```

  - **entities**: returns the complete dictionary of resolved entries indexed by their identifier.
  - **all**: returns the full list of resolved table entries.

The optional `depth` parameter limits recursion depth; it defaults to 10.

### DeepEntry

The auxiliary type `DeepEntry` is exported by `relatix`:

```typescript
import { DeepEntry } from "relatix";
```

It takes the tables type and a key as parameters and returns the corresponding type, breaking recursion at `SelfRef`s (replaced by `DataRef`).

**Examples**

Types:

```typescript
type Person = DeepEntry<typeof tables, "People">;
type Project = DeepEntry<typeof tables, "Projects">;
type Task = DeepEntry<typeof tables, "Tasks">;
```

are respectively equal to:

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
    favouriteCoWorker: DataRef<"People", string> | null; // Recursion stops here
  };
  project: {
    title: string;
    description: string;
  };
};
```

### Why use deepSelect

In some cases, your data may represent composite structures where an entity is defined partly by other entities. For example, a complex geometric shape can be composed of an outline defined by a line, and that line is itself defined by two points. With `deepSelect`, you can directly obtain the final object with all its components fully resolved, making data analysis and manipulation easier.

**Example: Composable geometric entities**

Imagine a model with three tables:

- **Points**: defines a point by its coordinates.
- **Lines**: defines a line from two points (start and end).
- **CompositeShapes**: defines a geometric shape that has a name, an outline (defined by a line) and, optionally, a reference to another shape (to compose complex shapes).

Here is an example configuration using these tables:

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
      // The 'outline' property references a line defining the shape's contour
      outline: Ref("Lines"),
      // The 'subShape' property allows composing a shape from another (optional)
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
      // Line connecting p1 to p2
      l1: { pointA: Points("p1"), pointB: Points("p2") },
      // Line connecting p2 to p3
      l2: { pointA: Points("p2"), pointB: Points("p3") },
      // Other lines to complete a contour (not used by deepSelect in this example)
      l3: { pointA: Points("p3"), pointB: Points("p4") },
      l4: { pointA: Points("p4"), pointB: Points("p1") },
    },
    CompositeShapes: {
      // A simple shape (a square) using line l1 for its outline
      cs1: { name: "Square", outline: Lines("l1"), subShape: null },
      // A complex shape composing the square cs1 and using line l2 for its own outline
      cs2: {
        name: "Complex Square",
        outline: Lines("l2"),
        subShape: CompositeShapes("cs1"),
      },
    },
  }))
  .done();
```

Thanks to `deepSelect`, you can retrieve the entry of a composite shape with all its references resolved. For example, to get the shape `cs2` (the complex shape), use the `byIdExn` selector from `deepSelect`:

```typescript
// Retrieve entry 'cs2' with all references resolved
const deepCompositeShape = model.deepSelect.CompositeShapes.byIdExn(
  model.tables,
  model.initIds.CompositeShapes.cs2
);

console.log("Resolved composite shape:", deepCompositeShape);

/*
{
  name: "Complex Square",
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
