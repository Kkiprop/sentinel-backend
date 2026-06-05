import { Link } from "react-router-dom";
import PublicHeader from "../components/layout/PublicHeader";

export default function LandingPage() {
  return (
    <div className="page landing-page">
      <PublicHeader />
      <section className="hero-section">
        <p className="status-pill">SYSTEM ONLINE - ALL SECTORS SECURE</p>
        <h1>
          Absolute Oversight.
          <br />
          <span>Zero Blind Spots.</span>
        </h1>
        <p className="hero-copy">
          The command platform that unifies guard operations, checkpoint tours, and
          incident response in one live tactical interface.
        </p>
        <div className="hero-actions">
          <Link to="/guard" className="btn btn-primary">
            Initialize Command
          </Link>
          <Link to="/login" className="btn btn-secondary">
            Request Demo
          </Link>
        </div>
      </section>
    </div>
  );
}
