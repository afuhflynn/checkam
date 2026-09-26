import { headers } from "next/headers";
import { GateForm } from "../../../components/gate-form";

export async function generateMetadata() {
  const cookie = (await headers()).get("cookie") ?? "";
  const fr = !/(?:^|;\s*)checkam_lang=en/.test(cookie);
  return {
    title: fr ? "Connexion — CheckAm" : "Sign in — CheckAm",
  };
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = typeof params?.error === "string" ? params.error : null;
  const expired = params?.expired === "1";
  const notice = error ? "google-kept" : expired ? "expired" : null;
  const rawNext = typeof params?.next === "string" ? params.next : "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-7xl items-center justify-center px-4 py-12 sm:px-6">
      <GateForm notice={notice} next={next} />
    </div>
  );
}
