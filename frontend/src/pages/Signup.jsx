import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [wingName, setWingName] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const res = await axios.post("http://localhost:5000/api/auth/signup", { name, email, password, wingName, flatNumber });
      setSuccess("Signup successful! Please log in.");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center mt-5">
      <div className="p-4 bg-dark text-light rounded shadow-lg" style={{ width: "100%", maxWidth: "400px" }}>
        <h2 className="text-center text-success">Sign Up</h2>
        {error && <p className="text-danger text-center">{error}</p>}
        {success && <p className="text-success text-center">{success}</p>}
        <form onSubmit={handleSignup}>
          <div className="mb-3">
            <label className="form-label">Name</label>
            <input
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Wing Name</label>
            <input
              type="text"
              className="form-control"
              value={wingName}
              onChange={(e) => setWingName(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Flat Number</label>
            <input
              type="text"
              className="form-control"
              value={flatNumber}
              onChange={(e) => setFlatNumber(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-success w-100">Sign Up</button>
        </form>
        <p className="text-center mt-3">
          Already have an account?
          <button className="btn btn-link text-warning" onClick={() => navigate("/login")}>
            Login
          </button>
        </p>
      </div>
    </div>
  );
}
