import { component$ } from "@builder.io/qwik";
import { Form, useNavigate } from "@builder.io/qwik-city";
import { useSupabaseSignInWithOAuth } from "~/routes/plugin";

export const GoogleForm = component$(() => {
  const action = useSupabaseSignInWithOAuth();
  const navigate = useNavigate();

  return (
    <Form
      class="flex flex-col gap-2"
      action={action}
      onSubmitCompleted$={() => {
        const url = action.value?.url;
        if (url) {
          navigate(url);
        }
      }}
    >
      <h2 class="text-xl">Login with google</h2>
      <input type="hidden" name="provider" value="google" />
      <button class="btn btn-primary" type="submit">
        Google
      </button>
    </Form>
  );
});
