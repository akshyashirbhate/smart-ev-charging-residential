import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Navbar, Nav, Container, Button } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

export default function NavigationBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
    setRole(localStorage.getItem("role"));
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    localStorage.removeItem("sessionId");
    setIsLoggedIn(false);
    navigate("/");
  };

  return (
    <Navbar expand="md" bg="dark" variant="dark" className="shadow-lg py-3" expanded={isOpen} onToggle={setIsOpen}>
      <Container>
        <Navbar.Brand as={Link} to="/" className="fw-bold text-success fs-3">
          EV Charging
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center">
            <Nav.Link as={Link} to="/" className="text-white fs-5 px-3">Home</Nav.Link>
            {isLoggedIn ? (
              <>
                <Nav.Link as={Link} to={role === "admin" ? "/admin-dashboard" : "/user-dashboard"} className="text-white fs-5 px-3">Dashboard</Nav.Link>
                <Button onClick={handleLogout} variant="danger" className="ms-3 px-4 py-2 fs-5">Logout</Button>
              </>
            ) : (
              <>
                <Link to="/signup" className="btn btn-success ms-3 px-4 py-2 fs-5">Sign Up</Link>
                <Link to="/login" className="btn btn-primary ms-3 px-4 py-2 fs-5">Login</Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
