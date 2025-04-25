---
layout: home
hero:
  name: "relatix"
  tagline: "Manage relational data effortlessly and safely in TypeScript"
  actions:
    - theme: brand
      text: "Get Started"
      link: /en/intro # Assuming '/en/intro' is the intro page link
    - theme: outline
      text: "GitHub"
      link: https://github.com/relatix-js/relatix # Replace with actual GitHub link
features:
  - title: "🔒 Strong Type Safety"
    details: "Catch data structure and reference errors at compile time, not runtime. Zero hidden `any` for reliable code."
  - title: "✨ Declarative & Fluent API"
    details: "Define tables, fields (Text, Number), and relationships (Ref, SelfRef) intuitively. Build models step-by-step."
  - title: "🔧 Rich Utilities Included"
    details: "Query (`select`), mutate (`commit`), create (`create`), and resolve nested references (`deepSelect`) out-of-the-box."
  - title: "🚀 Optimized Reads"
    details: "Memoized selectors (`select`) ensure efficient data retrieval, recalculating only when necessary."
---

## Getting Started

Install `relatix` using npm:

```bash
npm install relatix
```

## Quick Example: Task Management Model

Define people, projects, and tasks with relationships in a type-safe manner:

```typescript
import { Tables, Text, Number, Ref, SelfRef } from "relatix";

// 1. Define the Model Structure
const { tables, select, initIds } = Tables()
  .addTables({
    // Define standalone tables first
    People: {
      name: Text,
      age: Number,
      // Optional self-reference (e.g., manager, peer)
      reportsTo: SelfRef as typeof SelfRef | null,
    },
    Projects: {
      title: Text,
    },
  })
  .addTables((Ref) => ({
    // Define tables referencing existing ones
    Tasks: {
      title: Text,
      assignedTo: Ref("People"), // Strongly-typed reference to People table
      project: Ref("Projects"), // Strongly-typed reference to Projects table
    },
  }))
  .populate(({ People, Projects }) => ({
    // 2. Populate with Initial Data (Type-checked!)
    People: {
      alice: { name: "Alice", age: 30, reportsTo: null },
      bob: { name: "Bob", age: 42, reportsTo: People("alice") }, // Refers to 'alice'
    },
    Projects: {
      launch: { title: "Website Launch" },
    },
    Tasks: {
      task1: {
        title: "Design Homepage",
        assignedTo: People("alice"), // Refers to 'alice'
        project: Projects("launch"), // Refers to 'launch'
      },
      task2: {
        title: "Develop API",
        assignedTo: People("bob"), // Refers to 'bob'
        project: Projects("launch"),
      },
    },
  }))
  .done(); // Finalize and get utilities

// 3. Use the Model & Utilities
const aliceId = initIds.People.alice; // Get Alice's generated ID
const aliceData = select.People.byId(tables, aliceId);

console.log(`Selected Person: ${aliceData?.d.name}`); // Output: Selected Person: Alice

// TypeScript Error Example:
// const invalidTask = { title: "Invalid", assignedTo: People("nonExistent"), project: Projects("launch") };
// The line above would cause a TypeScript error during '.populate' because "nonExistent" isn't defined.
```

## Advanced Capabilities 🛠️

- **Deep Data Resolution**: Use `deepSelect` to retrieve entries with all nested references automatically resolved into full data objects.
- **Fine-grained Mutations**: Perform atomic create, update, delete operations on your tables using the `commit` utility, ensuring data integrity.
- **Customizable IDs & Labels**: Tailor entry `id` and `label` generation using `TableOptions` for debugging or specific requirements.
- **Complex Relationships**: Easily model intricate data structures, including self-referencing tables (`SelfRef`) and multiple references between tables.

---

<p class="home-footer">
  <a href="https://www.npmjs.com/package/relatix" target="_blank">NPM</a>
  •
  <a href="https://github.com/relatixjs/relatix" target="_blank">GitHub</a>
  •
</p>
