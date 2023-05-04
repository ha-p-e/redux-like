import { map } from "rxjs";
import { Keys, TodoItem } from "./module";
import { Dispatcher } from "../dispatcher";
import { ReadonlyStore } from "../store";
import { Action } from "../action";
import { Actions, set } from "./actions";

export interface AddTodoProps {
  addTodoText: string;
  setAddTodoText: (text: string) => void;
  addTodo: () => void;
}

export interface TodoItemProps {
  item: TodoItem;
  delete: () => void;
  completed: () => void;
}

export interface TodoListProps {
  todoList: string[];
  setTodoList: (list: string[]) => void;
}

export const createAddTodoProps =
  (store: ReadonlyStore, dispatch: Dispatcher) => () =>
    store.get$(Keys.todoText).pipe(
      map((addTodoText) => ({
        addTodoText,
        setAddTodoText: (text: string) => dispatch(set(Keys.todoText, text)),
        addTodo: () => dispatch(Action.create(Actions.addTodoItem)),
      }))
    );

export const createTodoItemProps =
  (store: ReadonlyStore, dispatch: Dispatcher) =>
  (props: { todoKey: string }) =>
    store.get$(Keys.todoItem(props.todoKey)).pipe(
      map((item) => ({
        item,
        delete: () => dispatch(Action.create(Actions.delTodoItem, item)),
        completed: () =>
          dispatch(Action.create(Actions.completeTodoItem, item)),
      }))
    );

export const createTodoListProps =
  (store: ReadonlyStore, dispatch: Dispatcher) => () =>
    store.get$(Keys.todoList).pipe(
      map((list) => ({
        todoList: list,
        setTodoList: (list: string[]) => dispatch(set(Keys.todoList, list)),
      }))
    );
