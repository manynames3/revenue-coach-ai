import type { AppProps } from "next/app";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import { AuthProvider } from "../components/AuthContext";
import WorkspaceGate from "../components/WorkspaceGate";
import "../styles/globals.css";

type PageWithShellOption = NextPage & {
  noAppShell?: boolean;
};

type AppPropsWithShellOption = AppProps & {
  Component: PageWithShellOption;
};

export default function App({ Component, pageProps }: AppPropsWithShellOption) {
  const router = useRouter();
  const page = <Component {...pageProps} />;

  const publicPage = Component.noAppShell || ["/sales", "/demo", "/login", "/signup", "/accept-invite", "/pilot", "/privacy", "/reset-password"].includes(router.pathname);
  return <AuthProvider>{publicPage ? page : <WorkspaceGate>{page}</WorkspaceGate>}</AuthProvider>;
}
