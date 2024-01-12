import { StoreKey } from '../store'
import { createSlice, init, payload } from '../toolkit'
import { Todo } from './types'

export const { keys, actions, actionTypes } = createSlice({
  keys: {
    todoText: init(''),
    todoList: init([] as string[]),
    todoItem: (key: string) => init<Todo>({ key, description: '', completed: false })
  },
  actions: {
    set: payload<{ key: StoreKey<any>; value: any }>(),
    addTodoItem: payload<void>(),
    completeTodoItem: payload<string>(),
    delTodoItem: payload<string>()
  }
})
