import { testActionHandler } from "../toolkit";
import { keys } from "./app";
import { addTodoItemHandler, completeTodoListHandler, delTodoItemHandler, setHandler } from "./handlers";

const itemKey = "key";
jest.mock("nanoid", () => ({ nanoid: () => itemKey }));

test("setHandler", () =>
  testActionHandler(({ set }) => ({
    handler: setHandler,
    payload: { key: keys.todoText, value: "text" },
    expected: [set(keys.todoText, "text")],
  })));

test("addTodoItemHandler", () =>
  testActionHandler(({ set }) => ({
    handler: addTodoItemHandler,
    expected: [
      set(keys.todoItem(itemKey), {
        key: itemKey,
        description: "",
        completed: false,
      }),
      set(keys.todoList, [itemKey]),
      set(keys.todoText, ""),
    ],
  })));

test("completeTodoListHandler", () =>
  testActionHandler(({ set }) => ({
    setup: [set(keys.todoItem("1"), { key: "1", description: "", completed: false })],
    handler: completeTodoListHandler,
    payload: "1",
    expected: [set(keys.todoItem("1"), { key: "1", description: "", completed: true })],
  })));

test("delTodoItemHandler", () =>
  testActionHandler(({ set, del }) => ({
    setup: [set(keys.todoList, ["1", "2"])],
    handler: delTodoItemHandler,
    payload: "1",
    expected: [del(keys.todoItem("1")), set(keys.todoList, ["2"])],
  })));
