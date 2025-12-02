import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import "./loginpage.css";

function LoginPage() {
  const [form, setForm] = useState({
    email: "Jorie@example.com",
    password: "jorie@123",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (form.email === "Jorie@example.com" && form.password === "jorie@123") {
      navigate("/dashboard");
    } else {
      setError("Invalid email or password.");
    }
  };

  return (
    <Box className="login-bg">
      <Paper className="login-card" elevation={10}>
        {/* Left Side - Full Image */}
        <Box className="login-left">
          {/* Ensure you have an image at public/image.png */}
          <img src="/image.png" alt="Login Illustration" className="illus-img" />
          
          {/* Overlay Text on top of the image */}
          <Box className="overlay-content">
          </Box>
        </Box>

        {/* Right Side - Form */}
        <Box className="login-right">
          <Box className="form-header">
            <Typography variant="h5" className="welcome-text">
              Welcome Back 👋
            </Typography>
            <Typography variant="body2" className="sub-text">
              Please enter your details to sign in.
            </Typography>
          </Box>

          <form className="login-form" onSubmit={handleLogin}>
            <TextField
              label="Email Address"
              name="email"
              value={form.email}
              onChange={handleChange}
              fullWidth
              margin="normal"
              variant="outlined"
              className="input-field"
              type="email"
            />
            <TextField
              label="Password"
              name="password"
              value={form.password}
              onChange={handleChange}
              fullWidth
              margin="normal"
              variant="outlined"
              className="input-field"
              type={showPassword ? "text" : "password"}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((prev) => !prev)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {error && (
              <Typography className="error-text" align="center">
                {error}
              </Typography>
            )}

            <Button
              variant="contained"
              fullWidth
              className="login-btn"
              type="submit"
              size="large"
            >
              Log In
            </Button>

            <Typography variant="caption" className="footer-text">
              Don't have an account? <span className="link">Contact Admin</span>
            </Typography>
          </form>
        </Box>
      </Paper>
    </Box>
  );
}

export default LoginPage;