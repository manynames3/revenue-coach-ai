import type { AppProps } from "next/app";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
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

  if (Component.noAppShell || router.pathname === "/sales") {
    return page;
  }

  return <Layout>{page}</Layout>;
}
