import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Form, Button, Alert, Card, Container, Row, Col } from "react-bootstrap";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!password || password.length < 6) {
      setMessage({ type: "danger", text: "Password must be at least 6 characters." });
      return;
    }
    if (password !== confirm) {
      setMessage({ type: "danger", text: "Passwords do not match." });
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/reset-password`, {
        token,
        password,
      });
      setMessage({ type: "success", text: "Password reset successful! Redirecting to login..." });
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setMessage({
        type: "danger",
        text: err.response?.data?.message || "Failed to reset password.",
      });
    }
    setLoading(false);
  };

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: "80vh" }}>
      <Row className="w-100">
        <Col md={6} className="mx-auto">
          <Card className="p-4 shadow">
            <h4 className="text-center mb-4">Reset Password</h4>
            {message && <Alert variant={message.type}>{message.text}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>New Password</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Confirm New Password</Form.Label>
                <Form.Control
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </Form.Group>
              <Button
                type="submit"
                variant="primary"
                className="w-100"
                disabled={loading}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ResetPassword;
