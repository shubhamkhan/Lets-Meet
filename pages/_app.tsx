import '../styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <script src="https://cdn.tailwindcss.com"></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            tailwind.config = {
              theme: {
                extend: {
                  colors: {
                    'google-blue': '#1a73e8',
                    'google-blue-hover': '#1765cc',
                    'google-red': '#ea4335',
                    'google-red-hover': '#d93025',
                    'google-green': '#34a853',
                    'google-yellow': '#fbbc05',
                    'google-gray': '#5f6368',
                    'google-gray-light': '#dadce0',
                    'google-bg': '#f8f9fa',
                    'google-bg-dark': '#202124',
                  }
                }
              }
            }
          `
        }} />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
