/* eslint-disable qwik/loader-location */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { implicit$FirstArg, type QRL } from "@builder.io/qwik";
import {
  globalAction$,
  routeLoader$,
  z,
  zod$,
  type CookieOptions,
  type RequestEvent,
  type RequestEventCommon,
} from "@builder.io/qwik-city";
import { isServer } from "@builder.io/qwik/build";
import {
  createClient,
  type Session,
  type SupabaseClient,
  type SupabaseClientOptions,
  type User,
} from "@supabase/supabase-js";
import type { GenericSchema } from "@supabase/supabase-js/dist/module/lib/types";

export type QwikSupabaseConfig<SchemaName> = {
  supabaseUrl: string;
  supabaseKey: string;
  options?: SupabaseClientOptions<SchemaName>;
};

const cookieName = "_session";

const options: CookieOptions = {
  httpOnly: true,
  maxAge: 610000,
  path: "/",
  sameSite: "lax",
};

const updateAuthCookies = (
  event: RequestEventCommon,
  session: Pick<Session, "refresh_token" | "expires_in" | "access_token">
) => {
  event.cookie.set(cookieName, session, options);
};

const removeAuthCookies = (event: RequestEventCommon) => {
  event.cookie.delete(cookieName, options);
};

export const serverSupabaseQrl = <
  Database = any,
  SchemaName extends string & keyof Database = "public" extends keyof Database
    ? "public"
    : string & keyof Database,
  Schema extends GenericSchema = Database[SchemaName] extends GenericSchema
    ? Database[SchemaName]
    : any
>(
  supabaseOptions: QRL<
    (
      ev: RequestEventCommon
    ) =>
      | QwikSupabaseConfig<SchemaName>
      | Promise<QwikSupabaseConfig<SchemaName>>
  >
) => {
  const useSupabaseSignInWithPassword = globalAction$(
    async (data, event) => {
      const supabase = event.sharedMap.get("supabase") as SupabaseClient<
        Database,
        SchemaName,
        Schema
      >;

      const result = await supabase.auth.signInWithPassword(data);

      if (result.error || !result.data.session) {
        const status = result.error?.status || 400;
        return event.fail(status, {
          formErrors: [result.error?.message],
        });
      }

      updateAuthCookies(event, result.data.session);

      if (data.redirectTo) {
        throw event.redirect(302, data.redirectTo);
      }
    },
    zod$({
      email: z.string().email(),
      password: z.string(),
      redirectTo: z.string().optional(),
    })
  );

  const useSupabaseSetSession = globalAction$(
    (data, event) => {
      updateAuthCookies(event, data);
    },
    zod$({
      access_token: z.string(),
      expires_in: z.coerce.number(),
      refresh_token: z.string(),
    })
  );

  const useSupabaseSignOut = globalAction$(
    (data, event) => {
      removeAuthCookies(event);

      if (data.redirectTo) {
        throw event.redirect(302, data.redirectTo);
      }
    },
    zod$({
      redirectTo: z.string().optional(),
    })
  );

  const useSupabaseUser = routeLoader$((req) => {
    return req.sharedMap.get("user") as User | null;
  });

  const getSupabaseInstance = (
    req: RequestEventCommon
  ): SupabaseClient<Database, SchemaName, Schema> => {
    return req.sharedMap.get("supabase");
  };

  const onRequest = async (event: RequestEvent) => {
    if (isServer) {
      const config = await supabaseOptions(event);

      const supabase = createClient<Database, SchemaName, Schema>(
        config.supabaseUrl,
        config.supabaseKey,
        {
          ...config.options,
          auth: { persistSession: false, ...config.options?.auth },
        }
      );

      event.sharedMap.set("supabase", supabase);

      const value = event.cookie.get(cookieName)?.json();

      const parsed = z
        .object({ access_token: z.string(), refresh_token: z.string() })
        .safeParse(value);

      if (!parsed.success) {
        return;
      }

      const userResponse = await supabase.auth.setSession(parsed.data);

      if (userResponse.data.user) {
        event.sharedMap.set("user", userResponse.data.user);
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

      event.sharedMap.set("user", session.user);
    }
  };

  return {
    getSupabaseInstance,
    onRequest,
    useSupabaseSetSession,
    useSupabaseSignInWithPassword,
    useSupabaseSignOut,
    useSupabaseUser,
  };
};

export const serverSupabase$ =
  /*#__PURE__*/ implicit$FirstArg(serverSupabaseQrl);
