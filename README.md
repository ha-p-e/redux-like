# redux-like

Experiment to explore a state management approach similar to Redux, that aims to further simplify data flow, reduce boilerplate, and improve performance and maintainability.

### Data Flow

```mermaid
graph LR
  subgraph Dispatcher
    ActionHandler(ActionHandler)
  end
  View(View) --> Action(Action)
  Action --> Dispatcher
  Dispatcher --> Store(Store)
  Store --> View
```

Although the Redux data flow looks similar, in practice there is often logic in components, middleware, reducers and selectors. The idea is to remove or reduce the need for logic in these areas and instead capture all behavior within pure TypeScript [`ActionHandler`](#actionhandler) functions that are easy to test and maintain.

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

The return type also supports `Promise` and `Observable` types allowing an `ActionHandler` to support asynchronous operations without middleware. `undefined` is also allowed as a `ActionHandler` may not update the [store](#store).

Unlike a reducer, `ActionHandler` does require the [store](#store) as a parameter to create a `StoreUpdate`. However, if required, a `ReadonlyStore` can be passed in along with other dependencies such as services using a curried function. For example:

```ts
(store: ReadonlyStore) => (action: Action<T>) => ...
```

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

`connect` is similar to the React Redux [connect](https://react-redux.js.org/api/connect) and connects the `Observable` store and values to components.

```tsx
const connect =
  <T extends {}, P extends {}>(
    Component: FC<T & P>,
    connectProps: (props: P) => Observable<T> | T
  ): FC<P> =>
  (props: P) => ...
```

It allows function components to access state through props easily, without the need for hooks. Hooks can often encourage code that couples state, logic, and effects with components, which reduces maintainability.
