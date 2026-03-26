import { createClient } from "npm:@supabase/supabase-js@2";

interface NotificationRecord {
  id: string;
  user_profile_id: string;
  type: string;
  title: string;
  body: string;
  data: {
    cragId: string;
    cragSlug: string;
    cragName: string;
    reportId: string;
    category: string;
  };
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: NotificationRecord;
  schema: "public";
  old_record: null | NotificationRecord;
}

// Translations for push notification title: "New report at {cragName}"
const TITLE_TRANSLATIONS: Record<string, string> = {
  en: "New report at",
  de: "Neuer Bericht bei",
  fr: "Nouveau rapport à",
  es: "Nuevo reporte en",
  it: "Nuovo report a",
  pl: "Nowy raport w",
  pt: "Novo relatório em",
  nl: "Nieuw rapport bij",
  cs: "Nová zpráva v",
  sk: "Nová správa v",
  sl: "Novo poročilo v",
  hr: "Novo izvješće u",
  bg: "Нов доклад в",
  ro: "Raport nou la",
  uk: "Новий звіт у",
  el: "Νέα αναφορά στο",
  da: "Ny rapport ved",
  sv: "Ny rapport vid",
  nb: "Ny rapport ved",
  fi: "Uusi raportti kohteessa",
  ca: "Nou informe a",
};

// Translations for "Someone found your report helpful"
const HELPFUL_TITLE_TRANSLATIONS: Record<string, string> = {
  en: "Someone found your report helpful",
  de: "Jemand fand deinen Bericht hilfreich",
  fr: "Quelqu'un a trouvé votre rapport utile",
  es: "Alguien encontró útil tu reporte",
  it: "Qualcuno ha trovato utile il tuo report",
  pl: "Ktoś uznał twój raport za pomocny",
  pt: "Alguém achou o seu relatório útil",
  nl: "Iemand vond je rapport nuttig",
  cs: "Někdo označil vaši zprávu jako užitečnou",
  sk: "Niekto označil vašu správu ako užitočnú",
  sl: "Nekdo je označil vaše poročilo kot koristno",
  hr: "Netko je označio vaše izvješće korisnim",
  bg: "Някой намери доклада ви за полезен",
  ro: "Cineva a considerat raportul tău util",
  uk: "Хтось вважає ваш звіт корисним",
  el: "Κάποιος βρήκε χρήσιμη την αναφορά σας",
  da: "Nogen fandt din rapport nyttig",
  sv: "Någon tyckte din rapport var användbar",
  nb: "Noen fant rapporten din nyttig",
  fi: "Joku piti raporttiasi hyödyllisenä",
  ca: "Algú ha trobat el teu informe útil",
};

// Translations for category names
const CATEGORY_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: { conditions: "conditions", safety: "safety", access: "access", climbing_info: "climbing info", facilities: "facilities", other: "other" },
  de: { conditions: "Bedingungen", safety: "Sicherheit", access: "Zugang", climbing_info: "Kletterinfo", facilities: "Einrichtungen", other: "Sonstiges" },
  fr: { conditions: "conditions", safety: "sécurité", access: "accès", climbing_info: "info escalade", facilities: "installations", other: "autre" },
  es: { conditions: "condiciones", safety: "seguridad", access: "acceso", climbing_info: "info escalada", facilities: "instalaciones", other: "otro" },
  it: { conditions: "condizioni", safety: "sicurezza", access: "accesso", climbing_info: "info arrampicata", facilities: "strutture", other: "altro" },
  pl: { conditions: "warunki", safety: "bezpieczeństwo", access: "dostęp", climbing_info: "info wspinaczkowe", facilities: "udogodnienia", other: "inne" },
  pt: { conditions: "condições", safety: "segurança", access: "acesso", climbing_info: "info escalada", facilities: "instalações", other: "outro" },
  nl: { conditions: "condities", safety: "veiligheid", access: "toegang", climbing_info: "kliminfo", facilities: "voorzieningen", other: "overig" },
  cs: { conditions: "podmínky", safety: "bezpečnost", access: "přístup", climbing_info: "lezecké info", facilities: "vybavení", other: "ostatní" },
  sk: { conditions: "podmienky", safety: "bezpečnosť", access: "prístup", climbing_info: "lezecké info", facilities: "vybavenie", other: "ostatné" },
  sl: { conditions: "pogoji", safety: "varnost", access: "dostop", climbing_info: "plezalne info", facilities: "oprema", other: "drugo" },
  hr: { conditions: "uvjeti", safety: "sigurnost", access: "pristup", climbing_info: "info o penjanju", facilities: "sadržaji", other: "ostalo" },
  bg: { conditions: "условия", safety: "безопасност", access: "достъп", climbing_info: "катерене инфо", facilities: "съоръжения", other: "друго" },
  ro: { conditions: "condiții", safety: "siguranță", access: "acces", climbing_info: "info cățărare", facilities: "facilități", other: "altele" },
  uk: { conditions: "умови", safety: "безпека", access: "доступ", climbing_info: "інфо скелелазіння", facilities: "зручності", other: "інше" },
  el: { conditions: "συνθήκες", safety: "ασφάλεια", access: "πρόσβαση", climbing_info: "πληρ. αναρρίχησης", facilities: "εγκαταστάσεις", other: "άλλο" },
  da: { conditions: "forhold", safety: "sikkerhed", access: "adgang", climbing_info: "klatreinfo", facilities: "faciliteter", other: "andet" },
  sv: { conditions: "förhållanden", safety: "säkerhet", access: "tillgång", climbing_info: "klätterinfo", facilities: "anläggningar", other: "övrigt" },
  nb: { conditions: "forhold", safety: "sikkerhet", access: "tilgang", climbing_info: "klatreinfo", facilities: "fasiliteter", other: "annet" },
  fi: { conditions: "olosuhteet", safety: "turvallisuus", access: "pääsy", climbing_info: "kiipeilyinfo", facilities: "palvelut", other: "muu" },
  ca: { conditions: "condicions", safety: "seguretat", access: "accés", climbing_info: "info escalada", facilities: "instal·lacions", other: "altre" },
};

function getBaseLocale(locale: string): string {
  // "de-DE" -> "de", "fr-CH" -> "fr", "en-GB" -> "en"
  return locale.split("-")[0].toLowerCase();
}

function translateTitle(cragName: string, locale: string, type?: string): string {
  const base = getBaseLocale(locale);
  if (type === "report_helpful") {
    return HELPFUL_TITLE_TRANSLATIONS[base] || HELPFUL_TITLE_TRANSLATIONS["en"];
  }
  const prefix = TITLE_TRANSLATIONS[base] || TITLE_TRANSLATIONS["en"];
  return `${prefix} ${cragName}`;
}

function translateBody(text: string | null, category: string, locale: string): string {
  if (text) return text.length > 100 ? text.substring(0, 100) + "…" : text;
  const base = getBaseLocale(locale);
  const categories = CATEGORY_TRANSLATIONS[base] || CATEGORY_TRANSLATIONS["en"];
  const catName = categories[category] || category;
  // "New conditions report" in the user's language
  const reportWord: Record<string, string> = {
    en: "report", de: "Bericht", fr: "rapport", es: "reporte", it: "report",
    pl: "raport", pt: "relatório", nl: "rapport", cs: "zpráva", sk: "správa",
    sl: "poročilo", hr: "izvješće", bg: "доклад", ro: "raport", uk: "звіт",
    el: "αναφορά", da: "rapport", sv: "rapport", nb: "rapport", fi: "raportti", ca: "informe",
  };
  const newWord: Record<string, string> = {
    en: "New", de: "Neuer", fr: "Nouveau", es: "Nuevo", it: "Nuovo",
    pl: "Nowy", pt: "Novo", nl: "Nieuw", cs: "Nový", sk: "Nový",
    sl: "Novo", hr: "Novo", bg: "Нов", ro: "Nou", uk: "Новий",
    el: "Νέα", da: "Ny", sv: "Ny", nb: "Ny", fi: "Uusi", ca: "Nou",
  };
  const n = newWord[base] || "New";
  const r = reportWord[base] || "report";
  return `${n} ${catName} ${r}`;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();
    console.log("[push] Received webhook:", JSON.stringify({ type: payload.type, table: payload.table, recordId: payload.record?.id }));

    if (payload.type !== "INSERT") {
      return new Response(
        JSON.stringify({ message: "Not an INSERT event" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Get user's locale and active push tokens
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("locale")
      .eq("id", payload.record.user_profile_id)
      .single();

    const locale = profile?.locale || "en";

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("token, platform")
      .eq("user_profile_id", payload.record.user_profile_id)
      .eq("is_active", true);

    console.log("[push] Found subscriptions:", JSON.stringify(subscriptions), "locale:", locale);

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[push] No push subscriptions found for user:", payload.record.user_profile_id);
      return new Response(
        JSON.stringify({ message: "No push subscriptions found" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const expoPushTokens = subscriptions
      .filter((s) => s.platform === "ios" || s.platform === "android")
      .map((s) => s.token)
      .filter(Boolean);

    if (expoPushTokens.length === 0) {
      return new Response(
        JSON.stringify({ message: "No Expo push tokens" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Translate title and body based on user's locale
    const cragName = payload.record.data?.cragName || "";
    const category = payload.record.data?.category || "other";
    const title = translateTitle(cragName, locale, payload.record.type);
    const body = translateBody(payload.record.body, category, locale);

    const messages = expoPushTokens.map((token) => {
      const platform = subscriptions.find((s) => s.token === token)?.platform;
      return {
        to: token,
        sound: "default",
        title,
        body,
        data: payload.record.data,
        priority: "high",
        ...(platform === "android" && { channelId: "default" }),
      };
    });

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("EXPO_ACCESS_TOKEN")}`,
      },
      body: JSON.stringify(messages),
    });

    const result = await res.json();
    console.log("[push] Expo API response:", JSON.stringify(result));

    // Handle invalid tokens - mark as inactive
    if (Array.isArray(result.data)) {
      for (let i = 0; i < result.data.length; i++) {
        if (
          result.data[i].status === "error" &&
          result.data[i].details?.error === "DeviceNotRegistered"
        ) {
          await supabase
            .from("push_subscriptions")
            .update({ is_active: false })
            .eq("token", expoPushTokens[i]);
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[push] Error:", (error as Error).message);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
