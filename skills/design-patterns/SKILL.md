---
name: design-patterns
description: Agents should invoke this skill when choosing patterns, designing traits/interfaces/components, deciding abstraction boundaries, evaluating dependency injection/callbacks, or comparing implementation approaches in Rust, TypeScript/React, or Django/Python.
license: MIT (modified; see UPSTREAMS.json)
---

# Design Patterns

Pattern recommendations tailored to common tech stacks. Every pattern recommendation includes when to use it, when to avoid it, and the trade-offs.

## Quick Start

### Choose a Pattern

1. **Identify the problem:** What design challenge are you solving?
2. **Consider the context:** What language? What scale? How often will this change?
3. **Evaluate options:** 2-3 candidate patterns with trade-offs
4. **Recommend:** The best fit for *this specific context* (not the "best pattern in general")

**The golden rule:** Patterns are tools, not goals. Use the simplest pattern that solves the problem. If no pattern fits, a plain function or struct is fine.

---

## Rust Patterns

### Newtype Pattern

Wrap a primitive to add type safety and domain meaning.

```rust
struct UserId(u64);
struct OrderId(u64);

// Now the compiler prevents mixing up UserId and OrderId
fn get_order(user: UserId, order: OrderId) -> Order { ... }
```

**When to use:** When two values have the same underlying type but different meanings.
**When to skip:** One-off uses where a type alias suffices.

### Builder Pattern

Construct complex objects step by step.

```rust
let config = ServerConfig::builder()
    .host("localhost")
    .port(8080)
    .max_connections(100)
    .build()?;
```

**When to use:** Structs with many optional fields, complex construction logic.
**When to skip:** Structs with 1-3 required fields — just use `new()`.

### Typestate Pattern

Encode state transitions in the type system so invalid states are unrepresentable.

```rust
struct Connection<S: State> { /* ... */ state: PhantomData<S> }
struct Disconnected;
struct Connected;
struct Authenticated;

impl Connection<Disconnected> {
    fn connect(self) -> Result<Connection<Connected>> { ... }
}
impl Connection<Connected> {
    fn authenticate(self, creds: &Credentials) -> Result<Connection<Authenticated>> { ... }
}
impl Connection<Authenticated> {
    fn query(&self, sql: &str) -> Result<Rows> { ... }
}
// Can't call query() on a Disconnected connection — compile error
```

**When to use:** Protocols with clear state transitions (connections, workflows, parsing stages).
**When to skip:** Simple on/off states — a boolean or enum is clearer.

### Trait Objects vs Generics

| Approach | Dispatch | Binary Size | Flexibility |
|---|---|---|---|
| `impl Trait` (generics) | Static (monomorphized) | Larger (one copy per type) | Known at compile time |
| `dyn Trait` (trait objects) | Dynamic (vtable) | Smaller (one copy) | Extensible at runtime |

**Use generics when:** Performance matters, types are known at compile time, you want zero-cost abstraction.
**Use trait objects when:** You need heterogeneous collections, plugin systems, or the set of types is open-ended.

### Error Handling Patterns

| Pattern | When | Crate |
|---|---|---|
| `thiserror` | Library errors — structured, specific variants | `thiserror` |
| `anyhow` | Application errors — context-rich, propagate quickly | `anyhow` |
| Custom enum | When you need exhaustive matching by callers | std only |

**Rule of thumb:** Libraries use `thiserror` (callers need to match). Applications use `anyhow` (callers need context).

---

## TypeScript / React Patterns

### Compound Components

Components that work together implicitly via shared context.

```tsx
<Select>
  <Select.Trigger>Choose a fruit</Select.Trigger>
  <Select.Options>
    <Select.Option value="apple">Apple</Select.Option>
    <Select.Option value="banana">Banana</Select.Option>
  </Select.Options>
</Select>
```

**When to use:** Complex UI components with multiple related parts (menus, accordions, tabs).
**When to skip:** Simple components with 1-2 elements.

### Custom Hook Composition

Extract and compose behavior into reusable hooks.

```tsx
function useDebounce<T>(value: T, delay: number): T { ... }
function usePagination(items: Item[], pageSize: number) { ... }
function useLocalStorage<T>(key: string, initial: T) { ... }
```

**When to use:** Shared stateful logic across components, complex state management within a component.
**When to skip:** One-off logic that doesn't repeat.

### Discriminated Unions

Type-safe state modeling using TypeScript's union types.

```typescript
type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

// Exhaustive switch — TypeScript ensures all cases handled
function render(state: AsyncState<User>) {
  switch (state.status) {
    case "idle": return <Placeholder />;
    case "loading": return <Spinner />;
    case "success": return <UserCard user={state.data} />;
    case "error": return <ErrorBanner error={state.error} />;
  }
}
```

**When to use:** State machines, API response states, form states, anything with distinct modes.
**When to skip:** Boolean flags are fine for simple on/off states.

### State Management Decision Tree

1. **UI-local state?** -> `useState` / `useReducer`
2. **Shared between siblings?** -> Lift state to common parent
3. **Shared across distant components?** -> React Context
4. **Complex state logic?** -> `useReducer` + Context
5. **Server state (API data)?** -> TanStack Query / SWR
6. **Global app state?** -> Zustand / Jotai (prefer over Redux for new projects)

---

## Django / Python Patterns

### Service Layer

Separate business logic from views and models.

```python
# services/order_service.py
class OrderService:
    @staticmethod
    def create_order(user: User, items: list[CartItem]) -> Order:
        """Business logic lives here, not in the view."""
        order = Order.objects.create(user=user, total=calculate_total(items))
        OrderItem.objects.bulk_create([...])
        send_confirmation_email(user, order)
        return order
```

**When to use:** Business logic that involves multiple models, external calls, or complex validation.
**When to skip:** Simple CRUD with no business rules beyond Django's built-in validation.

### Repository Pattern (QuerySet Abstraction)

Custom managers and querysets to encapsulate query logic.

```python
class PublishedManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(status="published")

class Article(models.Model):
    objects = models.Manager()  # Default
    published = PublishedManager()  # Article.published.all()
```

**When to use:** Complex or reusable query logic, domain-specific filtering.
**When to skip:** One-off queries or simple filters.

### Signals vs Explicit Calls

| Approach | Pros | Cons |
|---|---|---|
| Django signals | Decoupled, works across apps | Hidden control flow, hard to debug, ordering issues |
| Explicit calls | Visible, debuggable, testable | Coupling between modules |

**Rule of thumb:** Use signals for truly cross-cutting concerns (audit logging, cache invalidation). Use explicit calls for business-critical logic where you need to understand and test the flow.

---

## Anti-Patterns (All Stacks)

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **Premature abstraction** | Abstracting before seeing the pattern repeat | Wait for 3 instances before extracting |
| **Inheritance over composition** | Deep inheritance hierarchies, fragile base class | Prefer composition (traits, hooks, mixins) |
| **God object** | One class/module that does everything | Split by responsibility (SRP) |
| **Shotgun surgery** | One change requires editing many files | Group related code together |
| **Feature envy** | A function uses another class's data more than its own | Move the function to the class it envies |
| **Speculative generality** | Building for use cases that may never come | YAGNI — build for now, refactor when needed |
| **Golden hammer** | Using the same pattern/tool for everything | Choose the right tool for the job |

---

## Pattern Selection Guide

When asked "which pattern should I use?":

1. **Describe the problem** (not the pattern you think fits)
2. **Identify constraints** (performance, extensibility, team size, timeline)
3. **Present 2-3 options** with trade-offs
4. **Recommend one** with clear justification
5. **Note when to revisit** — "If X changes, reconsider Y"

---

## Integration

Cross-reference this pack's `code-architect` skill for structural/architecture assessment and `code-quality` for the complexity thresholds that motivate refactoring toward a pattern.
