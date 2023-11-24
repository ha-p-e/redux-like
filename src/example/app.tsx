import { ContextProvider } from "../connect";
import { initSlice } from "../toolkit";
import AddTodo from "./components/addTodo";
import TodoList from "./components/todoList";
import { actionHandlerCreators } from "./handlers";

const { store, dispatch, updates$ } = initSlice(actionHandlerCreators())();

updates$.subscribe(update => {
  if (update instanceof Error) console.log(update);
  else if ("type" in update) console.log("dispatch:", update.type, update.payload, update.trace);
  else if (Array.isArray(update)) {
    update.forEach(storeUpdate =>
      console.log(
        `${storeUpdate.action}:`,
        storeUpdate.key.key,
        "value" in storeUpdate ? storeUpdate.value : undefined,
        storeUpdate.trace
      )
    );
    console.log("store:", store.snap());
  }
});

export const App = () => (
  <ContextProvider context={{ store, dispatch }}>
    <div>
      <AddTodo />
      <TodoList />
    </div>
  </ContextProvider>
);
