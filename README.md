# redux-like

Experiment to explore a state management approach similar to Redux, that aims to further simplify data flow, reduce boilerplate, and improve performance and maintainability.

### Data Flow

View -> Action -> [Dispatcher -> ActionHandler] -> Store -> View

The main idea is to remove or reduce the need for logic in components, middleware, reducers and selectors, and capture all behavior within pure TypeScript [`ActionHandler`](#actionhandler) functions that are easy to test and maintain.

### ActionHandler

Actions are processed by corresponding `ActionHandler` functions.

```ts
type ActionHandler<T> = (
  action: Action<T>
) =>
  | StoreUpdate
  | StoreUpdate[]
  | Promise<StoreUpdate | StoreUpdate[]>
  | Observable<StoreUpdate | StoreUpdate[]>
  | undefined;
```

`ActionHandler` takes an `Action` as argument and returns various forms of `StoreUpdate` which is essentially just a key value pair representing an update to the [store](#store).

The return type also supports `Promise` and `Observable` types allowing an `ActionHandler` to support asynchronous operations without middleware.

### Store

Store is implemented as a `Map` of `Observable` values.

```ts
type Store = {
  ...
  get<T>(key: StoreKey<T>): T | undefined;
  get$<T>(key: StoreKey<T>): Observable<T>;
  set(value: T): StoreValue<T>;
  ...
};
```

Using a `Map` improves performance by reducing copying and traversal of nested objects.

Reducers are no longer needed to update the store, as a `Map` store can be generically updated by the Dispatcher given a `StoreUpdate`. Similarly, there is no longer a need for selectors to extract values from a nested object store.

Exposing values as an `Observable` enables stream level operations such as debounce to be easily performed.

### Connect

`Connect` connects the `Observable` store values to components.

```tsx
function Connect<T>(props: { component: FC<T>; props: Observable<T> | T });
```

It allows function components to access state through props easily, without the need for hooks. Hooks can often encourage code that couples state, logic, and effects with components, which reduces maintainability.
