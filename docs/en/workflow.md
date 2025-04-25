# Workflow

The `relatix` _workflow_ mirrors the journey of a relational schema—from defining the tables to putting them to use. You first lay out the structure (tables and references), then enrich it with consistent data, and finally retrieve typed utilities to read or modify that data. Each step is chained to the previous one, making the progression linear and easy to follow.

1. **Initial table definition**: Use the `Tables` function with an optional configuration object to generate the table constructor.
2. **Adding tables**: Chain the constructor with `.addTables` to create an initial set of tables.
3. **Adding additional tables**: The `.addTables` method can be chained as many times as necessary to include tables that contain references to tables defined by previous calls.
4. **Populating data**: Add entries to the tables with `.populate`.
5. **Finalisation**: Call `.done()` to obtain a set of utilities for interacting with the model.

```javascript
import { Tables } from "relatix";

export const model = Tables(
  // Tables configuration parameters
)
.addTables({
  // Adding standalone tables (internal references allowed)
})
.addTables((Ref) => {
  // Adding tables that reference the existing ones
})
.populate(({ Table1, Table2, ... }) => ({
  // Filling the tables with concrete data
}))
.done();
```

**Example**:

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

The utilities produced are:

- **`tables`**: the defined tables
- **`initIds`**: mapping between the keys used in `populate` (initial state) and their ids
- **`create`**: contains an entry creator for each table
- **`select`**: memoised selectors for entries
- **`commit`**: enables create‑update‑delete operations on the model
- **`deepSelect`**: selectors that resolve references within entries

Each of these elements is detailed in the following sections.
