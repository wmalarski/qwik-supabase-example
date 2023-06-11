import { component$ } from "@builder.io/qwik";
import { type DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <div class="flex flex-col gap-2">
      <span>Authorized</span>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Board - Welcome to Qwik",
};
