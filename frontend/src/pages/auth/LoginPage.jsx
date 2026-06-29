import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { endpoints } from "../../lib/endpoints";
import { getOfflineUser, getOfflinePin, verifyOfflinePin } from "../../lib/auth";
import { saveOfflineShifts, saveOfflineIncidents } from "../../lib/offline.js";

export default function LoginPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [form, setForm] = useState({ email: "", password: "", pin: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);

  const offlineUser = useMemo(() => getOfflineUser(), []);
  const offlinePin = useMemo(() => getOfflinePin(), []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === "pin") {
      const digits = value.replace(/\D/g, "");
      setForm((prev) => ({ ...prev, [name]: digits.slice(0, 4) }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const cacheUserData = async () => {
    try {
      const [shiftsRes, incidentsRes] = await Promise.all([
        api.get(endpoints.patrols.shifts, { params: { page_size: 100 } }),
        api.get(endpoints.patrols.incidents, { params: { page_size: 100 } }),
      ]);

      const shiftsData = shiftsRes.data.results || shiftsRes.data || [];
      const incidentsData = incidentsRes.data.results || incidentsRes.data || [];

      saveOfflineShifts(shiftsData);
      saveOfflineIncidents(incidentsData);
    } catch (cacheError) {
      console.warn("Unable to cache offline user data:", cacheError);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    if (offlineMode) {
      if (!offlineUser) {
        setError("No offline credentials saved. Connect online first to save a user.");
        setLoading(false);
        return;
      }

      if (!/^\d{4}$/.test(form.pin)) {
        setError("Enter a 4-digit numeric PIN.");
        setLoading(false);
        return;
      }

      if (!verifyOfflinePin(form.pin)) {
        setError("Incorrect offline PIN.");
        setLoading(false);
        return;
      }

      auth.loginOffline(offlineUser);
      navigate(offlineUser.role === "admin" ? "/admin" : "/guard");
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.post(endpoints.auth.login, {
        email: form.email,
        password: form.password,
      });
      auth.login({ access: data.access, refresh: data.refresh, user: data.user });
      await cacheUserData();
      const destination = data.user?.role === "admin" ? "/admin" : "/guard";
      navigate(destination);
    } catch (requestError) {
      setError("Login failed. Check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <p className="status-pill">SENTINEL AUTH</p>
        <h1>Command Access</h1>
        <p className="auth-copy">Sign in to continue to guard operations.</p>

        {!offlineMode ? (
          <>
            <label>
              Email
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="guard@sentinel.com"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="********"
                required
              />
            </label>
          </>
        ) : (
          <>
            <label>
              Offline PIN
              <input
                type="text"
                name="pin"
                value={form.pin}
                onChange={handleChange}
                placeholder="1234"
                inputMode="numeric"
                required
              />
            </label>
            {!offlineUser ? (
              <p className="auth-copy">Offline access unavailable until a user has first logged in online.</p>
            ) : (
              <p className="auth-copy">Use the 4-digit PIN for offline access.</p>
            )}
          </>
        )}

        {error ? <p className="form-error">{error}</p> : null}

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Processing..." : offlineMode ? "Unlock Offline" : "Sign In"}
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setOfflineMode((prev) => !prev)}
          style={{ marginTop: "1rem" }}
        >
          {offlineMode ? "Use Online Login" : "Use Offline PIN"}
        </button>
      </form>
    </div>
  );
}
