import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
        <Script
          strategy="beforeInteractive"
          src={`https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NCP_CLIENT_ID}`}
        />
      </body>
    </Html>
  );
}
