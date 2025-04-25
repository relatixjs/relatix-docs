# Model Construction Methods

## `.addTables(TablesConstructor)`

The `.addTables` method chained to `Tables` accepts:

- **A table constructor object**

  - Its keys are the names of the tables.
  - Its values are serialisable objects in which each key represents a field and each value describes its type.

  Fields are typed by inference. You can add explicit type annotations for more complex cases (e.g. union types).

- **A callback function** whose parameter is a reference constructor. The constructor accepts one of the table keys previously defined, checks its existence, and returns a new table constructor.

### Typers

To make the intention of your code clearer, `relatix` exports typed constants—called **Typers**—that describe field types.

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

is exactly equivalent to:

```typescript
import { SelfRef } from "relatix";

// typed by inference thanks to sample values
// these values are only used for typing purposes and are not reused
const model = Tables().addTables({
  People: { name: "John", age: 20, favouriteCoWorker: SelfRef | null },
  Projects: { title: "Some project", description: "Project description" },
});
```

In both cases, the members of `People` and `Projects` are typed as:

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

The first version is clearer because it avoids any potential confusion about the purpose of the sample values.

`Typers` are constants exported by `relatix` and have the following values:

- **Text**: ""
- **Number**: 1.0

For better readability and to avoid ambiguity, always prefer Typers (`Text`, `Number`) over sample values when describing your table models.

### `SelfRef`

The `SelfRef` constant exported by `relatix` indicates that a table field references another instance of the same table.

```typescript
import { SelfRef } from "relatix";
```

In `.populate`, the `favouriteCoWorker` field will expect a reference to another entry in the `People` table, or `null`.

### `Ref(tableKey)`

`Ref` is the parameter of the callback passed to `.addTables`. It accepts the name of one of the already-defined tables.

The value returned by `Ref` is strongly typed: in the `Tasks` table definition, any reference other than `Ref("People")` or `Ref("Projects")` will be rejected by TypeScript.

## `.populate(callback)`

Populates the tables with specific data using references provided by a callback function.

The callback receives an object containing reference constructors to the previously defined tables.

The reference values are also strongly typed:

```typescript
Tasks: {
  task1: {
    title: "Design Homepage",
    assignedTo: People("charlie"), // ❌ Error: "charlie" does not exist in People
    project: Projects("proj1"),
  },
},
```

Any attempt to add a non‑conforming value triggers a TypeScript error before the code even runs.

## `.done()`

Finalises the model creation, returning handy utilities for interacting with the created tables.

It returns in particular:

- **`tables`**: the defined tables
- **`initIds`**: a mapping between the keys used in `populate` (initial state) and their ids
- **`create`**: contains an entry creator for each table
- **`select`**: memoised selectors for the entries
- **`commit`**: allows create‑update‑delete operations on the model
- **`deepSelect`**: selectors that resolve references within entries

Each of these elements is detailed in the following section.
