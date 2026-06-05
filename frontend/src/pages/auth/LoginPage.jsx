import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { endpoints } from "../../lib/endpoints";

export default function LoginPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post(endpoints.auth.login, form);
      auth.login({ access: data.access, refresh: data.refresh, user: data.user });
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

        {error ? <p className="form-error">{error}</p> : null}

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Authenticating..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
