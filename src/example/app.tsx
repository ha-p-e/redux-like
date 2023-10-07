import { ContextProvider } from "../connect";
import { createSlice, init } from "../toolkit";
import AddTodo from "./components/addTodo";
import TodoList from "./components/todoList";
import { addTodoItemHandler, completeTodoListHandler, delTodoItemHandler, setHandler } from "./handlers";

export interface Todo {
  key: string;
  description: string;
  completed: boolean;
}

export const { keys, actions, initSlice } = createSlice({
  keys: {
    todoText: init(""),
    todoList: init([] as string[]),
    todoItem: (key: string) => init<Todo>({ key, description: "", completed: false }),
  },
  actions: {
    set: setHandler,
    addTodoItem: addTodoItemHandler,
    completeTodoItem: completeTodoListHandler,
    delTodoItem: delTodoItemHandler,
  },
});

const { store, dispatch, updates$ } = initSlice();

updates$.subscribe((update) => {
  if (update instanceof Error) console.log(update);
  else if ("type" in update) console.log("dispatch:", update.type, update.payload);
  else if (Array.isArray(update)) {
    update.forEach((storeUpdate) =>
      console.log(
        `${storeUpdate.source}.${storeUpdate.action}:`,
        storeUpdate.key.key,
        "value" in storeUpdate ? storeUpdate.value : undefined
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
