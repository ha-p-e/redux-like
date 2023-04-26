import React from "react";
import ReactDOM from "react-dom/client";
import { Todo } from "./example/components";
import { TodoProps } from "./example/props";
import { Connect } from "./hooks";
import { createTodoProps } from "./example/module";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <Connect<TodoProps> component={Todo} props={createTodoProps()} />
  </React.StrictMode>
);
