import { connect } from "../hooks";
import { dispatcher, store } from "./module";
import {
  AddTodoProps,
  TodoItemProps,
  TodoListProps,
  createAddTodoProps,
  createTodoItemProps,
  createTodoListProps,
} from "./props";

export const AddTodo = (props: AddTodoProps) => (
  <div>
    <input
      type="text"
      value={props.addTodoText}
      onChange={(e) => props.setAddTodoText(e.target.value)}
    />
    <button onClick={() => props.addTodo()} disabled={props.addTodoText === ""}>
      +
    </button>
  </div>
);

export const TodoItem = (props: TodoItemProps) => (
  <div key={props.item.key}>
    <input
      type="checkbox"
      checked={props.item.completed}
      onChange={() => props.completed()}
    />
    <span
      style={{
        textDecoration: props.item.completed ? "line-through" : undefined,
      }}
    >
      {props.item.description}
    </span>
    <button onClick={() => props.delete()}>x</button>
  </div>
);

export const TodoList = (props: TodoListProps) => (
  <div>
    {props.todoList.map((key) => {
      return <ConnectedTodoItem key={key} todoKey={key} />;
    })}
  </div>
);

export const Todo = () => {
  return (
    <div>
      <ConnectedAddTodo />
      <ConnectedTodoList />
    </div>
  );
};

// todo useContext for store and dispatcher?

export const ConnectedAddTodo = connect(
  AddTodo,
  createAddTodoProps(store, dispatcher)
);

export const ConnectedTodoItem = connect(
  TodoItem,
  createTodoItemProps(store, dispatcher)
);

export const ConnectedTodoList = connect(
  TodoList,
  createTodoListProps(store, dispatcher)
);
