import { useEffect } from "react";
import { useRouter } from "next/router";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import Layout from "./Layout";

export default function WorkspaceGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=" + encodeURIComponent(router.asPath));
  }, [loading, user, router]);
  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[#5a5886]" role="status">Opening your workspace...</div>;
  }
  return <Layout>{children}</Layout>;
}
