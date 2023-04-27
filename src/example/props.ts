import { map, Observable, tap } from "rxjs";
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
  createTodoItemProps: (item: string) => Observable<TodoItemProps>;
}

export interface TodoProps {
  createAddTodoProps: () => Observable<AddTodoProps>;
  createTodoListProps: () => Observable<TodoListProps>;
}

export const todoPropsFactory = (
  store: ReadonlyStore,
  dispatch: Dispatcher
) => {
  const createAddTodoProps = (): Observable<AddTodoProps> =>
    store.get$(Keys.todoText).pipe(
      map((addTodoText) => ({
        addTodoText,
        setAddTodoText: (text: string) => dispatch(set(Keys.todoText, text)),
        addTodo: () => dispatch(Action.create(Actions.addTodoItem)),
      }))
    );

  const createTodoItemProps = (key: string): Observable<TodoItemProps> =>
    store.get$(Keys.todoItem(key)).pipe(
      map((item) => ({
        item,
        delete: () => dispatch(Action.create(Actions.delTodoItem, item)),
        completed: () =>
          dispatch(Action.create(Actions.completeTodoItem, item)),
      }))
    );

  const createTodoListProps = (): Observable<TodoListProps> =>
    store.get$(Keys.todoList).pipe(
      map((list) => ({
        todoList: list,
        setTodoList: (list: string[]) => dispatch(set(Keys.todoList, list)),
        createTodoItemProps,
      }))
    );

  return (): TodoProps => ({
    createAddTodoProps,
    createTodoListProps,
  });
};
