import { useEffect, useState } from "react";
import { api, getToken, setToken, type User } from "./api";
import AuthScreen from "./components/AuthScreen";
import Workspace from "./components/Workspace";
import Logo from "./components/Logo";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api
      .me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setBooting(false));
  }, []);

  const signOut = async () => {
    await api.logout().catch(() => undefined);
    setToken(null);
    setUser(null);
  };

  if (booting) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Logo />
      </div>
    );
  }

  return user ? (
    <Workspace user={user} onSignOut={signOut} />
  ) : (
    <AuthScreen
      onAuthed={(token, u) => {
        setToken(token);
        setUser(u);
      }}
    />
  );
}
