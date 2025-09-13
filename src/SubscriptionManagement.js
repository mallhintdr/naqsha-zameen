import React, { useState, useRef } from 'react';
import { Form, Button, Card, Container, Row, Col, Alert, ListGroup, InputGroup, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getCurrentDate, subscriptionOptions } from './userUtils';

const SubscriptionManagement = () => {
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    startDate: getCurrentDate(),
    subscriptionType: 'Trial'
  });
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);

  const navigate = useNavigate();
  const inputRef = useRef();

  // Search for userId as the user types
  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setSearch(value);
    setUser(null);
    setMessage(null);
    setShowList(!!value);
    setHighlightIdx(-1);
    if (!value) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/search?query=${encodeURIComponent(value)}`);
      setSuggestions(Array.isArray(data) ? data : []);
    } catch (err) {
      setSuggestions([]);
    }
    setSearching(false);
  };

  // Fetch user and set up form when suggestion is chosen
  const fetchAndSetUser = async (selectedUserId) => {
    setSearch(selectedUserId);
    setShowList(false);
    setSuggestions([]);
    setSearching(true);
    setUser(null);
    setMessage(null);
    try {
      const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/users/${selectedUserId}`);
      setUser(data);
      setForm({
        startDate: getCurrentDate(),
        subscriptionType: data.subscriptionType || 'Trial'
      });
    } catch (error) {
      setMessage({ type: 'danger', text: error.response?.data?.message || 'User not found.' });
      setUser(null);
    }
    setSearching(false);
  };

  // Handle click on suggestion
  const handleSuggestionSelect = (s) => {
    fetchAndSetUser(s.userId);
  };

  // Keyboard navigation in suggestion list
  const handleKeyDown = (e) => {
    if (!showList || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      setHighlightIdx(idx => Math.min(idx + 1, suggestions.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setHighlightIdx(idx => Math.max(idx - 1, 0));
      e.preventDefault();
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      fetchAndSetUser(suggestions[highlightIdx].userId);
      e.preventDefault();
    }
  };

  // Renew subscription
  const handleRenew = async () => {
    setMessage(null);
    setLoading(true);
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/users/${search}`, {
        subscriptionType: form.subscriptionType,
        startDate: form.startDate,
      });
      setMessage({ type: 'success', text: 'Subscription renewed successfully!' });
      // Optionally, reload latest user info here if you want to reflect changes
    } catch (error) {
      setMessage({ type: 'danger', text: error.response?.data?.message || 'Renewal failed.' });
    }
    setLoading(false);
  };

  const handleCancel = () => {
    setSearch('');
    setSuggestions([]);
    setShowList(false);
    setUser(null);
    setMessage(null);
    setForm({
      startDate: getCurrentDate(),
      subscriptionType: 'Trial'
    });
    navigate('/');
  };

  return (
    <Container style={{ marginTop: 40 }}>
      <Row className="justify-content-center">
        <Col md={7} lg={6}>
          <Card className="p-4 shadow">
            <h4 className="text-center mb-3">Subscription Management</h4>
            {message && <Alert variant={message.type}>{message.text}</Alert>}

            {/* UserId autocomplete/search */}
            <Form.Group style={{ position: 'relative' }}>
              <Form.Label>User ID</Form.Label>
              <InputGroup>
                <Form.Control
                  ref={inputRef}
                  value={search}
                  onChange={handleSearchChange}
                  onFocus={() => search && setShowList(true)}
                  onBlur={() => setTimeout(() => setShowList(false), 150)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter or search User ID"
                  autoComplete="off"
                  required
                  disabled={loading}
                />
                {searching && <InputGroup.Text><Spinner size="sm" /></InputGroup.Text>}
              </InputGroup>
              {showList && suggestions.length > 0 && (
                <ListGroup style={{
                  position: 'absolute', zIndex: 1001, width: '100%', maxHeight: 180,
                  overflowY: 'auto', border: '1px solid #ddd', background: '#fff'
                }}>
                  {suggestions.map((s, idx) => (
                    <ListGroup.Item
                      key={s.userId}
                      action
                      active={idx === highlightIdx}
                      onMouseDown={() => handleSuggestionSelect(s)}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHighlightIdx(idx)}
                    >
                      <b>{s.userId}</b> <span className="text-muted">({s.userName})</span>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Form.Group>

            {/* User Info & Subscription */}
            {user && (
              <div className="mt-4">
                <Row>
                  <Col>
                    <b>User Name:</b> {user.userName}
                  </Col>
                  <Col>
                    <b>User ID:</b> {user.userId}
                  </Col>
                </Row>
                <Row className="mt-2">
                  <Col>
                    <b>Current Subscription Type:</b> {user.subscriptionType}
                  </Col>
                  <Col>
                    <b>Current Start Date:</b> {user.startDate && new Date(user.startDate).toLocaleDateString()}
                  </Col>
                </Row>
                <Form className="mt-3">
                  <Form.Group>
                    <Form.Label>New Subscription Type</Form.Label>
                    <Form.Select
                      value={form.subscriptionType}
                      onChange={e => setForm(f => ({ ...f, subscriptionType: e.target.value }))}
                    >
                      {subscriptionOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.value}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mt-2">
                    <Form.Label>New Start Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={form.startDate}
                      onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    />
                  </Form.Group>
                  <div className="d-flex justify-content-end mt-3">
                    <Button
                      type="button"
                      variant="success"
                      className="me-2"
                      onClick={handleRenew}
                      disabled={loading}
                    >
                      {loading ? 'Renewing...' : 'Renew'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={handleCancel}>Cancel</Button>
                  </div>
                </Form>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SubscriptionManagement;
