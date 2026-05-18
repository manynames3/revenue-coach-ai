import type { AppProps } from "next/app";
import type { NextPage } from "next";
import Head from "next/head";
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
  const page = (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Component {...pageProps} />
    </>
  );

  if (Component.noAppShell || router.pathname === "/sales" || router.pathname === "/demo") {
    return page;
  }

  return <Layout>{page}</Layout>;
}
