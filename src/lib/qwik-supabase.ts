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
  type Provider,
  type Session,
  type SupabaseClient,
  type SupabaseClientOptions,
} from "@supabase/supabase-js";
import type { GenericSchema } from "@supabase/supabase-js/dist/module/lib/types";

export type QwikSupabaseConfig<SchemaName> = {
  supabaseUrl: string;
  supabaseKey: string;
  options?: SupabaseClientOptions<SchemaName>;
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

  const useSupabaseSignInWithIdToken = globalAction$(
    async (data, event) => {
      const supabase = event.sharedMap.get("supabase") as SupabaseClient<
        Database,
        SchemaName,
        Schema
      >;

      const result = await supabase.auth.signInWithIdToken(data);

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
      nonce: z.string().optional(),
      options: z.object({ captchaToken: z.string().optional() }).optional(),
      provider: z.union([z.literal("google"), z.literal("apple")]),
      redirectTo: z.string().optional(),
      token: z.string(),
    })
  );

  const useSupabaseSignInWithOAuth = globalAction$(
    async (data, event) => {
      const supabase = event.sharedMap.get("supabase") as SupabaseClient<
        Database,
        SchemaName,
        Schema
      >;

      const result = await supabase.auth.signInWithOAuth(data);

      if (result.error) {
        const status = result.error?.status || 400;
        return event.fail(status, {
          formErrors: [result.error?.message],
        });
      }

      throw event.redirect(302, result.data.url);
    },
    zod$({
      options: z
        .object({
          queryParams: z.record(z.string()).optional(),
          redirectTo: z.string().optional(),
          scopes: z.string().optional(),
          skipBrowserRedirect: z.boolean().optional(),
        })
        .optional(),
      provider: z.string().transform((provider) => provider as Provider),
    })
  );

  const useSupabaseSignInWithOtp = globalAction$(
    async (data, event) => {
      const supabase = event.sharedMap.get("supabase") as SupabaseClient<
        Database,
        SchemaName,
        Schema
      >;

      const result = await supabase.auth.signInWithOtp(data);

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
    zod$(
      z.union([
        z.object({
          email: z.string(),
          options: z.object({
            captchaToken: z.string().optional(),
            data: z.any(),
            emailRedirectTo: z.string().optional(),
            shouldCreateUser: z.boolean().optional(),
          }),
          redirectTo: z.string().optional(),
        }),
        z.object({
          options: z.object({
            captchaToken: z.string().optional(),
            channel: z.union([z.literal("sms"), z.literal("whatsapp")]),
            data: z.any(),
            shouldCreateUser: z.boolean().optional(),
          }),
          phone: z.string(),
          redirectTo: z.string().optional(),
        }),
      ])
    )
  );

  const useSupabaseSignInWithSSO = globalAction$(
    async (data, event) => {
      const supabase = event.sharedMap.get("supabase") as SupabaseClient<
        Database,
        SchemaName,
        Schema
      >;

      const result = await supabase.auth.signInWithSSO(data);

      if (result.error) {
        const status = result.error?.status || 400;
        return event.fail(status, {
          formErrors: [result.error?.message],
        });
      }

      throw event.redirect(302, result.data.url);
    },
    zod$(
      z.union([
        z.object({
          options: z
            .object({
              captchaToken: z.string().optional(),
              redirectTo: z.string().optional(),
            })
            .optional(),
          providerId: z.string(),
        }),
        z.object({
          domain: z.string(),
          options: z
            .object({
              captchaToken: z.string().optional(),
              redirectTo: z.string().optional(),
            })
            .optional(),
        }),
      ])
    )
  );

  const useSupabaseSignUp = globalAction$(
    async (data, event) => {
      const supabase = event.sharedMap.get("supabase") as SupabaseClient<
        Database,
        SchemaName,
        Schema
      >;

      const result = await supabase.auth.signUp(data);

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
    zod$(
      z.union([
        z.object({
          email: z.string(),
          options: z
            .object({
              captchaToken: z.string().optional(),
              data: z.any().optional(),
              emailRedirectTo: z.string().optional(),
            })
            .optional(),
          password: z.string(),
          redirectTo: z.string().optional(),
        }),
        z.object({
          options: z
            .object({
              captchaToken: z.string().optional(),
              channel: z.union([z.literal("sms"), z.literal("whatsapp")]),
              data: z.any().optional(),
            })
            .optional(),
          password: z.string(),
          phone: z.string(),
          redirectTo: z.string().optional(),
        }),
      ])
    )
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

  const useSupabaseSession = routeLoader$((request) => {
    return request.sharedMap.get(sessionSharedKey) as Session | null;
  });

  const getSupabaseInstance = (
    request: RequestEventCommon
  ): SupabaseClient<Database, SchemaName, Schema> => {
    return request.sharedMap.get(supabaseSharedKey);
  };

  const getSupabaseSession = (request: RequestEventCommon): Session | null => {
    return request.sharedMap.get(sessionSharedKey);
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

      event.sharedMap.set(supabaseSharedKey, supabase);

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
    }
  };

  return {
    getSupabaseInstance,
    getSupabaseSession,
    onRequest,
    useSupabaseSession,
    useSupabaseSetSession,
    useSupabaseSignInWithIdToken,
    useSupabaseSignInWithOAuth,
    useSupabaseSignInWithOtp,
    useSupabaseSignInWithPassword,
    useSupabaseSignInWithSSO,
    useSupabaseSignOut,
    useSupabaseSignUp,
  };
};

export const serverSupabase$ =
  /*#__PURE__*/ implicit$FirstArg(serverSupabaseQrl);
