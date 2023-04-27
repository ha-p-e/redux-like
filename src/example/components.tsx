import { Connect } from "../hooks";
import { AddTodoProps, TodoItemProps, TodoListProps, TodoProps } from "./props";

const AddTodo = (props: AddTodoProps) => (
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

const TodoItem = (props: TodoItemProps) => (
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

const TodoList = (props: TodoListProps) => (
  <div>
    {props.todoList.map((key) => (
      <Connect<TodoItemProps>
        key={key}
        component={TodoItem}
        props={props.createTodoItemProps(key)}
      />
    ))}
  </div>
);

export const Todo = (props: TodoProps) => (
  <div>
    <Connect<AddTodoProps>
      component={AddTodo}
      props={props.createAddTodoProps()}
    />
    <Connect<TodoListProps>
      component={TodoList}
      props={props.createTodoListProps()}
    />
  </div>
);
