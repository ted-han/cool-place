import "../styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>HipHip</title>
        <meta name="description" content="냠냠냠냠냠" />
        <meta charSet="utf-8" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <meta property="og:title" content="맛집쓰" key="힙힙" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
