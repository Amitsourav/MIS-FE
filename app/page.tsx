import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ROLE_COOKIE, TOKEN_COOKIE } from "@/lib/constants";

export default function Home() {
  const store = cookies();
  const token = store.get(TOKEN_COOKIE)?.value;
  const role = store.get(ROLE_COOKIE)?.value;
  if (!token) redirect("/login");
  redirect(role === "admin" ? "/admin" : "/dashboard");
}
