import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export function useFragmentToken(active = true) {
  const [token, setToken] = useState("");
  const router = useRouter();
  useEffect(() => {
    if (!active || !router.isReady) return;
    function consume() {
      const value = new URLSearchParams(window.location.hash.slice(1)).get("token");
      // Effect replay sees no hash; it must not erase the token already captured.
      if (value === null) return;
      setToken(value);
      const clean = window.location.pathname + window.location.search;
      const state = window.history.state;
      window.history.replaceState(state ? { ...state, as: clean, url: clean } : null, "", clean);
    }
    consume();
    window.addEventListener("hashchange", consume);
    return () => window.removeEventListener("hashchange", consume);
  }, [active, router.isReady]);
  return token;
}
