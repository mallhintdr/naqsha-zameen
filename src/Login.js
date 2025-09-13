import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Card, Container, Row, Col, Modal } from 'react-bootstrap';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import axios from 'axios';

const Login = () => {
  const [formData, setFormData] = useState({ userId: '', password: '', rememberMe: false });
  const [message, setMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, setModalError } = useAuth();
  const navigate = useNavigate();

  // Forgot Password modal states
  const [showForgot, setShowForgot] = useState(false);
  const [forgotMsg, setForgotMsg] = useState(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  // For checking user existence before enabling forgot password
  const [forgotUserWarning, setForgotUserWarning] = useState(null);
  const [checkingUser, setCheckingUser] = useState(false);

  useEffect(() => {
    const savedUserId = localStorage.getItem('userId');
    const savedPassword = localStorage.getItem('password');
    if (savedUserId && savedPassword) {
      setFormData({ userId: savedUserId, password: savedPassword, rememberMe: true });
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
    if (name === 'userId') setForgotUserWarning(null); // Clear warning if user changes id
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    try {
      await login({ userId: formData.userId, password: formData.password });

      if (formData.rememberMe) {
        localStorage.setItem('userId', formData.userId);
        localStorage.setItem('password', formData.password);
      } else {
        localStorage.removeItem('userId');
        localStorage.removeItem('password');
      }

      setMessage({ type: 'success', text: 'Login successful!' });
      navigate('/');
    } catch (error) {
      if (error.type === 'invalidCredentials') {
        setModalError({
          show: true,
          title: 'Invalid ID/Password',
          message: 'User ID or Password is incorrect. Please login again with Correct ID/Password',
        });
      } else if (error.type === 'subscriptionExpired') {
        setModalError({
          show: true,
          title: 'Subscription Expired',
          message: 'Your subscription has expired. Please contact 0304-8840264 to renew Subscription.',
        });
      } else {
        setMessage({ type: 'danger', text: 'Login failed. Please try again.' });
      }
    }
  };

  // --- New: Check if entered userId exists before enabling Forgot Password ---
  // --- New: Check if entered userId exists before enabling Forgot Password ---
const checkUserIdExists = async () => {
  setCheckingUser(true);
  setForgotUserWarning(null);
  try {
    const apiBaseUrl = process.env.REACT_APP_API_URL || '';
    const res = await axios.get(`${apiBaseUrl}/api/public/check-userid/${encodeURIComponent(formData.userId)}`);
    if (res.data.exists) {
      setShowForgot(true);
    } else {
      setForgotUserWarning("Please enter a valid registered User ID before requesting password reset.");
    }
  } catch (err) {
    setForgotUserWarning("Unable to verify User ID at this time.");
  }
  setCheckingUser(false);
};


  // Forgot Password handlers
  const handleForgot = async (e) => {
    e.preventDefault();
    setForgotMsg(null);
    setForgotLoading(true);
    try {
      const apiBaseUrl = process.env.REACT_APP_API_URL || '';
      await axios.post(`${apiBaseUrl}/forgot-password`, { userId: formData.userId });
      setForgotMsg({
        type: 'success',
        text: 'If this user ID exists, a reset link has been sent to the registered email.',
      });
    } catch (err) {
      setForgotMsg({
        type: 'danger',
        text: 'Failed to send reset email. Please try again later.',
      });
    }
    setForgotLoading(false);
  };

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <Row className="w-100">
        <Col md={6} className="mx-auto">
          <Card className="p-4 shadow">
            <h3 className="text-center mb-4">Login</h3>
            {message && <Alert variant={message.type}>{message.text}</Alert>}
            {forgotUserWarning && <Alert variant="warning">{forgotUserWarning}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>User ID</Form.Label>
                <Form.Control
                  type="text"
                  name="userId"
                  value={formData.userId}
                  onChange={handleChange}
                  placeholder="Enter user ID"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3 position-relative">
                <Form.Label>Password</Form.Label>
                <div className="d-flex align-items-center position-relative">
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    required
                  />
                  <span
                    onClick={() => setShowPassword((prev) => !prev)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      cursor: 'pointer',
                      color: '#6c757d',
                    }}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  name="rememberMe"
                  label="Remember Me"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                />
              </Form.Group>

              <Button variant="primary" type="submit" className="w-100" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </Button>
              <div className="text-center mt-3">
                <Button
                  variant="link"
                  type="button"
                  style={{ padding: 0 }}
                  onClick={checkUserIdExists}
                  tabIndex={-1}
                  disabled={!formData.userId || checkingUser}
                >
                  {checkingUser ? 'Checking...' : 'Forgot Password?'}
                </Button>
              </div>
            </Form>
          </Card>
        </Col>
      </Row>
      {/* Forgot Password Modal */}
      <Modal show={showForgot} onHide={() => setShowForgot(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Forgot Password</Modal.Title>
        </Modal.Header>
         <Modal.Body>
          {forgotMsg && <Alert variant={forgotMsg.type}>{forgotMsg.text}</Alert>}
          <Form onSubmit={handleForgot}>
            <p>A password reset link will be sent to the registered email for this user ID.</p>
            <Button
              variant="primary"
              type="submit"
              className="w-100"
              disabled={forgotLoading}
            >
              {forgotLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default Login;
