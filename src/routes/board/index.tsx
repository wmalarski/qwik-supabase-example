import { component$ } from "@builder.io/qwik";
import {
  Form,
  routeAction$,
  routeLoader$,
  z,
  zod$,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { getSupabaseInstance, getSupabaseSession } from "../plugin";

export const useTasks = routeLoader$(async (event) => {
  const supabase = getSupabaseInstance(event);

  const { data } = await supabase.from("Task").select();

  return data;
});

export const useInsertTask = routeAction$(
  async (args, event) => {
    const session = getSupabaseSession(event);

    if (!session) {
      throw event.error(400, "Unauthorized");
    }

    const supabase = getSupabaseInstance(event);

    const result = await supabase
      .from("Task")
      .insert({ test: args.text, user_id: session.user.id });

    return result;
  },
  zod$({
    text: z.string(),
  })
);

export const useDeleteTask = routeAction$(
  async (args, event) => {
    const session = getSupabaseSession(event);

    if (!session) {
      throw event.error(400, "Unauthorized");
    }

    const supabase = getSupabaseInstance(event);

    const result = await supabase.from("Task").delete().eq("id", args.id);

    return result;
  },
  zod$({
    id: z.coerce.number(),
  })
);

export default component$(() => {
  const tasks = useTasks();

  const insertAction = useInsertTask();
  const deleteAction = useDeleteTask();

  return (
    <div class="flex flex-col gap-2">
      <span>Authorized</span>
      <Form action={insertAction} class="flex flex-col gap-2">
        <label>
          Text
          <input name="text" />
        </label>
        {insertAction.isRunning ? <span>Loading...</span> : null}
        {insertAction.value ? (
          <pre>{JSON.stringify(insertAction.value, null, 2)}</pre>
        ) : null}
        <button type="submit">Submit</button>
      </Form>
      {tasks.value?.map((task) => (
        <div key={task.id} class="flex flex-col gap-1">
          <pre>{JSON.stringify(task, null, 2)}</pre>
          <Form action={deleteAction}>
            <input type="hidden" name="id" value={task.id} />
            <button disabled={deleteAction.isRunning} type="submit">
              Delete
            </button>
          </Form>
        </div>
      ))}
    </div>
  );
});

export const head: DocumentHead = {
  title: "Board - Welcome to Qwik",
};
