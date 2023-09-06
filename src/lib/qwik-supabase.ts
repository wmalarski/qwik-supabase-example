/* eslint-disable qwik/loader-location */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { implicit$FirstArg, type QRL } from "@builder.io/qwik";
import {
  globalAction$,
  z,
  zod$,
  type CookieOptions,
  type RequestEvent,
  type RequestEventCommon,
} from "@builder.io/qwik-city";
import { isServer } from "@builder.io/qwik/build";
import {
  createClient,
  type Provider,
  type Session,
  type SupabaseClient,
  type SupabaseClientOptions,
} from "@supabase/supabase-js";
import type {
  GenericSchema,
  SupabaseAuthClientOptions,
} from "@supabase/supabase-js/dist/module/lib/types";

export type QwikSupabaseConfig<SchemaName> = {
  supabaseUrl: string;
  supabaseKey: string;
  options?: SupabaseClientOptions<SchemaName>;
  emailRedirectTo: string;
  signInRedirectTo: string;
  signInPath: string;
};

const cookieName = "_session";
const sessionSharedKey = "session";
const supabaseSharedKey = "supabase";

const options: CookieOptions = {
  httpOnly: true,
  maxAge: 610000,
  path: "/",
  sameSite: "lax",
};

const updateAuthCookies = (
  event: RequestEventCommon,
  session: Pick<Session, "refresh_token" | "expires_in" | "access_token">,
) => {
  event.cookie.set(cookieName, session, options);
};

const removeAuthCookies = (event: RequestEventCommon) => {
  event.cookie.delete(cookieName, options);
};

export const getCookieStorage = (
  event: RequestEventCommon,
): SupabaseAuthClientOptions["storage"] => {
  return {
    getItem(key: string): string | Promise<string | null> | null {
      return event.cookie.get(key)?.json() || null;
    },
    removeItem(key: string): void | Promise<void> {
      event.cookie.delete(key, options);
    },
    setItem(key: string, value: string): void | Promise<void> {
      event.cookie.set(key, value, options);
    },
  };
};

export const serverSupabaseQrl = <
  Database = any,
  SchemaName extends string & keyof Database = "public" extends keyof Database
    ? "public"
    : string & keyof Database,
  Schema extends GenericSchema = Database[SchemaName] extends GenericSchema
    ? Database[SchemaName]
    : any,
>(
  supabaseOptions: QRL<
    (
      ev: RequestEventCommon,
    ) =>
      | QwikSupabaseConfig<SchemaName>
      | Promise<QwikSupabaseConfig<SchemaName>>
  >,
) => {
  type Supabase = SupabaseClient<Database, SchemaName, Schema>;

  const getSupabaseInstance = (request: RequestEventCommon): Supabase => {
    return request.sharedMap.get(supabaseSharedKey);
  };

  const getSupabaseSession = (request: RequestEventCommon): Session | null => {
    return request.sharedMap.get(sessionSharedKey);
  };

  const useSupabaseSignInWithPassword = globalAction$(
    async (data, event) => {
      const config = await supabaseOptions(event);

      const supabase = event.sharedMap.get(supabaseSharedKey) as Supabase;

      const result = await supabase.auth.signInWithPassword(data);

      if (result.error || !result.data.session) {
        const status = result.error?.status || 400;
        return event.fail(status, {
          formErrors: [result.error?.message],
        });
      }

      updateAuthCookies(event, result.data.session);

      throw event.redirect(302, config.signInRedirectTo);
    },
    zod$({
      email: z.string().email(),
      password: z.string(),
    }),
  );

  const useSupabaseSignInWithOAuth = globalAction$(
    async (data, event) => {
      const config = await supabaseOptions(event);

      const supabase = event.sharedMap.get(supabaseSharedKey) as Supabase;

      const result = await supabase.auth.signInWithOAuth({
        options: { redirectTo: config.emailRedirectTo },
        ...data,
      });

      if (result.error) {
        const status = result.error?.status || 400;
        return event.fail(status, {
          formErrors: [result.error?.message],
        });
      }

      throw event.redirect(302, result.data.url);
    },
    zod$({
      provider: z.string().transform((provider) => provider as Provider),
    }),
  );

  const useSupabaseSignInWithOtp = globalAction$(
    async (data, event) => {
      const config = await supabaseOptions(event);

      const supabase = event.sharedMap.get(supabaseSharedKey) as Supabase;

      const result = await supabase.auth.signInWithOtp({
        options: { emailRedirectTo: config.emailRedirectTo },
        ...data,
      });

      if (result.error) {
        const status = result.error?.status || 400;
        return event.fail(status, {
          formErrors: [result.error?.message],
        });
      }

      if (result.data.session) {
        updateAuthCookies(event, result.data.session);

        throw event.redirect(302, config.signInRedirectTo);
      }

      event.json(200, result.data);
    },
    zod$({
      email: z.string(),
    }),
  );

  const useSupabaseSignUp = globalAction$(
    async (data, event) => {
      const config = await supabaseOptions(event);

      const supabase = event.sharedMap.get(supabaseSharedKey) as Supabase;

      const result = await supabase.auth.signUp({
        options: { emailRedirectTo: config.emailRedirectTo },
        ...data,
      });

      if (result.error) {
        const status = result.error.status || 400;
        return event.fail(status, { formErrors: [result.error.message] });
      }

      if (result.data.session) {
        updateAuthCookies(event, result.data.session);
      }

      throw event.redirect(302, config.signInPath);
    },
    zod$({
      email: z.string(),
      password: z.string(),
    }),
  );

  const useSupabaseSignOut = globalAction$(async (_data, event) => {
    const config = await supabaseOptions(event);

    removeAuthCookies(event);

    throw event.redirect(302, config.signInPath);
  });

  const onRequest = async (event: RequestEvent) => {
    if (!isServer) {
      return;
    }

    const config = await supabaseOptions(event);

    const supabase = createClient<Database, SchemaName, Schema>(
      config.supabaseUrl,
      config.supabaseKey,
      {
        ...config.options,
        auth: {
          flowType: "pkce",
          persistSession: false,
          storage: getCookieStorage(event),
          ...config.options?.auth,
        },
      },
    );

    event.sharedMap.set(supabaseSharedKey, supabase);

    if (event.url.href.startsWith(config.emailRedirectTo)) {
      const code = event.url.searchParams.get("code");

      if (!code) {
        throw event.error(400, "Invalid request");
      }

      const tokenResponse = await supabase.auth.exchangeCodeForSession(code);
      if (tokenResponse.error) {
        throw event.error(400, "Invalid request");
      }

      updateAuthCookies(event, tokenResponse.data.session);
      throw event.redirect(302, config.signInRedirectTo);
    }

    const value = event.cookie.get(cookieName)?.json();

    const parsed = z
      .object({ access_token: z.string(), refresh_token: z.string() })
      .safeParse(value);

    if (!parsed.success) {
      return;
    }

    const userResponse = await supabase.auth.setSession(parsed.data);

    if (userResponse.data.session) {
      event.sharedMap.set(sessionSharedKey, userResponse.data.session);
      return;
    }

    const refreshResponse = await supabase.auth.refreshSession({
      refresh_token: parsed.data.refresh_token,
    });

    if (!refreshResponse.data.session) {
      removeAuthCookies(event);
      return;
    }

    const session = refreshResponse.data.session;
    updateAuthCookies(event, session);

    event.sharedMap.set(sessionSharedKey, session);
  };

  return {
    getSupabaseInstance,
    getSupabaseSession,
    onRequest,
    useSupabaseSignInWithOAuth,
    useSupabaseSignInWithOtp,
    useSupabaseSignInWithPassword,
    useSupabaseSignOut,
    useSupabaseSignUp,
  };
};

export const serverSupabase$ =
  /*#__PURE__*/ implicit$FirstArg(serverSupabaseQrl);
