import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { ProtectedHeader } from "~/modules/layout/ProtectedHeader/ProtectedHeader";
import { PublicHeader } from "~/modules/layout/PublicHeader/PublicHeader";
import { getSupabaseSession } from "./plugin";

export const useSession = routeLoader$((event) => {
  return getSupabaseSession(event);
});

export default component$(() => {
  const user = useSession();

  return (
    <div class="flex flex-col">
      {user.value ? <ProtectedHeader /> : <PublicHeader />}
      <section class="border-b-8 border-solid border-primary p-5">
        <h1>
          Welcome to Qwik <span>⚡️</span>
        </h1>
        <pre>{JSON.stringify(user.value, null, 2)}</pre>
      </section>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Welcome to Qwik",
};
